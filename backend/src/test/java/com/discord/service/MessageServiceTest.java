package com.discord.service;

import com.discord.domain.Channel;
import com.discord.domain.Message;
import com.discord.domain.Server;
import com.discord.domain.User;
import com.discord.dto.request.EditMessageRequest;
import com.discord.dto.response.MessageResponse;
import com.discord.exception.ForbiddenException;
import com.discord.exception.ResourceNotFoundException;
import com.discord.repository.ChannelRepository;
import com.discord.repository.MessageRepository;
import com.discord.repository.ServerMemberRepository;
import com.discord.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MessageServiceTest {

    @Mock MessageRepository messageRepository;
    @Mock ChannelRepository channelRepository;
    @Mock ServerMemberRepository memberRepository;
    @Mock UserRepository userRepository;
    @Mock KafkaTemplate<String, String> kafkaTemplate;

    @InjectMocks
    MessageService messageService;

    // Use real ObjectMapper so serialization actually works
    ObjectMapper objectMapper = new ObjectMapper()
        .findAndRegisterModules();

    @org.junit.jupiter.api.BeforeEach
    void injectObjectMapper() {
        ReflectionTestUtils.setField(messageService, "objectMapper", objectMapper);
    }

    @Test
    void sendMessage_savesMessageAndPublishesToKafka() {
        UUID channelId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        Channel channel = buildChannel(channelId);
        User author = buildUser(authorId);

        when(channelRepository.findByIdWithServer(channelId)).thenReturn(Optional.of(channel));
        when(memberRepository.existsByServerIdAndUserId(any(), eq(authorId))).thenReturn(true);
        when(userRepository.findById(authorId)).thenReturn(Optional.of(author));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> {
            Message m = inv.getArgument(0);
            ReflectionTestUtils.setField(m, "id", UUID.randomUUID());
            return m;
        });

        MessageResponse response = messageService.sendMessage(channelId, authorId, "Hello world");

        assertThat(response.content()).isEqualTo("Hello world");
        assertThat(response.channelId()).isEqualTo(channelId);
        verify(messageRepository).save(any(Message.class));
        verify(kafkaTemplate).send(eq("chat.messages"), anyString(), anyString());
    }

    @Test
    void sendMessage_whenNotMember_throwsForbiddenException() {
        UUID channelId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        Channel channel = buildChannel(channelId);

        when(channelRepository.findByIdWithServer(channelId)).thenReturn(Optional.of(channel));
        when(memberRepository.existsByServerIdAndUserId(any(), eq(authorId))).thenReturn(false);

        assertThatThrownBy(() -> messageService.sendMessage(channelId, authorId, "Hello"))
            .isInstanceOf(ForbiddenException.class);

        verify(messageRepository, never()).save(any());
    }

    @Test
    void sendMessage_whenChannelNotFound_throwsResourceNotFoundException() {
        UUID channelId = UUID.randomUUID();
        when(channelRepository.findByIdWithServer(channelId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> messageService.sendMessage(channelId, UUID.randomUUID(), "Hello"))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void editMessage_byNonAuthor_throwsForbiddenException() {
        UUID channelId = UUID.randomUUID();
        UUID messageId = UUID.randomUUID();
        UUID requesterId = UUID.randomUUID();

        when(messageRepository.findByIdAndAuthorId(messageId, requesterId)).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
            messageService.editMessage(channelId, messageId, requesterId, new EditMessageRequest("new content")))
            .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void editMessage_withValidAuthor_updatesAndPublishes() {
        UUID channelId = UUID.randomUUID();
        UUID messageId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();

        Message message = buildMessage(messageId, channelId, authorId);
        when(messageRepository.findByIdAndAuthorId(messageId, authorId)).thenReturn(Optional.of(message));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        MessageResponse response = messageService.editMessage(
            channelId, messageId, authorId, new EditMessageRequest("edited content"));

        assertThat(response.content()).isEqualTo("edited content");
        assertThat(response.edited()).isTrue();
        verify(kafkaTemplate).send(eq("chat.messages"), anyString(), anyString());
    }

    @Test
    void deleteMessage_withValidAuthor_deletesAndPublishes() {
        UUID channelId = UUID.randomUUID();
        UUID messageId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();

        Message message = buildMessage(messageId, channelId, authorId);
        when(messageRepository.findByIdAndAuthorId(messageId, authorId)).thenReturn(Optional.of(message));

        messageService.deleteMessage(channelId, messageId, authorId);

        verify(messageRepository).delete(message);
        verify(kafkaTemplate).send(eq("chat.messages"), anyString(), anyString());
    }

    private Channel buildChannel(UUID channelId) {
        Server server = new Server();
        ReflectionTestUtils.setField(server, "id", UUID.randomUUID());

        Channel channel = new Channel();
        ReflectionTestUtils.setField(channel, "id", channelId);
        ReflectionTestUtils.setField(channel, "server", server);
        ReflectionTestUtils.setField(channel, "name", "general");
        return channel;
    }

    private User buildUser(UUID userId) {
        User user = new User();
        ReflectionTestUtils.setField(user, "id", userId);
        ReflectionTestUtils.setField(user, "username", "testuser");
        ReflectionTestUtils.setField(user, "email", "test@example.com");
        ReflectionTestUtils.setField(user, "passwordHash", "hashed");
        return user;
    }

    private Message buildMessage(UUID messageId, UUID channelId, UUID authorId) {
        Channel channel = buildChannel(channelId);
        User author = buildUser(authorId);

        Message message = new Message();
        ReflectionTestUtils.setField(message, "id", messageId);
        ReflectionTestUtils.setField(message, "channel", channel);
        ReflectionTestUtils.setField(message, "author", author);
        ReflectionTestUtils.setField(message, "content", "original content");
        ReflectionTestUtils.setField(message, "edited", false);
        return message;
    }
}

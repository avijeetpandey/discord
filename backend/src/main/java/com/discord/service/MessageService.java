package com.discord.service;

import com.discord.domain.Channel;
import com.discord.domain.Message;
import com.discord.domain.User;
import com.discord.dto.request.EditMessageRequest;
import com.discord.dto.request.SendMessageRequest;
import com.discord.dto.response.MessageResponse;
import com.discord.exception.ForbiddenException;
import com.discord.exception.ResourceNotFoundException;
import com.discord.kafka.ChatMessageEvent;
import com.discord.repository.ChannelRepository;
import com.discord.repository.MessageRepository;
import com.discord.repository.ServerMemberRepository;
import com.discord.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class MessageService {

    private static final Logger log = LoggerFactory.getLogger(MessageService.class);
    private static final String TOPIC = "chat.messages";
    private static final int MAX_PAGE_SIZE = 50;

    private final MessageRepository messageRepository;
    private final ChannelRepository channelRepository;
    private final ServerMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public MessageService(MessageRepository messageRepository,
                          ChannelRepository channelRepository,
                          ServerMemberRepository memberRepository,
                          UserRepository userRepository,
                          KafkaTemplate<String, String> kafkaTemplate,
                          ObjectMapper objectMapper) {
        this.messageRepository = messageRepository;
        this.channelRepository = channelRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> getMessages(UUID channelId, UUID userId, UUID beforeId, int limit) {
        Channel channel = requireChannelMembership(channelId, userId);

        int pageSize = Math.min(limit, MAX_PAGE_SIZE);
        PageRequest page = PageRequest.of(0, pageSize);

        List<Message> messages = beforeId != null
            ? messageRepository.findByChannelIdBeforeCursor(channelId, beforeId, page)
            : messageRepository.findLatestByChannelId(channelId, page);

        // DB returns newest-first; reverse to chronological order for client
        List<MessageResponse> result = new ArrayList<>(messages.size());
        for (int i = messages.size() - 1; i >= 0; i--) {
            result.add(MessageResponse.from(messages.get(i)));
        }
        return result;
    }

    public MessageResponse sendMessage(UUID channelId, UUID authorId, String content) {
        Channel channel = requireChannelMembership(channelId, authorId);

        User author = userRepository.findById(authorId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Message message = new Message();
        message.setChannel(channel);
        message.setAuthor(author);
        message.setContent(content);
        message = messageRepository.save(message);

        MessageResponse response = MessageResponse.from(message);
        publishEvent("MESSAGE_CREATE", response);
        return response;
    }

    public MessageResponse editMessage(UUID channelId, UUID messageId, UUID authorId, EditMessageRequest request) {
        Message message = messageRepository.findByIdAndAuthorId(messageId, authorId)
            .orElseThrow(() -> new ForbiddenException("Message not found or you are not the author"));

        if (!message.getChannel().getId().equals(channelId)) {
            throw new ForbiddenException("Message does not belong to this channel");
        }

        message.setContent(request.content());
        message.setEdited(true);
        message = messageRepository.save(message);

        MessageResponse response = MessageResponse.from(message);
        publishEvent("MESSAGE_UPDATE", response);
        return response;
    }

    public void deleteMessage(UUID channelId, UUID messageId, UUID authorId) {
        Message message = messageRepository.findByIdAndAuthorId(messageId, authorId)
            .orElseThrow(() -> new ForbiddenException("Message not found or you are not the author"));

        if (!message.getChannel().getId().equals(channelId)) {
            throw new ForbiddenException("Message does not belong to this channel");
        }

        MessageResponse response = MessageResponse.from(message);
        messageRepository.delete(message);
        publishEvent("MESSAGE_DELETE", response);
    }

    private Channel requireChannelMembership(UUID channelId, UUID userId) {
        Channel channel = channelRepository.findByIdWithServer(channelId)
            .orElseThrow(() -> new ResourceNotFoundException("Channel not found"));

        UUID serverId = channel.getServer().getId();
        if (!memberRepository.existsByServerIdAndUserId(serverId, userId)) {
            throw new ForbiddenException("You are not a member of this server");
        }
        return channel;
    }

    private void publishEvent(String type, MessageResponse message) {
        try {
            String payload = objectMapper.writeValueAsString(new ChatMessageEvent(type, message));
            kafkaTemplate.send(TOPIC, message.channelId().toString(), payload);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize chat event [type={}]: {}", type, e.getMessage());
        }
    }
}

package com.discord.service;

import com.discord.domain.Channel;
import com.discord.domain.Server;
import com.discord.domain.ServerMember;
import com.discord.domain.User;
import com.discord.dto.request.CreateServerRequest;
import com.discord.dto.response.ServerDetailResponse;
import com.discord.exception.ConflictException;
import com.discord.exception.ForbiddenException;
import com.discord.repository.ChannelRepository;
import com.discord.repository.ServerMemberRepository;
import com.discord.repository.ServerRepository;
import com.discord.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ServerServiceTest {

    @Mock ServerRepository serverRepository;
    @Mock ServerMemberRepository memberRepository;
    @Mock ChannelRepository channelRepository;
    @Mock UserRepository userRepository;

    @InjectMocks
    ServerService serverService;

    @Test
    void createServer_persistsServerMemberAndGeneralChannel() {
        UUID userId = UUID.randomUUID();
        User owner = buildUser(userId);
        CreateServerRequest req = new CreateServerRequest("My Server");

        when(userRepository.findById(userId)).thenReturn(Optional.of(owner));
        when(serverRepository.save(any(Server.class))).thenAnswer(inv -> {
            Server s = inv.getArgument(0);
            ReflectionTestUtils.setField(s, "id", UUID.randomUUID());
            return s;
        });
        when(memberRepository.save(any(ServerMember.class))).thenAnswer(inv -> inv.getArgument(0));
        when(channelRepository.save(any(Channel.class))).thenAnswer(inv -> {
            Channel c = inv.getArgument(0);
            ReflectionTestUtils.setField(c, "id", UUID.randomUUID());
            return c;
        });

        ServerDetailResponse response = serverService.createServer(userId, req);

        assertThat(response.name()).isEqualTo("My Server");
        assertThat(response.channels()).hasSize(1);
        assertThat(response.channels().get(0).name()).isEqualTo("general");
        assertThat(response.members()).hasSize(1);
        assertThat(response.members().get(0).role()).isEqualTo("OWNER");

        verify(serverRepository).save(any(Server.class));
        verify(memberRepository).save(any(ServerMember.class));
        verify(channelRepository).save(any(Channel.class));
    }

    @Test
    void joinServer_whenAlreadyMember_throwsConflictException() {
        UUID userId = UUID.randomUUID();
        Server server = buildServer();

        when(serverRepository.findByInviteCode("TESTCODE")).thenReturn(Optional.of(server));
        when(memberRepository.existsByServerIdAndUserId(server.getId(), userId)).thenReturn(true);

        assertThatThrownBy(() -> serverService.joinServer("TESTCODE", userId))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("already a member");
    }

    @Test
    void leaveServer_whenOwner_throwsForbiddenException() {
        UUID userId = UUID.randomUUID();
        UUID serverId = UUID.randomUUID();

        ServerMember ownerMember = new ServerMember();
        ownerMember.setRole(ServerMember.Role.OWNER);

        when(memberRepository.findByServerIdAndUserId(serverId, userId)).thenReturn(Optional.of(ownerMember));

        assertThatThrownBy(() -> serverService.leaveServer(serverId, userId))
            .isInstanceOf(ForbiddenException.class)
            .hasMessageContaining("owner");
    }

    @Test
    void deleteServer_byNonOwner_throwsForbiddenException() {
        UUID userId = UUID.randomUUID();
        UUID serverId = UUID.randomUUID();

        ServerMember regularMember = new ServerMember();
        regularMember.setRole(ServerMember.Role.MEMBER);

        when(serverRepository.existsById(serverId)).thenReturn(true);
        when(memberRepository.findByServerIdAndUserId(serverId, userId)).thenReturn(Optional.of(regularMember));

        assertThatThrownBy(() -> serverService.deleteServer(serverId, userId))
            .isInstanceOf(ForbiddenException.class)
            .hasMessageContaining("owner");
    }

    private User buildUser(UUID id) {
        User user = new User();
        ReflectionTestUtils.setField(user, "id", id);
        ReflectionTestUtils.setField(user, "username", "testuser");
        ReflectionTestUtils.setField(user, "email", "test@example.com");
        ReflectionTestUtils.setField(user, "passwordHash", "hashed");
        return user;
    }

    private Server buildServer() {
        Server server = new Server();
        ReflectionTestUtils.setField(server, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(server, "name", "Test Server");
        ReflectionTestUtils.setField(server, "inviteCode", "TESTCODE");
        ReflectionTestUtils.setField(server, "owner", buildUser(UUID.randomUUID()));
        return server;
    }
}

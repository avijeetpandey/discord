package com.discord.service;

import com.discord.domain.Channel;
import com.discord.domain.Server;
import com.discord.domain.ServerMember;
import com.discord.domain.User;
import com.discord.dto.request.CreateServerRequest;
import com.discord.dto.request.UpdateServerRequest;
import com.discord.dto.response.ServerDetailResponse;
import com.discord.dto.response.ServerResponse;
import com.discord.exception.ConflictException;
import com.discord.exception.ForbiddenException;
import com.discord.exception.ResourceNotFoundException;
import com.discord.repository.ChannelRepository;
import com.discord.repository.ServerMemberRepository;
import com.discord.repository.ServerRepository;
import com.discord.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ServerService {

    private final ServerRepository serverRepository;
    private final ServerMemberRepository memberRepository;
    private final ChannelRepository channelRepository;
    private final UserRepository userRepository;

    public ServerService(ServerRepository serverRepository,
                         ServerMemberRepository memberRepository,
                         ChannelRepository channelRepository,
                         UserRepository userRepository) {
        this.serverRepository = serverRepository;
        this.memberRepository = memberRepository;
        this.channelRepository = channelRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<ServerResponse> getMyServers(UUID userId) {
        return serverRepository.findAllByMemberUserId(userId)
            .stream()
            .map(ServerResponse::from)
            .toList();
    }

    public ServerDetailResponse createServer(UUID userId, CreateServerRequest request) {
        User owner = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Server server = new Server();
        server.setName(request.name());
        server.setOwner(owner);
        server.setInviteCode(generateInviteCode());
        server = serverRepository.save(server);

        ServerMember ownerMember = new ServerMember();
        ownerMember.setServer(server);
        ownerMember.setUser(owner);
        ownerMember.setRole(ServerMember.Role.OWNER);
        memberRepository.save(ownerMember);

        Channel general = new Channel();
        general.setServer(server);
        general.setName("general");
        general.setType(Channel.Type.TEXT);
        general.setPosition(0);
        channelRepository.save(general);

        return ServerDetailResponse.from(server, List.of(general), List.of(ownerMember));
    }

    @Transactional(readOnly = true)
    public ServerDetailResponse getServerDetail(UUID serverId, UUID userId) {
        Server server = serverRepository.findByIdWithOwner(serverId)
            .orElseThrow(() -> new ResourceNotFoundException("Server not found"));

        if (!memberRepository.existsByServerIdAndUserId(serverId, userId)) {
            throw new ForbiddenException("You are not a member of this server");
        }

        List<Channel> channels = channelRepository.findAllByServerIdOrderByPositionAsc(serverId);
        List<ServerMember> members = memberRepository.findAllByServerIdWithUser(serverId);

        return ServerDetailResponse.from(server, channels, members);
    }

    public ServerResponse updateServer(UUID serverId, UUID userId, UpdateServerRequest request) {
        Server server = serverRepository.findByIdWithOwner(serverId)
            .orElseThrow(() -> new ResourceNotFoundException("Server not found"));

        requireOwner(serverId, userId);

        if (request.name() != null) server.setName(request.name());
        if (request.iconUrl() != null) server.setIconUrl(request.iconUrl());

        return ServerResponse.from(serverRepository.save(server));
    }

    public void deleteServer(UUID serverId, UUID userId) {
        if (!serverRepository.existsById(serverId)) {
            throw new ResourceNotFoundException("Server not found");
        }
        requireOwner(serverId, userId);
        serverRepository.deleteById(serverId);
    }

    public ServerDetailResponse joinServer(String inviteCode, UUID userId) {
        Server server = serverRepository.findByInviteCode(inviteCode)
            .orElseThrow(() -> new ResourceNotFoundException("Invalid invite code"));

        if (memberRepository.existsByServerIdAndUserId(server.getId(), userId)) {
            throw new ConflictException("You are already a member of this server");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ServerMember member = new ServerMember();
        member.setServer(server);
        member.setUser(user);
        member.setRole(ServerMember.Role.MEMBER);
        memberRepository.save(member);

        List<Channel> channels = channelRepository.findAllByServerIdOrderByPositionAsc(server.getId());
        List<ServerMember> members = memberRepository.findAllByServerIdWithUser(server.getId());

        return ServerDetailResponse.from(server, channels, members);
    }

    public void leaveServer(UUID serverId, UUID userId) {
        ServerMember member = memberRepository.findByServerIdAndUserId(serverId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("You are not a member of this server"));

        if (member.getRole() == ServerMember.Role.OWNER) {
            throw new ForbiddenException("Server owner cannot leave. Transfer ownership or delete the server.");
        }

        memberRepository.delete(member);
    }

    private void requireOwner(UUID serverId, UUID userId) {
        ServerMember member = memberRepository.findByServerIdAndUserId(serverId, userId)
            .orElseThrow(() -> new ForbiddenException("You are not a member of this server"));
        if (member.getRole() != ServerMember.Role.OWNER) {
            throw new ForbiddenException("Only the server owner can perform this action");
        }
    }

    private String generateInviteCode() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }
}

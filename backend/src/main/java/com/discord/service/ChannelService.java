package com.discord.service;

import com.discord.domain.Channel;
import com.discord.domain.ServerMember;
import com.discord.dto.request.CreateChannelRequest;
import com.discord.dto.request.UpdateChannelRequest;
import com.discord.dto.response.ChannelResponse;
import com.discord.exception.ForbiddenException;
import com.discord.exception.ResourceNotFoundException;
import com.discord.repository.ChannelRepository;
import com.discord.repository.ServerMemberRepository;
import com.discord.repository.ServerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class ChannelService {

    private final ChannelRepository channelRepository;
    private final ServerRepository serverRepository;
    private final ServerMemberRepository memberRepository;

    public ChannelService(ChannelRepository channelRepository,
                          ServerRepository serverRepository,
                          ServerMemberRepository memberRepository) {
        this.channelRepository = channelRepository;
        this.serverRepository = serverRepository;
        this.memberRepository = memberRepository;
    }

    public ChannelResponse createChannel(UUID serverId, UUID userId, CreateChannelRequest request) {
        if (!serverRepository.existsById(serverId)) {
            throw new ResourceNotFoundException("Server not found");
        }
        requireAdminOrOwner(serverId, userId);

        int position = channelRepository.countByServerId(serverId);

        Channel channel = new Channel();
        channel.setServer(serverRepository.getReferenceById(serverId));
        channel.setName(request.name());
        channel.setType(request.type() != null ? request.type() : Channel.Type.TEXT);
        channel.setPosition(position);

        return ChannelResponse.from(channelRepository.save(channel));
    }

    public ChannelResponse updateChannel(UUID serverId, UUID channelId, UUID userId, UpdateChannelRequest request) {
        Channel channel = channelRepository.findByIdAndServerId(channelId, serverId)
            .orElseThrow(() -> new ResourceNotFoundException("Channel not found"));

        requireAdminOrOwner(serverId, userId);

        channel.setName(request.name());
        return ChannelResponse.from(channelRepository.save(channel));
    }

    public void deleteChannel(UUID serverId, UUID channelId, UUID userId) {
        if (!channelRepository.findByIdAndServerId(channelId, serverId).isPresent()) {
            throw new ResourceNotFoundException("Channel not found");
        }
        requireAdminOrOwner(serverId, userId);
        channelRepository.deleteById(channelId);
    }

    private void requireAdminOrOwner(UUID serverId, UUID userId) {
        ServerMember member = memberRepository.findByServerIdAndUserId(serverId, userId)
            .orElseThrow(() -> new ForbiddenException("You are not a member of this server"));
        if (member.getRole() == ServerMember.Role.MEMBER) {
            throw new ForbiddenException("Requires admin or owner privileges");
        }
    }
}

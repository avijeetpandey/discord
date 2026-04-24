package com.discord.dto.response;

import com.discord.domain.Channel;
import com.discord.domain.Server;
import com.discord.domain.ServerMember;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ServerDetailResponse(
    UUID id,
    String name,
    String iconUrl,
    String inviteCode,
    UserResponse owner,
    List<ChannelResponse> channels,
    List<MemberResponse> members,
    Instant createdAt
) {
    public static ServerDetailResponse from(Server server, List<Channel> channels, List<ServerMember> members) {
        return new ServerDetailResponse(
            server.getId(),
            server.getName(),
            server.getIconUrl(),
            server.getInviteCode(),
            UserResponse.from(server.getOwner()),
            channels.stream().map(ChannelResponse::from).toList(),
            members.stream().map(MemberResponse::from).toList(),
            server.getCreatedAt()
        );
    }
}

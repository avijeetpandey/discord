package com.discord.dto.response;

import com.discord.domain.Channel;

import java.time.Instant;
import java.util.UUID;

public record ChannelResponse(
    UUID id,
    UUID serverId,
    String name,
    String type,
    int position,
    Instant createdAt
) {
    public static ChannelResponse from(Channel channel) {
        return new ChannelResponse(
            channel.getId(),
            channel.getServer().getId(),
            channel.getName(),
            channel.getType().name(),
            channel.getPosition(),
            channel.getCreatedAt()
        );
    }
}

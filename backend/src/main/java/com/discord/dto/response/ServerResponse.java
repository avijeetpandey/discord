package com.discord.dto.response;

import com.discord.domain.Server;

import java.time.Instant;
import java.util.UUID;

public record ServerResponse(
    UUID id,
    String name,
    String iconUrl,
    String inviteCode,
    UUID ownerId,
    Instant createdAt
) {
    public static ServerResponse from(Server server) {
        return new ServerResponse(
            server.getId(),
            server.getName(),
            server.getIconUrl(),
            server.getInviteCode(),
            server.getOwner().getId(),
            server.getCreatedAt()
        );
    }
}

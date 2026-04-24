package com.discord.dto.response;

import com.discord.domain.ServerMember;

import java.time.Instant;
import java.util.UUID;

public record MemberResponse(
    UUID id,
    UUID userId,
    String username,
    String avatarUrl,
    String role,
    Instant joinedAt
) {
    public static MemberResponse from(ServerMember member) {
        return new MemberResponse(
            member.getId(),
            member.getUser().getId(),
            member.getUser().getUsername(),
            member.getUser().getAvatarUrl(),
            member.getRole().name(),
            member.getJoinedAt()
        );
    }
}

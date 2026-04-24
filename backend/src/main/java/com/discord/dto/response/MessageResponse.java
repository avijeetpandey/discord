package com.discord.dto.response;

import com.discord.domain.Message;

import java.time.Instant;
import java.util.UUID;

public record MessageResponse(
    UUID id,
    UUID channelId,
    String content,
    boolean edited,
    Instant createdAt,
    Instant updatedAt,
    UserResponse author
) {
    public static MessageResponse from(Message message) {
        return new MessageResponse(
            message.getId(),
            message.getChannel().getId(),
            message.getContent(),
            message.isEdited(),
            message.getCreatedAt(),
            message.getUpdatedAt(),
            UserResponse.from(message.getAuthor())
        );
    }
}

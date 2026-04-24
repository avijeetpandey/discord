package com.discord.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EditMessageRequest(
    @NotBlank(message = "Message content cannot be blank")
    @Size(max = 4000, message = "Message cannot exceed 4000 characters")
    String content
) {}

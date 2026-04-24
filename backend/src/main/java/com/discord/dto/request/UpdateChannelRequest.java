package com.discord.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateChannelRequest(
    @NotBlank(message = "Channel name is required")
    @Size(min = 1, max = 100, message = "Channel name must be 1–100 characters")
    String name
) {}

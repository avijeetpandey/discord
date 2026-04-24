package com.discord.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateServerRequest(
    @NotBlank(message = "Server name is required")
    @Size(min = 1, max = 100, message = "Server name must be 1–100 characters")
    String name
) {}

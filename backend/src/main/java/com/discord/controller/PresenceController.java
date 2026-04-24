package com.discord.controller;

import com.discord.dto.request.HeartbeatPayload;
import com.discord.security.UserPrincipal;
import com.discord.service.PresenceService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

@Controller
public class PresenceController {

    private final PresenceService presenceService;

    public PresenceController(PresenceService presenceService) {
        this.presenceService = presenceService;
    }

    @MessageMapping("/presence/heartbeat")
    public void heartbeat(@Payload HeartbeatPayload payload, Principal principal) {
        UUID userId = extractUserId(principal);
        presenceService.refreshPresence(userId);
    }

    private UUID extractUserId(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth &&
            auth.getPrincipal() instanceof UserPrincipal userPrincipal) {
            return userPrincipal.getId();
        }
        throw new IllegalStateException("Unauthenticated WebSocket message");
    }
}

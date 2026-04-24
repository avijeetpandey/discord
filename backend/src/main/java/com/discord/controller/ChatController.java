package com.discord.controller;

import com.discord.dto.request.SendMessageRequest;
import com.discord.security.UserPrincipal;
import com.discord.service.MessageService;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

@Controller
public class ChatController {

    private final MessageService messageService;

    public ChatController(MessageService messageService) {
        this.messageService = messageService;
    }

    @MessageMapping("/channel/{channelId}/send")
    public void sendMessage(
        @DestinationVariable UUID channelId,
        @Payload SendMessageRequest payload,
        Principal principal
    ) {
        UUID userId = extractUserId(principal);
        messageService.sendMessage(channelId, userId, payload.content());
    }

    @MessageExceptionHandler
    @SendToUser("/queue/errors")
    public Map<String, String> handleException(Exception e) {
        return Map.of("error", e.getMessage());
    }

    private UUID extractUserId(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth &&
            auth.getPrincipal() instanceof UserPrincipal userPrincipal) {
            return userPrincipal.getId();
        }
        throw new IllegalStateException("Unauthenticated WebSocket message");
    }
}

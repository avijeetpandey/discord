package com.discord.listener;

import com.discord.security.UserPrincipal;
import com.discord.service.PresenceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;

@Component
public class WebSocketEventListener {

    private static final Logger log = LoggerFactory.getLogger(WebSocketEventListener.class);

    private final PresenceService presenceService;

    public WebSocketEventListener(PresenceService presenceService) {
        this.presenceService = presenceService;
    }

    @EventListener
    public void handleConnect(SessionConnectedEvent event) {
        extractPrincipal(StompHeaderAccessor.wrap(event.getMessage()))
            .ifPresent(userId -> {
                log.debug("User connected: {}", userId);
                presenceService.handleConnect(userId);
            });
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        extractPrincipal(StompHeaderAccessor.wrap(event.getMessage()))
            .ifPresent(userId -> {
                log.debug("User disconnected: {}", userId);
                presenceService.handleDisconnect(userId);
            });
    }

    private java.util.Optional<java.util.UUID> extractPrincipal(StompHeaderAccessor accessor) {
        Principal principal = accessor.getUser();
        if (principal instanceof UsernamePasswordAuthenticationToken auth &&
            auth.getPrincipal() instanceof UserPrincipal userPrincipal) {
            return java.util.Optional.of(userPrincipal.getId());
        }
        return java.util.Optional.empty();
    }
}

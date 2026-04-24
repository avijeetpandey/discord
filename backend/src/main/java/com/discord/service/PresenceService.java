package com.discord.service;

import com.discord.dto.response.PresenceEvent;
import com.discord.repository.ServerRepository;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class PresenceService {

    private static final String PRESENCE_PREFIX = "presence:";
    private static final long TTL_SECONDS = 35;

    private final RedisTemplate<String, Object> redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final ServerRepository serverRepository;

    public PresenceService(RedisTemplate<String, Object> redisTemplate,
                           SimpMessagingTemplate messagingTemplate,
                           ServerRepository serverRepository) {
        this.redisTemplate = redisTemplate;
        this.messagingTemplate = messagingTemplate;
        this.serverRepository = serverRepository;
    }

    @Transactional(readOnly = true)
    public void handleConnect(UUID userId) {
        redisTemplate.opsForValue().set(key(userId), "ONLINE", TTL_SECONDS, TimeUnit.SECONDS);
        broadcastToUserServers(userId, PresenceEvent.online(userId.toString()));
    }

    @Transactional(readOnly = true)
    public void handleDisconnect(UUID userId) {
        redisTemplate.delete(key(userId));
        broadcastToUserServers(userId, PresenceEvent.offline(userId.toString()));
    }

    public void refreshPresence(UUID userId) {
        redisTemplate.expire(key(userId), TTL_SECONDS, TimeUnit.SECONDS);
    }

    public boolean isOnline(UUID userId) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(key(userId)));
    }

    private void broadcastToUserServers(UUID userId, PresenceEvent event) {
        List<UUID> serverIds = serverRepository.findServerIdsByMemberUserId(userId);
        for (UUID serverId : serverIds) {
            messagingTemplate.convertAndSend("/topic/server/" + serverId + "/presence", event);
        }
    }

    private String key(UUID userId) {
        return PRESENCE_PREFIX + userId;
    }
}

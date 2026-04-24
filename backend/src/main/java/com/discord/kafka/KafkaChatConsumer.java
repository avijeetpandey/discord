package com.discord.kafka;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class KafkaChatConsumer {

    private static final Logger log = LoggerFactory.getLogger(KafkaChatConsumer.class);

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    public KafkaChatConsumer(SimpMessagingTemplate messagingTemplate, ObjectMapper objectMapper) {
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(topics = "chat.messages", groupId = "discord-app")
    public void consume(String payload) {
        try {
            ChatMessageEvent event = objectMapper.readValue(payload, ChatMessageEvent.class);
            String destination = "/topic/channel/" + event.getMessage().channelId();
            messagingTemplate.convertAndSend(destination, event);
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize Kafka chat event: {}", e.getMessage());
        }
    }
}

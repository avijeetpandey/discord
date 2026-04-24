package com.discord.kafka;

import com.discord.dto.response.MessageResponse;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageEvent {
    private String type;
    private MessageResponse message;
}

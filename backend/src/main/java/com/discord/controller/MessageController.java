package com.discord.controller;

import com.discord.dto.request.EditMessageRequest;
import com.discord.dto.request.SendMessageRequest;
import com.discord.dto.response.MessageResponse;
import com.discord.security.UserPrincipal;
import com.discord.service.MessageService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/channels/{channelId}/messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @GetMapping
    public ResponseEntity<List<MessageResponse>> getMessages(
        @PathVariable UUID channelId,
        @RequestParam(required = false) UUID before,
        @RequestParam(defaultValue = "50") int limit,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(messageService.getMessages(channelId, principal.getId(), before, limit));
    }

    @PostMapping
    public ResponseEntity<MessageResponse> sendMessage(
        @PathVariable UUID channelId,
        @Valid @RequestBody SendMessageRequest request,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(201)
            .body(messageService.sendMessage(channelId, principal.getId(), request.content()));
    }

    @PutMapping("/{messageId}")
    public ResponseEntity<MessageResponse> editMessage(
        @PathVariable UUID channelId,
        @PathVariable UUID messageId,
        @Valid @RequestBody EditMessageRequest request,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(messageService.editMessage(channelId, messageId, principal.getId(), request));
    }

    @DeleteMapping("/{messageId}")
    public ResponseEntity<Void> deleteMessage(
        @PathVariable UUID channelId,
        @PathVariable UUID messageId,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        messageService.deleteMessage(channelId, messageId, principal.getId());
        return ResponseEntity.noContent().build();
    }
}

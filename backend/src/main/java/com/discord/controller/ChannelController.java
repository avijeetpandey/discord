package com.discord.controller;

import com.discord.dto.request.CreateChannelRequest;
import com.discord.dto.request.UpdateChannelRequest;
import com.discord.dto.response.ChannelResponse;
import com.discord.security.UserPrincipal;
import com.discord.service.ChannelService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/servers/{serverId}/channels")
public class ChannelController {

    private final ChannelService channelService;

    public ChannelController(ChannelService channelService) {
        this.channelService = channelService;
    }

    @PostMapping
    public ResponseEntity<ChannelResponse> createChannel(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable UUID serverId,
        @Valid @RequestBody CreateChannelRequest request
    ) {
        return ResponseEntity.status(201).body(channelService.createChannel(serverId, principal.getId(), request));
    }

    @PutMapping("/{channelId}")
    public ResponseEntity<ChannelResponse> updateChannel(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable UUID serverId,
        @PathVariable UUID channelId,
        @Valid @RequestBody UpdateChannelRequest request
    ) {
        return ResponseEntity.ok(channelService.updateChannel(serverId, channelId, principal.getId(), request));
    }

    @DeleteMapping("/{channelId}")
    public ResponseEntity<Void> deleteChannel(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable UUID serverId,
        @PathVariable UUID channelId
    ) {
        channelService.deleteChannel(serverId, channelId, principal.getId());
        return ResponseEntity.noContent().build();
    }
}

package com.discord.controller;

import com.discord.dto.request.CreateServerRequest;
import com.discord.dto.request.UpdateServerRequest;
import com.discord.dto.response.ServerDetailResponse;
import com.discord.dto.response.ServerResponse;
import com.discord.security.UserPrincipal;
import com.discord.service.ServerService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/servers")
public class ServerController {

    private final ServerService serverService;

    public ServerController(ServerService serverService) {
        this.serverService = serverService;
    }

    @GetMapping
    public ResponseEntity<List<ServerResponse>> getMyServers(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(serverService.getMyServers(principal.getId()));
    }

    @PostMapping
    public ResponseEntity<ServerDetailResponse> createServer(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody CreateServerRequest request
    ) {
        return ResponseEntity.status(201).body(serverService.createServer(principal.getId(), request));
    }

    @GetMapping("/{serverId}")
    public ResponseEntity<ServerDetailResponse> getServer(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable UUID serverId
    ) {
        return ResponseEntity.ok(serverService.getServerDetail(serverId, principal.getId()));
    }

    @PutMapping("/{serverId}")
    public ResponseEntity<ServerResponse> updateServer(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable UUID serverId,
        @Valid @RequestBody UpdateServerRequest request
    ) {
        return ResponseEntity.ok(serverService.updateServer(serverId, principal.getId(), request));
    }

    @DeleteMapping("/{serverId}")
    public ResponseEntity<Void> deleteServer(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable UUID serverId
    ) {
        serverService.deleteServer(serverId, principal.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/join/{inviteCode}")
    public ResponseEntity<ServerDetailResponse> joinServer(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable String inviteCode
    ) {
        return ResponseEntity.ok(serverService.joinServer(inviteCode, principal.getId()));
    }

    @DeleteMapping("/{serverId}/leave")
    public ResponseEntity<Void> leaveServer(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable UUID serverId
    ) {
        serverService.leaveServer(serverId, principal.getId());
        return ResponseEntity.noContent().build();
    }
}

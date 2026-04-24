package com.discord.dto.response;

public record PresenceEvent(String type, String userId, String status) {
    public static PresenceEvent online(String userId) {
        return new PresenceEvent("PRESENCE_UPDATE", userId, "ONLINE");
    }

    public static PresenceEvent offline(String userId) {
        return new PresenceEvent("PRESENCE_UPDATE", userId, "OFFLINE");
    }
}

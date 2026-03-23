package com.chatsever.backend.service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

@Component
@RequiredArgsConstructor
public class OnlineUserPresenceService {

    private static final String ONLINE_USERS_TOPIC = "/topic/public.online";
    private static final String LEGACY_ONLINE_USERS_TOPIC = "/topic/online_users";
    private static final String PRIVATE_TOPIC_PREFIX = "/topic/private/";
    private static final String CALL_TOPIC_PREFIX = "/topic/call/";

    private final SimpMessagingTemplate messagingTemplate;

    private final Set<Integer> activeUsers = ConcurrentHashMap.newKeySet();
    private final Map<String, Integer> sessionUsers = new ConcurrentHashMap<>();

    @EventListener
    public void handleSessionConnect(SessionConnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = accessor.getSessionId();
        Integer userId = parsePositiveInteger(accessor.getFirstNativeHeader("userId"));
        if (userId == null) {
            userId = parsePositiveInteger(accessor.getFirstNativeHeader("userid"));
        }

        if (sessionId == null || userId == null) {
            return;
        }

        sessionUsers.put(sessionId, userId);
        activeUsers.add(userId);
        broadcastActiveUsers();
    }

    @EventListener
    public void handleSessionDisconnected(SessionDisconnectEvent event) {
        String sessionId = event.getSessionId();
        if (sessionId == null) {
            return;
        }

        Integer userId = sessionUsers.remove(sessionId);
        if (userId == null) {
            return;
        }

        if (!sessionUsers.containsValue(userId)) {
            activeUsers.remove(userId);
        }

        broadcastActiveUsers();
    }

    @EventListener
    public void handleSessionSubscribed(SessionSubscribeEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = accessor.getSessionId();
        String destination = accessor.getDestination();

        if (sessionId == null || destination == null || sessionUsers.containsKey(sessionId)) {
            return;
        }

        Integer userId = extractUserIdFromDestination(destination);
        if (userId == null) {
            return;
        }

        sessionUsers.put(sessionId, userId);
        activeUsers.add(userId);
        broadcastActiveUsers();
    }

    private void broadcastActiveUsers() {
        List<Integer> snapshot = getActiveUsersSnapshot();
        messagingTemplate.convertAndSend(ONLINE_USERS_TOPIC, snapshot);
        messagingTemplate.convertAndSend(LEGACY_ONLINE_USERS_TOPIC, snapshot);
    }

    public List<Integer> getActiveUsersSnapshot() {
        return activeUsers.stream().sorted().toList();
    }

    private Integer extractUserIdFromDestination(String destination) {
        if (destination.startsWith(PRIVATE_TOPIC_PREFIX)) {
            return parsePositiveInteger(destination.substring(PRIVATE_TOPIC_PREFIX.length()));
        }

        if (destination.startsWith(CALL_TOPIC_PREFIX)) {
            return parsePositiveInteger(destination.substring(CALL_TOPIC_PREFIX.length()));
        }

        return null;
    }

    private Integer parsePositiveInteger(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            int parsed = Integer.parseInt(value.trim());
            return parsed > 0 ? parsed : null;
        } catch (NumberFormatException exception) {
            return null;
        }
    }
}

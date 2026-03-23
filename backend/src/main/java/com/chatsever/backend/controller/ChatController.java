package com.chatsever.backend.controller;

import com.chatsever.backend.controller.dto.ChatMessageRequest;
import com.chatsever.backend.controller.dto.ChatMessageResponse;
import com.chatsever.backend.controller.dto.CallSignalRequest;
import com.chatsever.backend.service.MessageService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private static final String PUBLIC_TOPIC = "/topic/public";
    private static final String PRIVATE_TOPIC_PREFIX = "/topic/private/";
    private static final String CALL_TOPIC_PREFIX = "/topic/call/";

    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessageRequest request) {
        ChatMessageResponse saved;
        try {
            saved = messageService.saveMessage(request);
        } catch (IllegalArgumentException exception) {
            return;
        }

        if (saved.getReceiverId() == null) {
            messagingTemplate.convertAndSend(PUBLIC_TOPIC, saved);
            return;
        }

        messagingTemplate.convertAndSend(PRIVATE_TOPIC_PREFIX + saved.getReceiverId(), saved);
        messagingTemplate.convertAndSend(PRIVATE_TOPIC_PREFIX + saved.getSenderId(), saved);
    }

    @MessageMapping("/call.signal")
    public void relayCallSignal(@Payload CallSignalRequest request) {
        if (request == null || request.getSenderId() == null || request.getReceiverId() == null) {
            return;
        }
        if (request.getType() == null || request.getType().isBlank()) {
            return;
        }

        messagingTemplate.convertAndSend(CALL_TOPIC_PREFIX + request.getReceiverId(), request);
    }

    @GetMapping("/history/private")
    public List<ChatMessageResponse> getPrivateHistory(
            @RequestParam Integer userId1,
            @RequestParam Integer userId2) {
        return messageService.getPrivateChatHistory(userId1, userId2);
    }

    @GetMapping("/history/public")
    public List<ChatMessageResponse> getPublicHistory() {
        return messageService.getPublicChatHistory();
    }

    @GetMapping("/history/private/conversations")
    public List<Integer> getPrivateConversationPartners(@RequestParam Integer userId) {
        return messageService.getPrivateConversationPartnerIds(userId);
    }
}

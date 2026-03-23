package com.chatsever.backend.service;

import com.chatsever.backend.controller.dto.ChatMessageRequest;
import com.chatsever.backend.controller.dto.ChatMessageResponse;
import com.chatsever.backend.model.Message;
import com.chatsever.backend.model.User;
import com.chatsever.backend.repository.MessageRepository;
import com.chatsever.backend.repository.UserRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    @Transactional
    public ChatMessageResponse saveMessage(ChatMessageRequest request) {
        if (request.getSenderId() == null) {
            throw new IllegalArgumentException("senderId is required");
        }
        String normalizedContent = request.getContent() != null ? request.getContent().trim() : null;
        if (normalizedContent == null || normalizedContent.isBlank()) {
            throw new IllegalArgumentException("content is required");
        }

        User sender = userRepository.findById(request.getSenderId())
                .orElseThrow(() -> new IllegalArgumentException("Sender does not exist"));

        User receiver = null;
        if (request.getReceiverId() != null) {
            receiver = userRepository.findById(request.getReceiverId())
                    .orElseThrow(() -> new IllegalArgumentException("Receiver does not exist"));
        }

        Message.MessageType messageType = resolveMessageType(request.getMessageType());

        Message message = Message.builder()
                .sender(sender)
                .receiver(receiver)
                .content(normalizedContent)
                .messageType(messageType)
                .build();

        Message saved = messageRepository.save(message);
        return toResponse(saved);
    }

    public List<ChatMessageResponse> getPrivateChatHistory(Integer userId1, Integer userId2) {
        return messageRepository.findPrivateChatHistory(userId1, userId2)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<ChatMessageResponse> getPublicChatHistory() {
        return messageRepository.findByReceiverIsNullOrderByCreatedAtAscMsgIdAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<Integer> getPrivateConversationPartnerIds(Integer userId) {
        if (userId == null || userId <= 0) {
            return List.of();
        }
        return messageRepository.findPrivateConversationPartnerIds(userId)
                .stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();
    }

    private Message.MessageType resolveMessageType(String rawMessageType) {
        if (rawMessageType == null || rawMessageType.isBlank()) {
            return Message.MessageType.text;
        }
        try {
            return Message.MessageType.valueOf(rawMessageType.trim().toLowerCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Invalid message type");
        }
    }

    private ChatMessageResponse toResponse(Message message) {
        Integer receiverId = message.getReceiver() != null ? message.getReceiver().getUserId() : null;
        return ChatMessageResponse.builder()
                .msgId(message.getMsgId())
                .senderId(message.getSender().getUserId())
                .receiverId(receiverId)
                .content(message.getContent())
                .messageType(message.getMessageType().name())
                .createdAt(message.getCreatedAt())
                .build();
    }
}

package com.chatsever.backend.controller.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChatMessageRequest {

    private Integer senderId;
    private Integer receiverId;
    private String content;
    private String messageType;
}

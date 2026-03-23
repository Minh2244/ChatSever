package com.chatsever.backend.controller.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponse {

    private Integer msgId;
    private Integer senderId;
    private Integer receiverId;
    private String content;
    private String messageType;
    private LocalDateTime createdAt;
}

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
public class PendingFriendRequestResponse {

    private Integer friendshipId;
    private Integer requesterId;
    private String requesterUsername;
    private String requesterAvatarUrl;
    private String status;
    private LocalDateTime createdAt;
}

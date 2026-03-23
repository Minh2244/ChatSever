package com.chatsever.backend.controller.dto;

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
public class FriendshipStatusResponse {

    private String relation;
    private Integer friendshipId;
    private Integer requesterId;
    private Integer receiverId;
}

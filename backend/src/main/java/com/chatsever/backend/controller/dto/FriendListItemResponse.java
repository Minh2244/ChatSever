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
public class FriendListItemResponse {

    private Integer friendshipId;
    private Integer userId;
    private String username;
    private String avatarUrl;
    private String status;
}

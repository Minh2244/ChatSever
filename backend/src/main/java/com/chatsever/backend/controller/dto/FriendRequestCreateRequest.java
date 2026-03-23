package com.chatsever.backend.controller.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FriendRequestCreateRequest {

    @NotNull
    private Integer senderId;

    @NotNull
    private Integer receiverId;
}

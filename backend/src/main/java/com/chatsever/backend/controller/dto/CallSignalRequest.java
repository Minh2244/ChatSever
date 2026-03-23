package com.chatsever.backend.controller.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CallSignalRequest {

    private String type;
    private Integer senderId;
    private Integer receiverId;
    private String data;
    private String callMode;
}

package com.chatsever.backend.controller;

import com.chatsever.backend.controller.dto.UserSummaryResponse;
import com.chatsever.backend.service.OnlineUserPresenceService;
import com.chatsever.backend.service.UserService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*", allowedHeaders = "*")
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final OnlineUserPresenceService onlineUserPresenceService;

    @GetMapping
    public List<UserSummaryResponse> getAllUsers() {
        return userService.getAllUserSummaries();
    }

    @GetMapping("/online")
    public List<Integer> getOnlineUsers() {
        return onlineUserPresenceService.getActiveUsersSnapshot();
    }
}

package com.chatsever.backend.controller;

import com.chatsever.backend.controller.dto.FriendListItemResponse;
import com.chatsever.backend.controller.dto.FriendRequestCreateRequest;
import com.chatsever.backend.controller.dto.FriendshipStatusResponse;
import com.chatsever.backend.controller.dto.PendingFriendRequestResponse;
import com.chatsever.backend.service.FriendshipService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*", allowedHeaders = "*")
@RequestMapping("/api/friendships")
@RequiredArgsConstructor
public class FriendshipController {

    private final FriendshipService friendshipService;

    @PostMapping("/requests")
    public ResponseEntity<Void> sendRequest(@Valid @RequestBody FriendRequestCreateRequest request) {
        friendshipService.sendFriendRequest(request.getSenderId(), request.getReceiverId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/requests/{friendshipId}/accept")
    public ResponseEntity<Void> acceptRequest(
            @PathVariable Integer friendshipId,
            @RequestParam Integer userId) {
        friendshipService.acceptRequest(friendshipId, userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/requests/{friendshipId}/reject")
    public ResponseEntity<Void> rejectRequest(
            @PathVariable Integer friendshipId,
            @RequestParam Integer userId) {
        friendshipService.rejectRequest(friendshipId, userId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{friendshipId}")
    public ResponseEntity<Void> unfriend(
            @PathVariable Integer friendshipId,
            @RequestParam Integer userId) {
        friendshipService.removeFriendship(friendshipId, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{userId}/friends")
    public List<FriendListItemResponse> getAcceptedFriends(@PathVariable Integer userId) {
        return friendshipService.getAcceptedFriends(userId);
    }

    @GetMapping("/{userId}/requests")
    public List<PendingFriendRequestResponse> getPendingRequests(@PathVariable Integer userId) {
        return friendshipService.getPendingRequests(userId);
    }

    @GetMapping("/status")
    public FriendshipStatusResponse getFriendshipStatus(
            @RequestParam Integer userId1,
            @RequestParam Integer userId2) {
        return friendshipService.getFriendshipStatus(userId1, userId2);
    }
}

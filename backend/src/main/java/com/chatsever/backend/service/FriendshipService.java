package com.chatsever.backend.service;

import com.chatsever.backend.controller.dto.FriendListItemResponse;
import com.chatsever.backend.controller.dto.FriendshipStatusResponse;
import com.chatsever.backend.controller.dto.PendingFriendRequestResponse;
import com.chatsever.backend.model.Friendship;
import com.chatsever.backend.model.Friendship.Status;
import com.chatsever.backend.model.User;
import com.chatsever.backend.repository.FriendshipRepository;
import com.chatsever.backend.repository.UserRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class FriendshipService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;

    @Transactional
    public void sendFriendRequest(Integer senderId, Integer receiverId) {
        if (senderId == null || receiverId == null) {
            throw new IllegalArgumentException("senderId and receiverId are required");
        }
        if (senderId.equals(receiverId)) {
            throw new IllegalArgumentException("Cannot send request to yourself");
        }

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("Sender does not exist"));
        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new IllegalArgumentException("Receiver does not exist"));

        friendshipRepository.findAnyBetweenUsers(senderId, receiverId)
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Friendship or request already exists");
                });

        Friendship friendship = Friendship.builder()
                .user1(sender)
                .user2(receiver)
                .status(Status.PENDING)
                .build();

        friendshipRepository.save(friendship);
    }

    @Transactional
    public void acceptRequest(Integer friendshipId, Integer userId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new IllegalArgumentException("Friend request not found"));

        if (friendship.getStatus() != Status.PENDING) {
            throw new IllegalArgumentException("Friend request is not pending");
        }
        if (!friendship.getUser2().getUserId().equals(userId)) {
            throw new IllegalArgumentException("Only receiver can accept this request");
        }

        friendship.setStatus(Status.ACCEPTED);
        friendshipRepository.save(friendship);
    }

    @Transactional
    public void rejectRequest(Integer friendshipId, Integer userId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new IllegalArgumentException("Friend request not found"));

        if (friendship.getStatus() != Status.PENDING) {
            throw new IllegalArgumentException("Friend request is not pending");
        }
        if (!friendship.getUser2().getUserId().equals(userId)) {
            throw new IllegalArgumentException("Only receiver can reject this request");
        }

        friendshipRepository.delete(friendship);
    }

    @Transactional
    public void removeFriendship(Integer friendshipId, Integer userId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new IllegalArgumentException("Friendship not found"));

        Integer user1Id = friendship.getUser1().getUserId();
        Integer user2Id = friendship.getUser2().getUserId();
        if (!user1Id.equals(userId) && !user2Id.equals(userId)) {
            throw new IllegalArgumentException("You are not part of this friendship");
        }

        friendshipRepository.delete(friendship);
    }

    public List<FriendListItemResponse> getAcceptedFriends(Integer userId) {
        return friendshipRepository.findByUserAndStatus(userId, Status.ACCEPTED)
                .stream()
                .map(friendship -> {
                    User friendUser = friendship.getUser1().getUserId().equals(userId)
                            ? friendship.getUser2()
                            : friendship.getUser1();

                    return FriendListItemResponse.builder()
                            .friendshipId(friendship.getId())
                            .userId(friendUser.getUserId())
                            .username(friendUser.getUsername())
                            .avatarUrl(friendUser.getAvatarUrl())
                            .status(friendship.getStatus().name())
                            .build();
                })
                .toList();
    }

    public List<PendingFriendRequestResponse> getPendingRequests(Integer userId) {
        return friendshipRepository.findIncomingByUserAndStatus(userId, Status.PENDING)
                .stream()
                .map(friendship -> PendingFriendRequestResponse.builder()
                        .friendshipId(friendship.getId())
                        .requesterId(friendship.getUser1().getUserId())
                        .requesterUsername(friendship.getUser1().getUsername())
                        .requesterAvatarUrl(friendship.getUser1().getAvatarUrl())
                        .status(friendship.getStatus().name())
                        .createdAt(friendship.getCreatedAt())
                        .build())
                .toList();
    }

    public FriendshipStatusResponse getFriendshipStatus(Integer userId1, Integer userId2) {
        if (userId1 == null || userId2 == null || userId1 <= 0 || userId2 <= 0 || userId1.equals(userId2)) {
            return FriendshipStatusResponse.builder()
                    .relation("NONE")
                    .build();
        }

        return friendshipRepository.findAnyBetweenUsers(userId1, userId2)
                .map(friendship -> {
                    Integer requesterId = friendship.getUser1().getUserId();
                    Integer receiverId = friendship.getUser2().getUserId();

                    if (friendship.getStatus() == Status.ACCEPTED) {
                        return FriendshipStatusResponse.builder()
                                .relation("FRIEND")
                                .friendshipId(friendship.getId())
                                .requesterId(requesterId)
                                .receiverId(receiverId)
                                .build();
                    }

                    String relation = requesterId.equals(userId1)
                            ? "OUTGOING_REQUEST"
                            : "INCOMING_REQUEST";

                    return FriendshipStatusResponse.builder()
                            .relation(relation)
                            .friendshipId(friendship.getId())
                            .requesterId(requesterId)
                            .receiverId(receiverId)
                            .build();
                })
                .orElseGet(() -> FriendshipStatusResponse.builder()
                        .relation("NONE")
                        .build());
    }
}

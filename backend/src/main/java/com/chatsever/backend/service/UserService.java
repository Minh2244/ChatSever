package com.chatsever.backend.service;

import com.chatsever.backend.controller.dto.LoginRequest;
import com.chatsever.backend.controller.dto.RegisterRequest;
import com.chatsever.backend.controller.dto.UserSummaryResponse;
import com.chatsever.backend.model.User;
import com.chatsever.backend.repository.UserRepository;
import jakarta.transaction.Transactional;
import java.util.Comparator;
import java.util.List;
import java.time.LocalDateTime;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public Optional<User> findById(Integer userId) {
        return userRepository.findById(userId);
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public List<UserSummaryResponse> getAllUserSummaries() {
        return userRepository.findAll()
                .stream()
                .sorted(Comparator.comparing(User::getUserId))
                .map(user -> UserSummaryResponse.builder()
                        .userId(user.getUserId())
                        .username(user.getUsername())
                        .avatarUrl(user.getAvatarUrl())
                        .build())
                .toList();
    }

    @Transactional
    public User register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists");
        }

        User user = User.builder()
                .username(request.getUsername())
                .password(request.getPassword())
                .avatarUrl(request.getAvatarUrl())
                .lastLogin(LocalDateTime.now())
                .build();

        return userRepository.save(user);
    }

    @Transactional
    public User login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Invalid username or password"));

        if (!user.getPassword().equals(request.getPassword())) {
            throw new IllegalArgumentException("Invalid username or password");
        }

        user.setLastLogin(LocalDateTime.now());
        return userRepository.save(user);
    }
}

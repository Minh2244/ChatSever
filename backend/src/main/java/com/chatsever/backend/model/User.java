package com.chatsever.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
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
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "username", nullable = false, length = 50, unique = true)
    private String username;

    @Column(name = "password", nullable = false, length = 255)
    private String password;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @Builder.Default
    @OneToMany(mappedBy = "sender", fetch = FetchType.LAZY)
    private List<Message> sentMessages = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "receiver", fetch = FetchType.LAZY)
    private List<Message> receivedMessages = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "user1", fetch = FetchType.LAZY)
    private List<Friendship> friendshipsInitiated = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "user2", fetch = FetchType.LAZY)
    private List<Friendship> friendshipsReceived = new ArrayList<>();
}

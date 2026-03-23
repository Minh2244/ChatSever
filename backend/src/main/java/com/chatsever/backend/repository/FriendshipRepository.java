package com.chatsever.backend.repository;

import com.chatsever.backend.model.Friendship;
import com.chatsever.backend.model.Friendship.Status;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FriendshipRepository extends JpaRepository<Friendship, Integer> {

    @Query("""
            SELECT f
            FROM Friendship f
            WHERE (f.user1.userId = :userId1 AND f.user2.userId = :userId2)
               OR (f.user1.userId = :userId2 AND f.user2.userId = :userId1)
            """)
    Optional<Friendship> findAnyBetweenUsers(@Param("userId1") Integer userId1, @Param("userId2") Integer userId2);

    @Query("""
            SELECT f
            FROM Friendship f
            WHERE (f.user1.userId = :userId OR f.user2.userId = :userId)
              AND f.status = :status
            ORDER BY f.createdAt DESC, f.id DESC
            """)
    List<Friendship> findByUserAndStatus(@Param("userId") Integer userId, @Param("status") Status status);

    @Query("""
            SELECT f
            FROM Friendship f
            WHERE f.user2.userId = :userId
              AND f.status = :status
            ORDER BY f.createdAt DESC, f.id DESC
            """)
    List<Friendship> findIncomingByUserAndStatus(@Param("userId") Integer userId, @Param("status") Status status);
}

package com.chatsever.backend.repository;

import com.chatsever.backend.model.Message;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MessageRepository extends JpaRepository<Message, Integer> {

    @Query("""
            SELECT DISTINCT
                CASE
                    WHEN m.sender.userId = :userId THEN m.receiver.userId
                    ELSE m.sender.userId
                END
            FROM Message m
            WHERE m.receiver IS NOT NULL
              AND (m.sender.userId = :userId OR m.receiver.userId = :userId)
            """)
    List<Integer> findPrivateConversationPartnerIds(@Param("userId") Integer userId);

    // THÊM THAM SỐ Pageable VÀO ĐỂ GIỚI HẠN SỐ LƯỢNG TIN NHẮN (ORDER BY DESC ĐỂ LẤY
    // TIN MỚI NHẤT)
    @Query("""
            SELECT m
            FROM Message m
            WHERE ((m.sender.userId = :userId1 AND m.receiver.userId = :userId2)
                OR (m.sender.userId = :userId2 AND m.receiver.userId = :userId1))
            ORDER BY m.createdAt DESC, m.msgId DESC
            """)
    List<Message> findPrivateChatHistory(@Param("userId1") Integer userId1, @Param("userId2") Integer userId2,
            Pageable pageable);

    // THÊM THAM SỐ Pageable VÀO ĐÂY (ORDER BY DESC ĐỂ LẤY TIN MỚI NHẤT)
    List<Message> findByReceiverIsNullOrderByCreatedAtDescMsgIdDesc(Pageable pageable);
}
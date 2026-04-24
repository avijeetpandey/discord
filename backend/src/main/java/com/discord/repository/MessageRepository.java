package com.discord.repository;

import com.discord.domain.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {

    @Query("""
        SELECT m FROM Message m
        JOIN FETCH m.author
        WHERE m.channel.id = :channelId
        ORDER BY m.createdAt DESC
        """)
    List<Message> findLatestByChannelId(@Param("channelId") UUID channelId, Pageable pageable);

    @Query("""
        SELECT m FROM Message m
        JOIN FETCH m.author
        WHERE m.channel.id = :channelId
          AND m.createdAt < (SELECT b.createdAt FROM Message b WHERE b.id = :beforeId)
        ORDER BY m.createdAt DESC
        """)
    List<Message> findByChannelIdBeforeCursor(
        @Param("channelId") UUID channelId,
        @Param("beforeId") UUID beforeId,
        Pageable pageable
    );

    @Query("""
        SELECT m FROM Message m
        JOIN FETCH m.channel
        JOIN FETCH m.author
        WHERE m.id = :id AND m.author.id = :authorId
        """)
    Optional<Message> findByIdAndAuthorId(@Param("id") UUID id, @Param("authorId") UUID authorId);
}

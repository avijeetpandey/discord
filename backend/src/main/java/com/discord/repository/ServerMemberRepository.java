package com.discord.repository;

import com.discord.domain.ServerMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ServerMemberRepository extends JpaRepository<ServerMember, UUID> {

    Optional<ServerMember> findByServerIdAndUserId(UUID serverId, UUID userId);

    boolean existsByServerIdAndUserId(UUID serverId, UUID userId);

    @Query("""
        SELECT m FROM ServerMember m
        JOIN FETCH m.user
        WHERE m.server.id = :serverId
        """)
    List<ServerMember> findAllByServerIdWithUser(@Param("serverId") UUID serverId);

    void deleteByServerIdAndUserId(UUID serverId, UUID userId);
}

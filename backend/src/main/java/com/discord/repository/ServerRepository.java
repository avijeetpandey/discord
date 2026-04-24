package com.discord.repository;

import com.discord.domain.Server;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ServerRepository extends JpaRepository<Server, UUID> {
    Optional<Server> findByInviteCode(String inviteCode);

    @Query("SELECT s FROM Server s JOIN FETCH s.owner WHERE s.id = :id")
    Optional<Server> findByIdWithOwner(@Param("id") UUID id);

    @Query("SELECT s.id FROM Server s JOIN ServerMember m ON m.server = s WHERE m.user.id = :userId")
    List<UUID> findServerIdsByMemberUserId(@Param("userId") UUID userId);

    @Query("""
        SELECT s FROM Server s
        JOIN FETCH s.owner
        JOIN ServerMember m ON m.server = s
        WHERE m.user.id = :userId
        """)
    List<Server> findAllByMemberUserId(@Param("userId") UUID userId);
}

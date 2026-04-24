package com.discord.repository;

import com.discord.domain.Channel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChannelRepository extends JpaRepository<Channel, UUID> {
    List<Channel> findAllByServerIdOrderByPositionAsc(UUID serverId);
    Optional<Channel> findByIdAndServerId(UUID id, UUID serverId);
    int countByServerId(UUID serverId);

    @Query("SELECT c FROM Channel c JOIN FETCH c.server WHERE c.id = :id")
    Optional<Channel> findByIdWithServer(@Param("id") UUID id);
}

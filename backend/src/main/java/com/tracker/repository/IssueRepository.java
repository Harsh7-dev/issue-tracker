package com.tracker.repository;

import com.tracker.entity.Issue;
import com.tracker.entity.Priority;
import com.tracker.entity.Status;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface IssueRepository extends JpaRepository<Issue, UUID> {

    @Query("""
        SELECT i FROM Issue i
        WHERE i.project.id = :projectId
          AND (CAST(:title AS string) IS NULL OR LOWER(i.title) LIKE LOWER(CONCAT('%', CAST(:title AS string), '%')))
          AND (:status IS NULL OR i.status = :status)
          AND (:priority IS NULL OR i.priority = :priority)
          AND (:assigneeId IS NULL OR i.assignee.id = :assigneeId)
        ORDER BY i.createdAt DESC
        """)
    List<Issue> search(@Param("projectId") UUID projectId,
                       @Param("title") String title,
                       @Param("status") Status status,
                       @Param("priority") Priority priority,
                       @Param("assigneeId") UUID assigneeId);

    long countByProjectOwnerId(UUID ownerId);
    long countByProjectOwnerIdAndStatus(UUID ownerId, Status status);
    long countByProjectOwnerIdAndStatusNot(UUID ownerId, Status status);
}

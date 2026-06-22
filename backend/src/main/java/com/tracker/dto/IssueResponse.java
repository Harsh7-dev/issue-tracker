package com.tracker.dto;

import com.tracker.entity.Issue;
import java.time.Instant;

public record IssueResponse(String id, String title, String description,
                            String priority, String status,
                            String assigneeId, String assigneeName,
                            String projectId, Instant createdAt, Instant updatedAt) {
    public static IssueResponse from(Issue i) {
        return new IssueResponse(
                i.getId().toString(), i.getTitle(), i.getDescription(),
                i.getPriority().name(), i.getStatus().name(),
                i.getAssignee() != null ? i.getAssignee().getId().toString() : null,
                i.getAssignee() != null ? i.getAssignee().getName() : null,
                i.getProject().getId().toString(),
                i.getCreatedAt(), i.getUpdatedAt());
    }
}

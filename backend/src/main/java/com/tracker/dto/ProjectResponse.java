package com.tracker.dto;

import com.tracker.entity.Project;
import java.time.Instant;

public record ProjectResponse(String id, String name, String description,
                              boolean archived, String ownerName, Instant createdAt) {
    public static ProjectResponse from(Project p) {
        return new ProjectResponse(p.getId().toString(), p.getName(), p.getDescription(),
                p.isArchived(), p.getOwner().getName(), p.getCreatedAt());
    }
}

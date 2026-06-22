package com.tracker.dto;

import com.tracker.entity.Priority;
import com.tracker.entity.Status;
import jakarta.validation.constraints.NotBlank;

public record IssueRequest(
        @NotBlank(message = "Title is required") String title,
        String description,
        Priority priority,
        Status status,
        String assigneeId
) {}

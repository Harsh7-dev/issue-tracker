package com.tracker.dto;

public record DashboardStats(long totalProjects, long totalIssues,
                             long openIssues, long completedIssues) {}

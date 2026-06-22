package com.tracker.controller;

import com.tracker.dto.*;
import com.tracker.entity.User;
import com.tracker.repository.IssueRepository;
import com.tracker.repository.ProjectRepository;
import com.tracker.entity.Status;
import com.tracker.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class ProjectController {

    private final ProjectService projectService;
    private final ProjectRepository projectRepository;
    private final IssueRepository issueRepository;

    public ProjectController(ProjectService projectService, ProjectRepository projectRepository, IssueRepository issueRepository) {
        this.projectService = projectService;
        this.projectRepository = projectRepository;
        this.issueRepository = issueRepository;
    }

    @GetMapping("/projects")
    public List<ProjectResponse> list(@AuthenticationPrincipal User user) {
        return projectService.listForUser(user).stream().map(ProjectResponse::from).toList();
    }

    @PostMapping("/projects")
    public ResponseEntity<ProjectResponse> create(@AuthenticationPrincipal User user,
                                                  @Valid @RequestBody ProjectRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ProjectResponse.from(projectService.create(user, req)));
    }

    @GetMapping("/projects/{id}")
    public ProjectResponse get(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return ProjectResponse.from(projectService.getOwned(user, id));
    }

    @PatchMapping("/projects/{id}")
    public ProjectResponse update(@AuthenticationPrincipal User user, @PathVariable UUID id,
                                  @Valid @RequestBody ProjectRequest req) {
        return ProjectResponse.from(projectService.updateName(user, id, req));
    }

    @PostMapping("/projects/{id}/archive")
    public ProjectResponse archive(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return ProjectResponse.from(projectService.archive(user, id));
    }

    @GetMapping("/dashboard/stats")
    public DashboardStats stats(@AuthenticationPrincipal User user) {
        UUID uid = user.getId();
        long projects = projectRepository.countByOwnerId(uid);
        long issues = issueRepository.countByProjectOwnerId(uid);
        long done = issueRepository.countByProjectOwnerIdAndStatus(uid, Status.DONE);
        long open = issueRepository.countByProjectOwnerIdAndStatusNot(uid, Status.DONE);
        return new DashboardStats(projects, issues, open, done);
    }
}

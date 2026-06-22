package com.tracker.service;

import com.tracker.dto.IssueRequest;
import com.tracker.entity.*;
import com.tracker.exception.ApiException;
import com.tracker.repository.IssueRepository;
import com.tracker.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class IssueService {

    private static final Logger log = LoggerFactory.getLogger(IssueService.class);
    private final IssueRepository issueRepository;
    private final UserRepository userRepository;
    private final ProjectService projectService;

    public IssueService(IssueRepository issueRepository, UserRepository userRepository, ProjectService projectService) {
        this.issueRepository = issueRepository;
        this.userRepository = userRepository;
        this.projectService = projectService;
    }

    public List<Issue> search(User user, UUID projectId, String title, Status status, Priority priority, UUID assigneeId) {
        projectService.getOwned(user, projectId); // authorization
        String t = (title == null || title.isBlank()) ? null : title.trim();
        return issueRepository.search(projectId, t, status, priority, assigneeId);
    }

    public Issue create(User user, UUID projectId, IssueRequest req) {
        Project project = projectService.getOwned(user, projectId);
        if (project.isArchived()) {
            throw new ApiException(HttpStatus.CONFLICT, "Cannot add issues to an archived project");
        }
        Issue i = new Issue();
        i.setProject(project);
        i.setTitle(req.title().trim());
        i.setDescription(req.description());
        if (req.priority() != null) i.setPriority(req.priority());
        if (req.status() != null) i.setStatus(req.status());
        applyAssignee(i, req.assigneeId());
        i = issueRepository.save(i);
        log.info("Issue created: id={} project={}", i.getId(), projectId);
        return i;
    }

    public Issue get(User user, UUID issueId) {
        Issue i = issueRepository.findById(issueId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Issue not found"));
        projectService.getOwned(user, i.getProject().getId());
        return i;
    }

    public Issue update(User user, UUID issueId, IssueRequest req) {
        Issue i = get(user, issueId);
        if (req.title() != null && !req.title().isBlank()) i.setTitle(req.title().trim());
        if (req.description() != null) i.setDescription(req.description());
        if (req.priority() != null) i.setPriority(req.priority());
        if (req.status() != null) i.setStatus(req.status());
        if (req.assigneeId() != null) applyAssignee(i, req.assigneeId());
        Issue saved = issueRepository.save(i);
        log.info("Issue updated: id={}", issueId);
        return saved;
    }

    public void delete(User user, UUID issueId) {
        Issue i = get(user, issueId);
        issueRepository.delete(i);
        log.info("Issue deleted: id={}", issueId);
    }

    private void applyAssignee(Issue issue, String assigneeId) {
        if (assigneeId == null || assigneeId.isBlank()) {
            issue.setAssignee(null);
            return;
        }
        User assignee = userRepository.findById(UUID.fromString(assigneeId))
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Assignee not found"));
        issue.setAssignee(assignee);
    }
}

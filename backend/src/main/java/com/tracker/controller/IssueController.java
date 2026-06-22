package com.tracker.controller;

import com.tracker.dto.IssueRequest;
import com.tracker.dto.IssueResponse;
import com.tracker.entity.Priority;
import com.tracker.entity.Status;
import com.tracker.entity.User;
import com.tracker.service.IssueService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class IssueController {

    private final IssueService issueService;

    public IssueController(IssueService issueService) {
        this.issueService = issueService;
    }

    @GetMapping("/projects/{projectId}/issues")
    public List<IssueResponse> list(@AuthenticationPrincipal User user,
                                    @PathVariable UUID projectId,
                                    @RequestParam(required = false) String title,
                                    @RequestParam(required = false) Status status,
                                    @RequestParam(required = false) Priority priority,
                                    @RequestParam(required = false) UUID assigneeId) {
        return issueService.search(user, projectId, title, status, priority, assigneeId)
                .stream().map(IssueResponse::from).toList();
    }

    @PostMapping("/projects/{projectId}/issues")
    public ResponseEntity<IssueResponse> create(@AuthenticationPrincipal User user,
                                                @PathVariable UUID projectId,
                                                @Valid @RequestBody IssueRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(IssueResponse.from(issueService.create(user, projectId, req)));
    }

    @GetMapping("/issues/{id}")
    public IssueResponse get(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return IssueResponse.from(issueService.get(user, id));
    }

    @PatchMapping("/issues/{id}")
    public IssueResponse update(@AuthenticationPrincipal User user, @PathVariable UUID id,
                                @RequestBody IssueRequest req) {
        return IssueResponse.from(issueService.update(user, id, req));
    }

    @DeleteMapping("/issues/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        issueService.delete(user, id);
        return ResponseEntity.noContent().build();
    }
}

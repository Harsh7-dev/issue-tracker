package com.tracker.service;

import com.tracker.dto.ProjectRequest;
import com.tracker.entity.Project;
import com.tracker.entity.User;
import com.tracker.exception.ApiException;
import com.tracker.repository.ProjectRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class
ProjectService {

    private static final Logger log = LoggerFactory.getLogger(ProjectService.class);
    private final ProjectRepository projectRepository;

    public ProjectService(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    public List<Project> listForUser(User user) {
        return projectRepository.findByOwnerId(user.getId());
    }

    public Project create(User user, ProjectRequest req) {
        Project p = new Project();
        p.setName(req.name().trim());
        p.setDescription(req.description());
        p.setOwner(user);
        p = projectRepository.save(p);
        log.info("Project created: id={} owner={}", p.getId(), user.getId());
        return p;
    }

    public Project getOwned(User user, UUID projectId) {
        Project p = projectRepository.findById(projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Project not found"));
        if (!p.getOwner().getId().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You do not have access to this project");
        }
        return p;
    }

    public Project updateName(User user, UUID projectId, ProjectRequest req) {
        Project p = getOwned(user, projectId);
        p.setName(req.name().trim());
        if (req.description() != null) p.setDescription(req.description());
        return projectRepository.save(p);
    }

    public Project archive(User user, UUID projectId) {
        Project p = getOwned(user, projectId);
        p.setArchived(true);
        Project saved = projectRepository.save(p);
        log.info("Project archived: id={}", projectId);
        return saved;
    }
}

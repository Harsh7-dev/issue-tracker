package com.tracker;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Full-stack integration test against a real PostgreSQL instance (Testcontainers).
 *
 * The JUnit suite otherwise runs on H2, which silently tolerates two Postgres-specific
 * behaviours that broke the running app:
 *   1. Reading an entity back and serializing a lazy association with open-in-view=false
 *      (LazyInitializationException on Postgres).
 *   2. An untyped null bound into lower()/concat() in the issue-search query
 *      ("function lower(bytea) does not exist" on Postgres).
 * This test reproduces both paths so they are caught in CI.
 *
 * Note: it deliberately does NOT activate the "test" profile, so the production
 * settings (open-in-view: false) are in effect. Skipped when Docker is unavailable.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@TestPropertySource(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.jwt.secret=integration-test-secret-key-long-enough-for-hs384-signing-please"
})
@EnabledIf("dockerAvailable")
class IssuePostgresIntegrationTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine");

    static boolean dockerAvailable() {
        return DockerClientFactory.instance().isDockerAvailable();
    }

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper mapper = new ObjectMapper();

    private String registerAndGetToken(String email) throws Exception {
        String body = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Tester\",\"email\":\"" + email + "\",\"password\":\"Password123!\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return mapper.readTree(body).get("token").asText();
    }

    private String idOf(String json) throws Exception {
        JsonNode node = mapper.readTree(json);
        if (node.isArray()) {
            return node.get(0).get("id").asText();
        }
        return node.get("id").asText();
    }

    @Test
    void fullProjectAndIssueLifecycle_onPostgres() throws Exception {
        String auth = "Bearer " + registerAndGetToken("pg-user@example.com");

        // Create a project.
        String projectJson = mockMvc.perform(post("/api/projects")
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Postgres Project\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String projectId = idOf(projectJson);

        // Reading entities back must serialize the lazily-loaded owner (open-in-view=false).
        mockMvc.perform(get("/api/projects").header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ownerName").value("Tester"));

        mockMvc.perform(get("/api/projects/" + projectId).header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownerName").value("Tester"));

        // Create two issues.
        mockMvc.perform(post("/api/projects/" + projectId + "/issues")
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Alpha bug\"}"))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/projects/" + projectId + "/issues")
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Beta task\",\"priority\":\"HIGH\"}"))
                .andExpect(status().isCreated());

        // Listing with NO title filter binds a null into lower()/concat() — the bytea case.
        String issuesJson = mockMvc.perform(get("/api/projects/" + projectId + "/issues")
                        .header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andReturn().getResponse().getContentAsString();

        // Title filter still works (and is case-insensitive).
        mockMvc.perform(get("/api/projects/" + projectId + "/issues")
                        .header("Authorization", auth)
                        .param("title", "alpha"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("Alpha bug"));

        // Status and priority filters.
        mockMvc.perform(get("/api/projects/" + projectId + "/issues")
                        .header("Authorization", auth)
                        .param("priority", "HIGH"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("Beta task"));

        // Get / update / delete a single issue.
        String issueId = idOf(issuesJson);
        mockMvc.perform(get("/api/issues/" + issueId).header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectId").value(projectId));

        mockMvc.perform(patch("/api/issues/" + issueId)
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DONE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DONE"));

        mockMvc.perform(delete("/api/issues/" + issueId).header("Authorization", auth))
                .andExpect(status().isNoContent());

        // Dashboard stats reflect the remaining issue.
        mockMvc.perform(get("/api/dashboard/stats").header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalProjects").value(1))
                .andExpect(jsonPath("$.totalIssues").value(1));
    }
}
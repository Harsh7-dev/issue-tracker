package com.tracker.dto;

import com.tracker.entity.User;

public record UserResponse(String id, String name, String email) {
    public static UserResponse from(User u) {
        return new UserResponse(u.getId().toString(), u.getName(), u.getEmail());
    }
}

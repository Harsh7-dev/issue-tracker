package com.tracker.service;

import com.tracker.dto.*;
import com.tracker.entity.User;
import com.tracker.exception.ApiException;
import com.tracker.repository.UserRepository;
import com.tracker.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already registered");
        }
        User user = new User();
        user.setName(req.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user = userRepository.save(user);
        log.info("User registered: id={} email={}", user.getId(), user.getEmail());
        String token = jwtService.generateToken(user.getId().toString(), user.getEmail());
        return new AuthResponse(token, UserResponse.from(user));
    }

    public AuthResponse login(LoginRequest req) {
        String email = req.email().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            log.warn("Failed login attempt for email={}", email);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        log.info("User logged in: id={} email={}", user.getId(), user.getEmail());
        String token = jwtService.generateToken(user.getId().toString(), user.getEmail());
        return new AuthResponse(token, UserResponse.from(user));
    }
}

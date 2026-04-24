package com.discord.service;

import com.discord.domain.User;
import com.discord.dto.request.LoginRequest;
import com.discord.dto.request.RegisterRequest;
import com.discord.dto.response.AuthResponse;
import com.discord.exception.ConflictException;
import com.discord.repository.UserRepository;
import com.discord.security.JwtTokenProvider;
import com.discord.security.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    AuthService authService;

    @Test
    void register_withValidData_returnsAuthResponse() {
        RegisterRequest req = new RegisterRequest("alice", "alice@example.com", "password123");

        when(userRepository.existsByEmail(req.email())).thenReturn(false);
        when(userRepository.existsByUsername(req.username())).thenReturn(false);
        when(passwordEncoder.encode(req.password())).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            ReflectionTestUtils.setField(u, "id", UUID.randomUUID());
            return u;
        });
        when(jwtTokenProvider.generateToken(any(UserPrincipal.class))).thenReturn("jwt.token.here");

        AuthResponse response = authService.register(req);

        assertThat(response.token()).isEqualTo("jwt.token.here");
        assertThat(response.user().username()).isEqualTo("alice");
        assertThat(response.user().email()).isEqualTo("alice@example.com");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_withDuplicateEmail_throwsConflictException() {
        RegisterRequest req = new RegisterRequest("alice", "taken@example.com", "password123");
        when(userRepository.existsByEmail(req.email())).thenReturn(true);

        assertThatThrownBy(() -> authService.register(req))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("Email");

        verify(userRepository, never()).save(any());
    }

    @Test
    void register_withDuplicateUsername_throwsConflictException() {
        RegisterRequest req = new RegisterRequest("taken", "new@example.com", "password123");
        when(userRepository.existsByEmail(req.email())).thenReturn(false);
        when(userRepository.existsByUsername(req.username())).thenReturn(true);

        assertThatThrownBy(() -> authService.register(req))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("Username");

        verify(userRepository, never()).save(any());
    }

    @Test
    void login_withValidCredentials_returnsAuthResponse() {
        LoginRequest req = new LoginRequest("alice@example.com", "password123");

        User user = buildUser("alice", req.email());
        when(userRepository.findByEmail(req.email())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(req.password(), user.getPasswordHash())).thenReturn(true);
        when(jwtTokenProvider.generateToken(any(UserPrincipal.class))).thenReturn("jwt.token.here");

        AuthResponse response = authService.login(req);

        assertThat(response.token()).isEqualTo("jwt.token.here");
        assertThat(response.user().email()).isEqualTo(req.email());
    }

    @Test
    void login_withUnknownEmail_throwsBadCredentials() {
        LoginRequest req = new LoginRequest("nobody@example.com", "password123");
        when(userRepository.findByEmail(req.email())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(req))
            .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void login_withWrongPassword_throwsBadCredentials() {
        LoginRequest req = new LoginRequest("alice@example.com", "wrong");
        User user = buildUser("alice", req.email());
        when(userRepository.findByEmail(req.email())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(req))
            .isInstanceOf(BadCredentialsException.class);
    }

    private User buildUser(String username, String email) {
        User user = new User();
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(user, "username", username);
        ReflectionTestUtils.setField(user, "email", email);
        ReflectionTestUtils.setField(user, "passwordHash", "hashed_password");
        return user;
    }
}

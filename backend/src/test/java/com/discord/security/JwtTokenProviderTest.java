package com.discord.security;

import com.discord.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private JwtTokenProvider tokenProvider;

    // Base64-encoded 256-bit key used only in tests
    private static final String TEST_SECRET =
        "ZGlzY29yZC1jbG9uZS1zZWNyZXQta2V5LWZvci1qd3QtYXV0aGVudGljYXRpb24tMjAyNDAxMDE=";

    @BeforeEach
    void setUp() {
        tokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(tokenProvider, "jwtSecret", TEST_SECRET);
        ReflectionTestUtils.setField(tokenProvider, "jwtExpirationMs", 86_400_000L);
    }

    @Test
    void generateToken_producesNonBlankToken() {
        String token = tokenProvider.generateToken(buildPrincipal());
        assertThat(token).isNotBlank();
    }

    @Test
    void validateToken_withValidToken_returnsTrue() {
        String token = tokenProvider.generateToken(buildPrincipal());
        assertThat(tokenProvider.validateToken(token)).isTrue();
    }

    @Test
    void getUserIdFromToken_returnsCorrectUserId() {
        UserPrincipal principal = buildPrincipal();
        String token = tokenProvider.generateToken(principal);
        UUID extracted = tokenProvider.getUserIdFromToken(token);
        assertThat(extracted).isEqualTo(principal.getId());
    }

    @Test
    void validateToken_withTamperedToken_returnsFalse() {
        String token = tokenProvider.generateToken(buildPrincipal());
        String tampered = token.substring(0, token.length() - 4) + "XXXX";
        assertThat(tokenProvider.validateToken(tampered)).isFalse();
    }

    @Test
    void validateToken_withExpiredToken_returnsFalse() {
        ReflectionTestUtils.setField(tokenProvider, "jwtExpirationMs", -1000L);
        String token = tokenProvider.generateToken(buildPrincipal());
        assertThat(tokenProvider.validateToken(token)).isFalse();
    }

    @Test
    void validateToken_withGarbageString_returnsFalse() {
        assertThat(tokenProvider.validateToken("not.a.jwt")).isFalse();
    }

    private UserPrincipal buildPrincipal() {
        User user = new User();
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(user, "username", "testuser");
        ReflectionTestUtils.setField(user, "email", "test@example.com");
        ReflectionTestUtils.setField(user, "passwordHash", "hashed");
        return UserPrincipal.from(user);
    }
}

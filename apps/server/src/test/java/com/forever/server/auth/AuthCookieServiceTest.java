package com.forever.server.auth;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;

import static org.junit.jupiter.api.Assertions.*;

class AuthCookieServiceTest {

    @Test
    void build_withDomain_setsAllAttributes() {
        AuthCookieService svc = new AuthCookieService(".f.example.com", true);
        ResponseCookie c = svc.build("abc123", 30 * 24 * 3600);

        assertEquals(AuthCookieService.COOKIE_NAME, c.getName());
        assertEquals("abc123", c.getValue());
        assertTrue(c.isHttpOnly());
        assertTrue(c.isSecure());
        assertEquals("Lax", c.getSameSite());
        assertEquals("/", c.getPath());
        assertEquals(".f.example.com", c.getDomain());
        assertEquals(30 * 24 * 3600, c.getMaxAge().toSeconds());
    }

    @Test
    void build_emptyDomain_domainIsNull() {
        AuthCookieService svc = new AuthCookieService("", true);
        ResponseCookie c = svc.build("xyz", 3600);

        assertEquals(AuthCookieService.COOKIE_NAME, c.getName());
        assertEquals("xyz", c.getValue());
        assertTrue(c.isHttpOnly());
        assertTrue(c.isSecure());
        assertEquals("Lax", c.getSameSite());
        assertEquals("/", c.getPath());
        assertNull(c.getDomain());
        assertEquals(3600, c.getMaxAge().toSeconds());
    }

    @Test
    void expired_maxAgeIsZero() {
        AuthCookieService svc = new AuthCookieService(".f.example.com", true);
        ResponseCookie c = svc.expired();

        assertEquals(AuthCookieService.COOKIE_NAME, c.getName());
        assertEquals(0, c.getMaxAge().toSeconds());
        assertTrue(c.isHttpOnly());
        assertTrue(c.isSecure());
    }

    @Test
    void build_secureFalse_omitsSecureAttribute() {
        // 本地 HTTP + 局域网 IP 开发：cookie 不能带 Secure，否则浏览器直接丢弃
        AuthCookieService svc = new AuthCookieService("", false);
        ResponseCookie c = svc.build("dev-token", 3600);

        assertFalse(c.isSecure());
        assertTrue(c.isHttpOnly());
        assertFalse(svc.expired().isSecure());
    }
}

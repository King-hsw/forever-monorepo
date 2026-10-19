package com.forever.server.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

/**
 * 父域 HttpOnly refresh cookie 构造服务。
 * cookie 名 {@value #COOKIE_NAME},属性恒为 HttpOnly + Secure + SameSite=Lax + Path=/;
 * Domain 取配置 {@code forever.auth.cookie-domain}(空则省略,本地 localhost 跨端口天然共享)。
 */
@Service
public class AuthCookieService {

    public static final String COOKIE_NAME = "forever_refresh";

    private final String domain;

    public AuthCookieService(@Value("${forever.auth.cookie-domain:}") String domain) {
        this.domain = domain;
    }

    /**
     * 构造登录/轮换时种入的 refresh cookie。
     *
     * @param refreshToken    明文 refresh token(仅出现一次)
     * @param maxAgeSeconds   cookie 有效期秒数(与 refresh token 一致)
     */
    public ResponseCookie build(String refreshToken, long maxAgeSeconds) {
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, refreshToken)
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path("/")
                .maxAge(java.time.Duration.ofSeconds(maxAgeSeconds))
                .build();
        if (domain != null && !domain.isBlank()) {
            cookie = ResponseCookie.from(COOKIE_NAME, refreshToken)
                    .httpOnly(true)
                    .secure(true)
                    .sameSite("Lax")
                    .path("/")
                    .domain(domain)
                    .maxAge(java.time.Duration.ofSeconds(maxAgeSeconds))
                    .build();
        }
        return cookie;
    }

    /**
     * 登出时清空 cookie(maxAge=0,浏览器立即删除)。
     */
    public ResponseCookie expired() {
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();
        if (domain != null && !domain.isBlank()) {
            cookie = ResponseCookie.from(COOKIE_NAME, "")
                    .httpOnly(true)
                    .secure(true)
                    .sameSite("Lax")
                    .path("/")
                    .domain(domain)
                    .maxAge(0)
                    .build();
        }
        return cookie;
    }
}

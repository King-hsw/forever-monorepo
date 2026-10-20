package com.forever.server.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

/**
 * 父域 HttpOnly refresh cookie 构造服务。
 * cookie 名 {@value #COOKIE_NAME},属性恒为 HttpOnly + SameSite=Lax + Path=/,Secure 由配置控制;
 * Domain 取配置 {@code forever.auth.cookie-domain}(空则省略,本地 localhost 跨端口天然共享);
 * Secure 取 {@code forever.auth.cookie-secure}(默认 true;本地 HTTP+局域网 IP 开发设 false,否则浏览器丢弃)。
 */
@Service
public class AuthCookieService {

    public static final String COOKIE_NAME = "forever_refresh";

    private final String domain;
    private final boolean secure;

    public AuthCookieService(@Value("${forever.auth.cookie-domain:}") String domain,
                             @Value("${forever.auth.cookie-secure:true}") boolean secure) {
        this.domain = domain;
        this.secure = secure;
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
                .secure(secure)
                .sameSite("Lax")
                .path("/")
                .maxAge(java.time.Duration.ofSeconds(maxAgeSeconds))
                .build();
        if (domain != null && !domain.isBlank()) {
            cookie = ResponseCookie.from(COOKIE_NAME, refreshToken)
                    .httpOnly(true)
                    .secure(secure)
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
                .secure(secure)
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();
        if (domain != null && !domain.isBlank()) {
            cookie = ResponseCookie.from(COOKIE_NAME, "")
                    .httpOnly(true)
                    .secure(secure)
                    .sameSite("Lax")
                    .path("/")
                    .domain(domain)
                    .maxAge(0)
                    .build();
        }
        return cookie;
    }
}

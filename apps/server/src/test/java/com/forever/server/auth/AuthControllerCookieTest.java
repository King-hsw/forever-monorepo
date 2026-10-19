package com.forever.server.auth;

import com.forever.server.common.BizException;
import com.forever.server.common.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * AuthController cookie 行为测试:login 种 cookie、refresh 双模(body/cookie)、logout 清 cookie。
 */
class AuthControllerCookieTest {

    private TokenService tokenService;
    private AuthService authService;
    private AuthCookieService cookieService;
    private AuthController controller;

    @BeforeEach
    void setUp() {
        tokenService = mock(TokenService.class);
        authService = mock(AuthService.class);
        cookieService = new AuthCookieService("");
        controller = new AuthController(authService, tokenService, cookieService);
    }

    // ---------- login ----------

    @Test
    void login_setsCookieWithRefreshToken() {
        LoginResponse tokens = new LoginResponse("access-1", "refresh-1", 7200, 2592000);
        when(authService.login(any(), anyString())).thenReturn(tokens);

        MockHttpServletResponse res = new MockHttpServletResponse();
        var result = controller.login(new LoginRequest("admin", "pwd"), new MockHttpServletRequest(), res);

        // 响应体仍含 refreshToken(窗口期兼容)
        assertEquals("refresh-1", result.data().refreshToken());
        // Set-Cookie 种入
        var cookieHeader = res.getHeader("Set-Cookie");
        assertNotNull(cookieHeader);
        assertTrue(cookieHeader.contains("forever_refresh=refresh-1"));
        assertTrue(cookieHeader.contains("HttpOnly"));
        assertTrue(cookieHeader.contains("Secure"));
        assertTrue(cookieHeader.contains("SameSite=Lax"));
    }

    // ---------- refresh: body 流(旧行为回归) ----------

    @Test
    void refresh_withBody_returnsNewRefresh() {
        LoginResponse tokens = new LoginResponse("access-2", "refresh-2", 7200, 2592000);
        when(tokenService.rotate("refresh-1")).thenReturn(tokens);

        MockHttpServletResponse res = new MockHttpServletResponse();
        var result = controller.refresh(new AuthController.RefreshRequest("refresh-1"), res, null);

        // 旧行为:body 有 refreshToken → 响应体含新 refresh
        assertEquals("refresh-2", result.data().refreshToken());
        // 也种 cookie(保持两应用 cookie 同步)
        assertNotNull(res.getHeader("Set-Cookie"));
    }

    // ---------- refresh: cookie 流(新行为) ----------

    @Test
    void refresh_withCookieOnly_bodyRefreshIsNull() {
        LoginResponse tokens = new LoginResponse("access-3", "refresh-3", 7200, 2592000);
        when(tokenService.rotate("refresh-1")).thenReturn(tokens);

        MockHttpServletResponse res = new MockHttpServletResponse();
        // body 无 refreshToken,cookie 有
        var result = controller.refresh(new AuthController.RefreshRequest(null), res, "refresh-1");

        // 响应体 refreshToken 置 null(防 XSS 偷换)
        assertNull(result.data().refreshToken());
        // Set-Cookie 写回新值
        var cookieHeader = res.getHeader("Set-Cookie");
        assertNotNull(cookieHeader);
        assertTrue(cookieHeader.contains("forever_refresh=refresh-3"));
    }

    // ---------- refresh: 无 body 无 cookie → 401 ----------

    @Test
    void refresh_noBodyNoCookie_throwsUnauthorized() {
        assertThrows(BizException.class, () ->
                controller.refresh(new AuthController.RefreshRequest(null), new MockHttpServletResponse(), null)
        );
    }

    // ---------- logout: cookie 流 ----------

    @Test
    void logout_withCookie_clearsCookie() {
        MockHttpServletResponse res = new MockHttpServletResponse();
        controller.logout(new AuthController.RefreshRequest(null), res, "refresh-1");

        // revoke 被调
        verify(tokenService).revokeByRefreshToken("refresh-1");
        // Set-Cookie maxAge=0
        var cookieHeader = res.getHeader("Set-Cookie");
        assertNotNull(cookieHeader);
        assertTrue(cookieHeader.contains("Max-Age=0"));
    }

    @Test
    void logout_withBody_revokesFromBody() {
        MockHttpServletResponse res = new MockHttpServletResponse();
        controller.logout(new AuthController.RefreshRequest("refresh-1"), res, null);

        verify(tokenService).revokeByRefreshToken("refresh-1");
    }
}

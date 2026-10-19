package com.forever.server.auth;

import com.forever.server.common.ApiResponse;
import com.forever.server.common.BizException;
import com.forever.server.common.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@Tag(name = "认证", description = "登录认证，登录成功后用返回的 JWT 访问 /api/admin/** 接口")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final TokenService tokenService;
    private final AuthCookieService cookieService;

    @Operation(summary = "登录", description = "用户名密码登录,种父域 HttpOnly refresh cookie")
    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request,
                                             HttpServletRequest httpReq,
                                             HttpServletResponse httpRes) {
        LoginResponse tokens = authService.login(request, clientIp(httpReq));
        // 种 cookie(窗口期兼容:响应体仍含 refreshToken)
        httpRes.addHeader("Set-Cookie",
                cookieService.build(tokens.refreshToken(), Duration.ofSeconds(7 * 24 * 3600).toSeconds())
                        .toString());
        return ApiResponse.ok(tokens);
    }

    @Operation(summary = "续期", description = "cookie 流或 body 流 refresh,轮换回写 cookie")
    @PostMapping("/refresh")
    public ApiResponse<LoginResponse> refresh(@RequestBody(required = false) RefreshRequest body,
                                              HttpServletResponse httpRes,
                                              @CookieValue(value = AuthCookieService.COOKIE_NAME, required = false) String cookieToken) {
        // 双模:body 有 token 用 body 流(旧前端兼容);否则用 cookie 流
        String refreshToken = (body != null && body.token() != null && !body.token().isBlank())
                ? body.token()
                : cookieToken;
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new BizException(ErrorCode.UNAUTHORIZED, "无有效 refresh 凭据");
        }

        LoginResponse tokens = tokenService.rotate(refreshToken);
        // 轮换回写 cookie
        httpRes.addHeader("Set-Cookie",
                cookieService.build(tokens.refreshToken(), Duration.ofSeconds(7 * 24 * 3600).toSeconds())
                        .toString());
        // cookie 流:响应体 refreshToken 置 null(安全);body 流:保留(旧前端兼容)
        LoginResponse responseBody = (body != null && body.token() != null && !body.token().isBlank())
                ? tokens
                : new LoginResponse(tokens.accessToken(), null, tokens.expiresIn(), tokens.refreshExpiresIn());
        return ApiResponse.ok(responseBody);
    }

    @Operation(summary = "登出", description = "清 cookie + 使 refresh token 失效")
    @PostMapping("/logout")
    public ApiResponse<Void> logout(@RequestBody(required = false) RefreshRequest body,
                                     HttpServletResponse httpRes,
                                     @CookieValue(value = AuthCookieService.COOKIE_NAME, required = false) String cookieToken) {
        String refreshToken = (body != null && body.token() != null && !body.token().isBlank())
                ? body.token()
                : cookieToken;
        if (refreshToken != null && !refreshToken.isBlank()) {
            tokenService.revokeByRefreshToken(refreshToken);
        }
        // 清 cookie
        httpRes.addHeader("Set-Cookie", cookieService.expired().toString());
        return ApiResponse.ok(null);
    }

    // ---------- 内部 DTO ----------

    public record RefreshRequest(String token) {}

    // ---------- 工具 ----------

    private static String clientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}

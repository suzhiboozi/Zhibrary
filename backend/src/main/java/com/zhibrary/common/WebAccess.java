package com.zhibrary.common;

import jakarta.servlet.http.*;
import java.util.Set;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class WebAccess implements WebMvcConfigurer {
    private final Access access;
    public WebAccess(Access access) { this.access = access; }
    @Override public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
                if (req.getMethod().equals("OPTIONS")) return true;
                String path = req.getRequestURI();
                boolean write = !Set.of("GET", "HEAD").contains(req.getMethod());
                String origin = req.getHeader("Origin");
                if (write && origin != null && !Set.of("http://localhost:5173", "http://127.0.0.1:5173").contains(origin))
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Request origin is not allowed.");
                if (path.startsWith("/api/admin") || (path.startsWith("/api/books") && write)) access.librarian(req);
                if (path.startsWith("/api/borrow")) access.user(req);
                return true;
            }
        }).addPathPatterns("/api/**");
    }
}

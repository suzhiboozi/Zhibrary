package com.zhibrary.common;

import com.zhibrary.user.*;
import jakarta.servlet.http.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class Access {
    public static final String USER_ID = "libraryUserId";
    private final UserRepository users;
    public Access(UserRepository users) { this.users = users; }
    public User user(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        Object id = session == null ? null : session.getAttribute(USER_ID);
        if (!(id instanceof Long)) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in to continue.");
        return users.findById((Long) id).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in again."));
    }
    public void librarian(HttpServletRequest request) {
        if (user(request).getRole() != UserRole.LIBRARIAN) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Librarian access is required.");
    }
    public void owner(HttpServletRequest request, String username) {
        User user = user(request);
        if (!user.getUsername().equals(username) && user.getRole() != UserRole.LIBRARIAN)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only manage your own loans.");
    }
}

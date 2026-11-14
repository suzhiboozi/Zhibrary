package com.zhibrary.auth;

import com.zhibrary.common.Access;
import com.zhibrary.user.*;
import jakarta.servlet.http.*;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins={"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials="true")
public class AuthController {
    private final UserRepository users;
    private final Access access;
    public AuthController(UserRepository users, Access access) { this.users=users; this.access=access; }
    @org.springframework.transaction.annotation.Transactional
    @PostMapping("/login") public ResponseEntity<?> login(@RequestBody Map<String,String> p, HttpServletRequest request) {
        String key=required(p,"username"); String password=required(p,"password");
        User u=users.lockByLogin(key).orElse(null);
        if(u==null || !Passwords.matches(password,u.getPassword())) return ResponseEntity.status(401).body(Map.of("message","Invalid credentials"));
        if (!u.getPassword().startsWith("pbkdf2$")) { u.setPassword(Passwords.hash(password)); users.save(u); }
        HttpSession old=request.getSession(false); if(old!=null) old.invalidate();
        request.getSession(true).setAttribute(Access.USER_ID,u.getId());
        return ResponseEntity.ok(profile(u));
    }
    @GetMapping("/me") public Map<String,Object> me(HttpServletRequest request) { return profile(access.user(request)); }
    @PostMapping("/logout") public ResponseEntity<?> logout(HttpServletRequest request) {
        HttpSession session=request.getSession(false); if(session!=null) session.invalidate();
        return ResponseEntity.noContent().build();
    }
    @PostMapping("/register") public ResponseEntity<?> register(@RequestBody Map<String,String> p) {
        String username=required(p,"username"); String email=required(p,"email"); String password=required(p,"password");
        if(!username.matches("[A-Za-z0-9_.-]{3,64}")) throw new IllegalArgumentException("Username must be 3–64 letters, numbers, dots, underscores or hyphens.");
        if(!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) throw new IllegalArgumentException("Enter a valid email address.");
        if(password.length()<8 || password.length()>128) throw new IllegalArgumentException("Password must be 8–128 characters.");
        if(users.findByUsername(username).isPresent() || users.findByEmail(email).isPresent()) return ResponseEntity.status(409).body(Map.of("message","Username or email already exists"));
        User u=users.save(new User(required(p,"firstName"),p.getOrDefault("middleName",""),required(p,"lastName"),email,username,Passwords.hash(password),UserRole.USER));
        return ResponseEntity.ok(Map.of("username",u.getUsername(),"role",u.getRole().name()));
    }
    private String required(Map<String,String> p,String key) {
        String value=p.get(key);
        if(value==null || value.isBlank() || value.length()>255) throw new IllegalArgumentException("A valid "+key+" is required.");
        return key.equals("password") ? value : value.trim();
    }
    private Map<String,Object> profile(User u) { return Map.of("username",u.getUsername(),"name",u.getFirstName()+" "+u.getLastName(),"role",u.getRole().name(),"fine",u.getOutstandingFine()); }
}

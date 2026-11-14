package com.zhibrary.borrow;

import com.zhibrary.book.*;
import com.zhibrary.common.Access;
import com.zhibrary.user.*;
import com.zhibrary.waitlist.*;
import jakarta.servlet.http.HttpServletRequest;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/borrow")
@CrossOrigin(origins={"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials="true")
public class BorrowController {
    private final UserRepository users;
    private final BookRepository books;
    private final BorrowRepository records;
    private final WaitlistRepository waitlist;
    private final Access access;
    private final com.zhibrary.fine.FineService fines;
    private final com.zhibrary.approval.BorrowApprovalService approvals;
    private final com.zhibrary.approval.BorrowRequestRepository requests;
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;
    public BorrowController(UserRepository u,BookRepository b,BorrowRepository r,WaitlistRepository w,Access a,com.zhibrary.approval.BorrowApprovalService s,com.zhibrary.approval.BorrowRequestRepository requests,com.zhibrary.fine.FineService fines) { users=u; books=b; records=r; waitlist=w; access=a; approvals=s; this.requests=requests; this.fines=fines; }
    @GetMapping("/{username}") public List<BorrowRecord> history(@PathVariable String username,HttpServletRequest request) {
        access.owner(request,username);
        return records.findByUserUsernameOrderByBorrowedDateDesc(username);
    }
    @GetMapping("/requests/{username}") public List<com.zhibrary.approval.BorrowRequest> requests(@PathVariable String username,HttpServletRequest request) {
        access.owner(request,username); return requests.findByUserUsernameOrderByIdDesc(username);
    }
    @PostMapping public ResponseEntity<?> borrow(@RequestBody Map<String,String> p,HttpServletRequest request) {
        access.owner(request,p.get("username"));
        return ResponseEntity.accepted().body(approvals.request(p.get("username"),bookId(p),p.get("durationDays"),p.get("returnDate")));
    }
    @Transactional
    @PostMapping("/waitlist") public ResponseEntity<?> join(@RequestBody Map<String,String> p,HttpServletRequest request) {
        User u=users.lockByUsername(p.get("username")).orElseThrow();
        entityManager.refresh(u);
        access.owner(request,u.getUsername());
        Book b=books.lockById(bookId(p)).orElseThrow();
        if(b.getStatus()!=BookStatus.BORROWED) return bad("Only borrowed books can be waitlisted.");
        if(records.findByUserUsernameOrderByBorrowedDateDesc(u.getUsername()).stream().anyMatch(r->r.getStatus()==BorrowStatus.ACTIVE && r.getBook().getId().equals(b.getId()))) return bad("You already have this book on loan.");
        if(waitlist.existsByUserUsernameAndBookIdAndClaimedFalse(u.getUsername(),b.getId()))
            return ResponseEntity.status(409).body(Map.of("message","You are already on this waitlist."));
        return ResponseEntity.ok(waitlist.save(new WaitlistEntry(u,b)));
    }
    @Transactional
    @PostMapping("/{id}/return") public BorrowRecord returnBook(@PathVariable Long id,HttpServletRequest request) {
        BorrowRecord r=records.lockById(id).orElseThrow();
        access.owner(request,r.getUser().getUsername());
        User u=users.lockByUsername(r.getUser().getUsername()).orElseThrow();
        entityManager.refresh(u);
        Book b=books.lockById(r.getBook().getId()).orElseThrow();
        if(r.getStatus()==BorrowStatus.RETURNED) return r;
        var calculation=fines.calculate(r.getDueDate(),LocalDate.now());
        double fine=calculation.total().doubleValue();
        r.returnBook(LocalDate.now(),fine); u.addFine(fine); b.setStatus(BookStatus.AVAILABLE);
        return r;
    }
    private Long bookId(Map<String,String> p) {
        try { long id=Long.parseLong(p.getOrDefault("bookId","")); if(id>0) return id; }
        catch(NumberFormatException e) { /* report validation below */ }
        throw new IllegalArgumentException("A valid book ID is required.");
    }
    private ResponseEntity<?> bad(String message) { return ResponseEntity.badRequest().body(Map.of("message",message)); }
}

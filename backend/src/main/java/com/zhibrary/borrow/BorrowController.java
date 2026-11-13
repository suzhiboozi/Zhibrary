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
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;
    public BorrowController(UserRepository u,BookRepository b,BorrowRepository r,WaitlistRepository w,Access a) { users=u; books=b; records=r; waitlist=w; access=a; }
    @GetMapping("/{username}") public List<BorrowRecord> history(@PathVariable String username,HttpServletRequest request) {
        access.owner(request,username);
        return records.findByUserUsernameOrderByBorrowedDateDesc(username);
    }
    @Transactional
    @PostMapping public ResponseEntity<?> borrow(@RequestBody Map<String,String> p,HttpServletRequest request) {
        User u=users.lockByUsername(p.get("username")).orElseThrow();
        entityManager.refresh(u);
        access.owner(request,u.getUsername());
        Book b=books.lockById(bookId(p)).orElseThrow();
        List<BorrowRecord> active=records.findByUserUsernameOrderByBorrowedDateDesc(u.getUsername()).stream().filter(x->x.getStatus()==BorrowStatus.ACTIVE).toList();
        if(active.size()>=3 || u.getOutstandingFine()>0 || active.stream().anyMatch(x->x.getDueDate().isBefore(LocalDate.now())))
            return bad("Borrowing is unavailable while your limit, fine, or overdue status is unresolved.");
        if(b.getStatus()!=BookStatus.AVAILABLE) return bad("Book is not available; join the waitlist instead.");
        b.setStatus(BookStatus.BORROWED);
        waitlist.findByUserUsernameOrderByRequestedDateDesc(u.getUsername()).stream()
            .filter(e->e.getBook().getId().equals(b.getId())&&!e.isClaimed()).forEach(WaitlistEntry::claim);
        return ResponseEntity.ok(records.save(new BorrowRecord(u,b,LocalDate.now(),LocalDate.now().plusDays(7))));
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
        double fine=Math.max(0,ChronoUnit.DAYS.between(r.getDueDate(),LocalDate.now()))*10;
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

package com.zhibrary.approval;

import com.zhibrary.book.*;
import com.zhibrary.borrow.*;
import com.zhibrary.user.*;
import com.zhibrary.waitlist.*;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BorrowApprovalService {
    private final UserRepository users;
    private final BookRepository books;
    private final BorrowRepository loans;
    private final BorrowRequestRepository requests;
    private final WaitlistRepository waitlist;
    @PersistenceContext private EntityManager em;
    public BorrowApprovalService(UserRepository u,BookRepository b,BorrowRepository l,BorrowRequestRepository r,WaitlistRepository w) { users=u;books=b;loans=l;requests=r;waitlist=w; }
    @Transactional public BorrowRequest request(String username,Long bookId,String duration,String returnDate) {
        User user=users.lockByUsername(username).orElseThrow(); em.refresh(user);
        Book book=books.lockById(bookId).orElseThrow();
        eligible(user,book);
        if(requests.existsByUserUsernameAndBookIdAndStatus(username,bookId,BorrowRequest.Status.PENDING)) throw new ResponseStatusException(HttpStatus.CONFLICT,"You already have a pending request for this book.");
        Integer days=null; LocalDate date=null;
        if(returnDate!=null && !returnDate.isBlank()) {
            if(duration!=null && !duration.isBlank()) throw new IllegalArgumentException("Choose a duration or a return date, not both.");
            try { date=LocalDate.parse(returnDate); } catch(java.time.DateTimeException e) { throw new IllegalArgumentException("Enter a valid return date."); }
            validateDate(date);
        } else {
            try { days=duration==null ? 7 : Integer.valueOf(duration); } catch(NumberFormatException e) { throw new IllegalArgumentException("Duration must be a whole number from 1 to 7 days."); }
            if(days<1 || days>7) throw new IllegalArgumentException("Duration must be between 1 and 7 days.");
        }
        return requests.save(new BorrowRequest(user,book,days,date));
    }
    @Transactional public BorrowRequest approve(Long id) {
        BorrowRequest request=requests.lockById(id).orElseThrow();
        if(request.getStatus()==BorrowRequest.Status.APPROVED) return request;
        if(request.getStatus()!=BorrowRequest.Status.PENDING) throw new ResponseStatusException(HttpStatus.CONFLICT,"This request has already been rejected.");
        User user=users.lockByUsername(request.getUser().getUsername()).orElseThrow(); em.refresh(user);
        Book book=books.lockById(request.getBook().getId()).orElseThrow(); em.refresh(book);
        eligible(user,book);
        LocalDate due=request.getRequestedReturnDate();
        if(due!=null) validateDate(due);
        else due=LocalDate.now().plusDays(request.getDurationDays());
        book.setStatus(BookStatus.BORROWED);
        BorrowRecord loan=loans.save(new BorrowRecord(user,book,LocalDate.now(),due));
        waitlist.findByUserUsernameOrderByRequestedDateDesc(user.getUsername()).stream().filter(e->e.getBook().getId().equals(book.getId())&&!e.isClaimed()).forEach(WaitlistEntry::claim);
        request.approve(loan); return request;
    }
    @Transactional public BorrowRequest reject(Long id) {
        BorrowRequest request=requests.lockById(id).orElseThrow();
        if(request.getStatus()==BorrowRequest.Status.APPROVED) throw new ResponseStatusException(HttpStatus.CONFLICT,"An approved loan cannot be rejected. Use the return workflow.");
        if(request.getStatus()!=BorrowRequest.Status.REJECTED) request.reject();return request;
    }
    private void validateDate(LocalDate date) {
        if(!date.isAfter(LocalDate.now()) || date.isAfter(LocalDate.now().plusDays(7))) throw new IllegalArgumentException("Return date must be from tomorrow through seven days from today. If the requested date has passed, reject this request so the member can submit a new one.");
    }
    private void eligible(User user,Book book) {
        List<BorrowRecord> active=loans.findByUserUsernameOrderByBorrowedDateDesc(user.getUsername()).stream().filter(l->l.getStatus()==BorrowStatus.ACTIVE).toList();
        if(active.size()>=3 || user.getOutstandingFine()>0 || active.stream().anyMatch(l->l.getDueDate().isBefore(LocalDate.now()))) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Borrowing is unavailable while your limit, fine, or overdue status is unresolved.");
        if(book.getStatus()!=BookStatus.AVAILABLE) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"This book is no longer available. Review the request again after it is returned, or reject it.");
    }
}

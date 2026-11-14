package com.zhibrary.approval;

import com.zhibrary.book.Book;
import com.zhibrary.borrow.BorrowRecord;
import com.zhibrary.user.User;
import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name="borrow_requests")
public class BorrowRequest {
    public enum Status { PENDING, APPROVED, REJECTED }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional=false) private User user;
    @ManyToOne(optional=false) private Book book;
    @Column(nullable=false) private LocalDate requestedDate=LocalDate.now();
    private LocalDate reviewedDate;
    private Integer durationDays;
    private LocalDate requestedReturnDate;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private Status status=Status.PENDING;
    @ManyToOne private BorrowRecord loan;
    protected BorrowRequest() {}
    public BorrowRequest(User user,Book book,Integer days,LocalDate returnDate) { this.user=user; this.book=book; this.durationDays=days; this.requestedReturnDate=returnDate; }
    public Integer getDurationDays() { return requestedReturnDate == null ? (durationDays == null ? 7 : durationDays) : null; }
    public LocalDate getRequestedReturnDate() { return requestedReturnDate; }
    public Long getId() { return id; }
    public User getUser() { return user; }
    public Book getBook() { return book; }
    public LocalDate getRequestedDate() { return requestedDate; }
    public LocalDate getReviewedDate() { return reviewedDate; }
    public Status getStatus() { return status; }
    public BorrowRecord getLoan() { return loan; }
    public void approve(BorrowRecord loan) { this.loan=loan; status=Status.APPROVED; reviewedDate=LocalDate.now(); }
    public void reject() { status=Status.REJECTED; reviewedDate=LocalDate.now(); }
}

package com.zhibrary.fine;
import com.zhibrary.borrow.BorrowRecord;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
@Entity @Table(name="fine_adjustments")
public class FineAdjustment {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional=false) private BorrowRecord loan;
    @Column(nullable=false,precision=10,scale=2) private BigDecimal previousFine;
    @Column(nullable=false,precision=10,scale=2) private BigDecimal newFine;
    @Column(nullable=false) private String reason;
    @Column(nullable=false) private String librarian;
    @Column(nullable=false) private LocalDateTime adjustedAt=LocalDateTime.now();
    protected FineAdjustment() {}
    public FineAdjustment(BorrowRecord loan,BigDecimal previous,BigDecimal next,String reason,String librarian) { this.loan=loan;previousFine=previous;newFine=next;this.reason=reason;this.librarian=librarian; }
    public Long getId() { return id; }
    public BorrowRecord getLoan() { return loan; }
    public BigDecimal getPreviousFine() { return previousFine; }
    public BigDecimal getNewFine() { return newFine; }
    public String getReason() { return reason; }
    public String getLibrarian() { return librarian; }
    public LocalDateTime getAdjustedAt() { return adjustedAt; }
}

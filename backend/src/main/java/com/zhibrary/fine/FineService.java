package com.zhibrary.fine;

import com.zhibrary.borrow.*;
import com.zhibrary.user.*;
import jakarta.persistence.*;
import java.math.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FineService {
    private final FinePolicyRepository policies;
    private final BorrowRepository loans;
    private final UserRepository users;
    private final FineAdjustmentRepository adjustments;
    @PersistenceContext private EntityManager em;
    public FineService(FinePolicyRepository p,BorrowRepository l,UserRepository u,FineAdjustmentRepository a) { policies=p;loans=l;users=u;adjustments=a; }
    public BigDecimal dailyRate() { return policies.findById(1L).map(FinePolicy::getDailyRate).orElse(new BigDecimal("10.00")); }
    @Transactional public BigDecimal setRate(BigDecimal amount) {
        amount=money(amount,new BigDecimal("10000.00"));
        FinePolicy policy=policies.findById(1L).orElseGet(()->new FinePolicy(BigDecimal.TEN));
        policy.setDailyRate(amount);policies.save(policy);return amount;
    }
    public record Calculation(long overdueDays,BigDecimal dailyRate,BigDecimal total) {}
    public Calculation calculate(LocalDate dueDate,LocalDate returnDate) {
        if(dueDate==null || returnDate==null) throw new IllegalArgumentException("Due date and return date are required.");
        long days=Math.max(0,ChronoUnit.DAYS.between(dueDate,returnDate));
        BigDecimal rate=dailyRate();return new Calculation(days,rate,rate.multiply(BigDecimal.valueOf(days)).setScale(2));
    }
    @Transactional public BorrowRecord adjust(Long id,BigDecimal amount,String reason,String librarian) {
        amount=money(amount,new BigDecimal("1000000.00"));
        if(reason==null || reason.isBlank() || reason.length()>255) throw new IllegalArgumentException("Enter an adjustment reason of 1–255 characters.");
        BorrowRecord loan=loans.lockById(id).orElseThrow();
        if(loan.getStatus()!=BorrowStatus.RETURNED) throw new IllegalArgumentException("Return the book before adjusting its assessed fine.");
        User user=users.lockByUsername(loan.getUser().getUsername()).orElseThrow();em.refresh(user);
        BigDecimal previous=BigDecimal.valueOf(loan.getFine()).setScale(2,RoundingMode.HALF_UP);
        BigDecimal delta=amount.subtract(previous);
        if(BigDecimal.valueOf(user.getOutstandingFine()).add(delta).signum()<0) throw new IllegalArgumentException("This adjustment would make the member’s balance negative.");
        if(delta.signum()!=0) {
            user.addFine(delta.doubleValue());loan.setFine(amount.doubleValue());
            adjustments.save(new FineAdjustment(loan,previous,amount,reason.trim(),librarian));
        }
        return loan;
    }
    private BigDecimal money(BigDecimal value,BigDecimal max) {
        if(value==null || value.signum()<0 || value.compareTo(max)>0 || value.stripTrailingZeros().scale()>2) throw new IllegalArgumentException("Enter an amount from 0 to "+max+" with at most two decimal places.");
        return value.setScale(2);
    }
}

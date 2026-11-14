package com.zhibrary.fine;
import jakarta.persistence.*;
import java.math.BigDecimal;
@Entity @Table(name="fine_policy")
public class FinePolicy {
    @Id private Long id=1L;
    @Version private Long version;
    @Column(nullable=false,precision=10,scale=2) private BigDecimal dailyRate=BigDecimal.TEN;
    protected FinePolicy() {}
    public FinePolicy(BigDecimal rate) { dailyRate=rate; }
    public BigDecimal getDailyRate() { return dailyRate; }
    public void setDailyRate(BigDecimal rate) { dailyRate=rate; }
}

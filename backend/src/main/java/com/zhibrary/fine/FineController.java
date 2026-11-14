package com.zhibrary.fine;

import com.zhibrary.borrow.*;
import com.zhibrary.common.Access;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/admin/fines")
@CrossOrigin(origins={"http://localhost:5173","http://127.0.0.1:5173"},allowCredentials="true")
public class FineController {
    private final FineService service;
    private final BorrowRepository loans;
    private final FineAdjustmentRepository adjustments;
    private final Access access;
    public FineController(FineService s,BorrowRepository l,FineAdjustmentRepository a,Access access) {service=s;loans=l;adjustments=a;this.access=access;}
    public record RateInput(BigDecimal dailyRate) {}
    public record CalculationInput(LocalDate dueDate,LocalDate returnDate) {}
    public record AdjustmentInput(BigDecimal amount,String reason) {}
    @GetMapping("/policy") public Map<String,BigDecimal> policy() {return Map.of("dailyRate",service.dailyRate());}
    @PutMapping("/policy") public Map<String,BigDecimal> policy(@RequestBody RateInput input) {return Map.of("dailyRate",service.setRate(input.dailyRate()));}
    @PostMapping("/calculate") public FineService.Calculation calculate(@RequestBody CalculationInput input) {return service.calculate(input.dueDate(),input.returnDate());}
    @GetMapping("/loans") public List<BorrowRecord> returned() {return loans.findByStatus(BorrowStatus.RETURNED);}
    @GetMapping("/adjustments") public List<FineAdjustment> history() {return adjustments.findTop50ByOrderByIdDesc();}
    @PostMapping("/loans/{id}/adjust") public BorrowRecord adjust(@PathVariable Long id,@RequestBody AdjustmentInput input,HttpServletRequest request) {return service.adjust(id,input.amount(),input.reason(),access.user(request).getUsername());}
}

package com.zhibrary.approval;

import java.util.List;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/admin/borrow-requests")
@CrossOrigin(origins={"http://localhost:5173","http://127.0.0.1:5173"}, allowCredentials="true")
public class BorrowApprovalController {
    private final BorrowRequestRepository requests;
    private final BorrowApprovalService service;
    public BorrowApprovalController(BorrowRequestRepository requests,BorrowApprovalService service) { this.requests=requests;this.service=service; }
    @GetMapping public List<BorrowRequest> pending() { return requests.findByStatusOrderByRequestedDateAscIdAsc(BorrowRequest.Status.PENDING); }
    @PostMapping("/{id}/approve") public BorrowRequest approve(@PathVariable Long id) { return service.approve(id); }
    @PostMapping("/{id}/reject") public BorrowRequest reject(@PathVariable Long id) { return service.reject(id); }
}

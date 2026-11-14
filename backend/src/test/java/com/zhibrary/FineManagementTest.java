package com.zhibrary;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zhibrary.book.*;
import com.zhibrary.borrow.*;
import com.zhibrary.common.Access;
import com.zhibrary.fine.*;
import com.zhibrary.user.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:fines-test;DB_CLOSE_DELAY=-1","spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc
class FineManagementTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired BookRepository books;
    @Autowired BorrowRepository loans;
    @Autowired FinePolicyRepository policies;
    @Autowired FineAdjustmentRepository adjustments;
    MockHttpSession session(User user) {var s=new MockHttpSession();s.setAttribute(Access.USER_ID,user.getId());return s;}
    MockHttpSession staff() {return session(users.findByUsername("admin").orElseThrow());}
    ResultActions body(MockHttpServletRequestBuilder req,Object body) throws Exception {return mvc.perform(req.contentType("application/json").content(json.writeValueAsString(body)));}
    @BeforeEach void resetPolicy() {policies.deleteAll();}
    BorrowRecord loan(int overdueDays) {
        String name=UUID.randomUUID().toString();User u=users.save(new User("Test","","Reader",name+"@test.local",name,"password",UserRole.USER));
        Book b=new Book("Fine Test",UUID.randomUUID().toString(),"Writer","Fiction",2024,"");b.setStatus(BookStatus.BORROWED);books.save(b);
        return loans.save(new BorrowRecord(u,b,LocalDate.now().minusDays(10),LocalDate.now().minusDays(overdueDays)));
    }
    @Test void dailyRateIsSavedAndProtected() throws Exception {
        mvc.perform(get("/api/admin/fines/policy").session(staff())).andExpect(status().isOk()).andExpect(jsonPath("$.dailyRate").value(10));
        mvc.perform(get("/api/admin/fines/policy")).andExpect(status().isUnauthorized());
        body(put("/api/admin/fines/policy").session(session(users.findByUsername("member").orElseThrow())),Map.of("dailyRate",25)).andExpect(status().isForbidden());
        body(put("/api/admin/fines/policy").session(staff()),Map.of("dailyRate",new BigDecimal("25.50"))).andExpect(status().isOk());
        assertThat(policies.findById(1L).orElseThrow().getDailyRate()).isEqualByComparingTo("25.50");
    }
    @Test void calculatorUsesSavedRateAndDoesNotCreateCharges() throws Exception {
        body(put("/api/admin/fines/policy").session(staff()),Map.of("dailyRate",new BigDecimal("12.75"))).andExpect(status().isOk());
        long count=loans.count();
        for(int days:new int[]{-1,0,3}) {
            body(post("/api/admin/fines/calculate").session(staff()),Map.of("dueDate","2026-11-10","returnDate",LocalDate.of(2026,11,10).plusDays(days).toString())).andExpect(status().isOk()).andExpect(jsonPath("$.overdueDays").value(Math.max(0,days))).andExpect(jsonPath("$.total").value(Math.max(0,days)*12.75));
        }
        assertThat(loans.count()).isEqualTo(count);
    }
    @Test void returnUsesSavedRateAndRateChangesDoNotRewriteAssessedFine() throws Exception {
        BorrowRecord r=loan(2);
        body(put("/api/admin/fines/policy").session(staff()),Map.of("dailyRate",new BigDecimal("25.50"))).andExpect(status().isOk());
        mvc.perform(post("/api/borrow/"+r.getId()+"/return").session(session(r.getUser()))).andExpect(status().isOk()).andExpect(jsonPath("$.fine").value(51));
        body(put("/api/admin/fines/policy").session(staff()),Map.of("dailyRate",0)).andExpect(status().isOk());
        mvc.perform(post("/api/borrow/"+r.getId()+"/return").session(session(r.getUser()))).andExpect(status().isOk()).andExpect(jsonPath("$.fine").value(51));
        assertThat(users.findById(r.getUser().getId()).orElseThrow().getOutstandingFine()).isEqualTo(51);
        BorrowRecord free=loan(3);mvc.perform(post("/api/borrow/"+free.getId()+"/return").session(session(free.getUser()))).andExpect(jsonPath("$.fine").value(0));
    }
    @Test void adjustmentsUpdateBalanceAndKeepAnAuditWithoutDoubleApplying() throws Exception {
        BorrowRecord r=loan(3);mvc.perform(post("/api/borrow/"+r.getId()+"/return").session(staff())).andExpect(status().isOk());
        long before=adjustments.count();
        for(int i=0;i<2;i++) body(post("/api/admin/fines/loans/"+r.getId()+"/adjust").session(staff()),Map.of("amount",new BigDecimal("15.25"),"reason","Partial waiver")).andExpect(status().isOk()).andExpect(jsonPath("$.fine").value(15.25));
        assertThat(users.findById(r.getUser().getId()).orElseThrow().getOutstandingFine()).isEqualTo(15.25);
        assertThat(adjustments.count()).isEqualTo(before+1);
        var audit=adjustments.findTop50ByOrderByIdDesc().getFirst();assertThat(audit.getReason()).isEqualTo("Partial waiver");assertThat(audit.getLibrarian()).isEqualTo("admin");assertThat(audit.getPreviousFine()).isEqualByComparingTo("30.00");
        body(post("/api/admin/fines/loans/"+r.getId()+"/adjust").session(staff()),Map.of("amount",0,"reason","Full waiver")).andExpect(status().isOk());
        assertThat(users.findById(r.getUser().getId()).orElseThrow().getOutstandingFine()).isZero();
    }
    @Test void invalidRatesAndAdjustmentsAreRejected() throws Exception {
        for(BigDecimal value:List.of(new BigDecimal("-1"),new BigDecimal("10000.01"),new BigDecimal("1.001"))) body(put("/api/admin/fines/policy").session(staff()),Map.of("dailyRate",value)).andExpect(status().isBadRequest());
        body(put("/api/admin/fines/policy").session(staff()),Map.of()).andExpect(status().isBadRequest());
        body(post("/api/admin/fines/calculate").session(staff()),Map.of("dueDate","bad","returnDate","2026-01-01")).andExpect(status().isBadRequest());
        BorrowRecord active=loan(2);
        body(post("/api/admin/fines/loans/"+active.getId()+"/adjust").session(staff()),Map.of("amount",5,"reason","Not yet returned")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/borrow/"+active.getId()+"/return").session(staff())).andExpect(status().isOk());
        body(post("/api/admin/fines/loans/"+active.getId()+"/adjust").session(staff()),Map.of("amount",5,"reason"," ")).andExpect(status().isBadRequest());
        body(post("/api/admin/fines/loans/"+active.getId()+"/adjust").session(session(active.getUser())),Map.of("amount",0,"reason","Self waiver")).andExpect(status().isForbidden());
        assertThat(users.findById(active.getUser().getId()).orElseThrow().getOutstandingFine()).isEqualTo(20);
    }
}

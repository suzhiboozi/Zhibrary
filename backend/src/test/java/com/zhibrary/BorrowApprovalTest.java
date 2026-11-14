package com.zhibrary;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zhibrary.approval.*;
import com.zhibrary.book.*;
import com.zhibrary.borrow.*;
import com.zhibrary.common.Access;
import com.zhibrary.user.*;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:approval-test;DB_CLOSE_DELAY=-1","spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc
class BorrowApprovalTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired BookRepository books;
    @Autowired BorrowRepository loans;
    @Autowired BorrowRequestRepository requests;
    MockHttpSession session(User u) { var s=new MockHttpSession();s.setAttribute(Access.USER_ID,u.getId());return s; }
    MockHttpSession staff() {return session(users.findByUsername("admin").orElseThrow());}
    User user() {String id=UUID.randomUUID().toString();return users.save(new User("Test","","Member",id+"@test.local",id,"password",UserRole.USER));}
    Book book() {return books.save(new Book("Requested Book",UUID.randomUUID().toString(),"Writer","Fiction",2024,""));}
    ResultActions submit(User u,Book b) throws Exception {return mvc.perform(post("/api/borrow").session(session(u)).contentType("application/json").content(json.writeValueAsString(java.util.Map.of("username",u.getUsername(),"bookId",b.getId().toString()))));}
    long pending(User u,Book b) throws Exception {return json.readTree(submit(u,b).andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString()).get("id").asLong();}
    @Test void requestingPersistsPendingWithoutCreatingALoanOrReservingBook() throws Exception {
        User u=user(); Book b=book();long id=pending(u,b);
        assertThat(requests.findById(id).orElseThrow().getStatus()).isEqualTo(BorrowRequest.Status.PENDING);
        assertThat(loans.findByUserUsernameOrderByBorrowedDateDesc(u.getUsername())).isEmpty();
        assertThat(books.findById(b.getId()).orElseThrow().getStatus()).isEqualTo(BookStatus.AVAILABLE);
        mvc.perform(get("/api/borrow/requests/"+u.getUsername()).session(session(u))).andExpect(jsonPath("$[0].status").value("PENDING")).andExpect(jsonPath("$[0].loan").isEmpty()).andExpect(jsonPath("$[0].user.password").doesNotExist());
        mvc.perform(get("/api/borrow/requests/"+u.getUsername()).session(session(user()))).andExpect(status().isForbidden());
    }
    @Test void onlyLibrariansCanReviewRequests() throws Exception {
        User u=user();long id=pending(u,book());
        mvc.perform(get("/api/admin/borrow-requests")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/borrow-requests/"+id+"/approve").session(session(u))).andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/borrow-requests/"+id+"/reject").session(session(u))).andExpect(status().isForbidden());
        assertThat(requests.findById(id).orElseThrow().getStatus()).isEqualTo(BorrowRequest.Status.PENDING);
    }
    @Test void approvalUsesRequestedDurationAndCannotCreateDuplicateLoans() throws Exception {
        User u=user();Book b=book();long id=pending(u,b);
        for(int i=0;i<2;i++) mvc.perform(post("/api/admin/borrow-requests/"+id+"/approve").session(staff())).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("APPROVED")).andExpect(jsonPath("$.loan.dueDate").value(LocalDate.now().plusDays(7).toString()));
        var history=loans.findByUserUsernameOrderByBorrowedDateDesc(u.getUsername());assertThat(history).hasSize(1);
        assertThat(history.getFirst().getBorrowedDate()).isEqualTo(LocalDate.now());
        assertThat(books.findById(b.getId()).orElseThrow().getStatus()).isEqualTo(BookStatus.BORROWED);
        mvc.perform(post("/api/admin/borrow-requests/"+id+"/reject").session(staff())).andExpect(status().isConflict());
    }
    @Test void rejectedRequestsDoNotCreateLoansAndCanBeRequestedAgain() throws Exception {
        User u=user();Book b=book();long id=pending(u,b);
        mvc.perform(post("/api/admin/borrow-requests/"+id+"/reject").session(staff())).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REJECTED"));
        mvc.perform(post("/api/admin/borrow-requests/"+id+"/approve").session(staff())).andExpect(status().isConflict());
        assertThat(loans.findByUserUsernameOrderByBorrowedDateDesc(u.getUsername())).isEmpty();
        assertThat(books.findById(b.getId()).orElseThrow().getStatus()).isEqualTo(BookStatus.AVAILABLE);
        submit(u,b).andExpect(status().isAccepted());
    }
    @Test void duplicatePendingRequestsAndDeletingRequestedBooksAreBlocked() throws Exception {
        User u=user();Book b=book();pending(u,b);submit(u,b).andExpect(status().isConflict());
        assertThat(requests.findByUserUsernameOrderByIdDesc(u.getUsername())).hasSize(1);
        mvc.perform(delete("/api/books/"+b.getId()).session(staff())).andExpect(status().isConflict());
    }
    @Test void approvalRechecksFinesAndAvailabilityWithoutMutatingPendingRequest() throws Exception {
        User u=user();Book b=book();long id=pending(u,b);u.addFine(10);users.save(u);
        mvc.perform(post("/api/admin/borrow-requests/"+id+"/approve").session(staff())).andExpect(status().isBadRequest());
        assertThat(requests.findById(id).orElseThrow().getStatus()).isEqualTo(BorrowRequest.Status.PENDING);
        assertThat(loans.findByUserUsernameOrderByBorrowedDateDesc(u.getUsername())).isEmpty();
        User other=user();Book next=book();long second=pending(other,next);next.setStatus(BookStatus.UNDER_MAINTENANCE);books.save(next);
        mvc.perform(post("/api/admin/borrow-requests/"+second+"/approve").session(staff())).andExpect(status().isBadRequest());
        assertThat(requests.findById(second).orElseThrow().getStatus()).isEqualTo(BorrowRequest.Status.PENDING);
    }
    long scheduled(User u,Book b,java.util.Map<String,String> schedule) throws Exception {
        var body=new java.util.HashMap<String,String>(schedule);body.put("username",u.getUsername());body.put("bookId",b.getId().toString());
        var result=mvc.perform(post("/api/borrow").session(session(u)).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isAccepted()).andReturn();
        return json.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }
    @Test void requestedDurationControlsApprovedDueDate() throws Exception {
        User u=user();long id=scheduled(u,book(),java.util.Map.of("durationDays","3"));
        assertThat(requests.findById(id).orElseThrow().getDurationDays()).isEqualTo(3);
        mvc.perform(post("/api/admin/borrow-requests/"+id+"/approve").session(staff())).andExpect(status().isOk()).andExpect(jsonPath("$.loan.dueDate").value(LocalDate.now().plusDays(3).toString()));
    }
    @Test void specificReturnDateIsPreservedOnApproval() throws Exception {
        LocalDate date=LocalDate.now().plusDays(4);long id=scheduled(user(),book(),java.util.Map.of("returnDate",date.toString()));
        mvc.perform(post("/api/admin/borrow-requests/"+id+"/approve").session(staff())).andExpect(status().isOk()).andExpect(jsonPath("$.loan.dueDate").value(date.toString()));
    }
    @Test void invalidAndOverlongSchedulesAreRejectedBeforeSaving() throws Exception {
        User u=user();Book b=book();
        var schedules=java.util.List.of(java.util.Map.of("durationDays","0"),java.util.Map.of("durationDays","8"),java.util.Map.of("durationDays","1.5"),java.util.Map.of("returnDate",LocalDate.now().toString()),java.util.Map.of("returnDate",LocalDate.now().plusDays(8).toString()),java.util.Map.of("returnDate","not-a-date"),java.util.Map.of("durationDays","3","returnDate",LocalDate.now().plusDays(3).toString()));
        for(var schedule:schedules) {
            var body=new java.util.HashMap<String,String>(schedule);body.put("username",u.getUsername());body.put("bookId",b.getId().toString());
            mvc.perform(post("/api/borrow").session(session(u)).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
        }
        assertThat(requests.findByUserUsernameOrderByIdDesc(u.getUsername())).isEmpty();
    }
    @Test void expiredFixedDateCannotBeApproved() throws Exception {
        long id=scheduled(user(),book(),java.util.Map.of("returnDate",LocalDate.now().plusDays(1).toString()));
        var request=requests.findById(id).orElseThrow();
        org.springframework.test.util.ReflectionTestUtils.setField(request,"requestedReturnDate",LocalDate.now().minusDays(1));requests.save(request);
        mvc.perform(post("/api/admin/borrow-requests/"+id+"/approve").session(staff())).andExpect(status().isBadRequest());
        assertThat(requests.findById(id).orElseThrow().getStatus()).isEqualTo(BorrowRequest.Status.PENDING);
    }

}

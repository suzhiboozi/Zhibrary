package com.zhibrary;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zhibrary.auth.Passwords;
import com.zhibrary.book.*;
import com.zhibrary.borrow.*;
import com.zhibrary.common.Access;
import com.zhibrary.user.*;
import com.zhibrary.waitlist.WaitlistRepository;
import java.util.*;
import java.util.concurrent.*;
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

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:regression-test;DB_CLOSE_DELAY=-1", "spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureMockMvc
class ApiRegressionTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired BookRepository books;
    @Autowired BorrowRepository loans;
    @Autowired WaitlistRepository waitlist;
    MockHttpSession session(User user) { var s=new MockHttpSession(); s.setAttribute(Access.USER_ID,user.getId()); return s; }
    MockHttpSession staff() { return session(users.findByUsername("admin").orElseThrow()); }
    User member() { String name="reader"+UUID.randomUUID(); return users.save(new User("Test","","Reader",name+"@test.local",name,"testpass123",UserRole.USER)); }
    Book book() { return books.save(new Book("Test Story",UUID.randomUUID().toString(),"Writer","Fiction",2024,"")); }
    MockHttpServletRequestBuilder payload(MockHttpServletRequestBuilder request,Map<?,?> body) throws Exception { return request.contentType("application/json").content(json.writeValueAsString(body)); }
    Map<String,String> borrowing(User user,Book book) { return Map.of("username",user.getUsername(),"bookId",book.getId().toString()); }

    @Test void anonymousAndMemberCannotUseStaffEndpoints() throws Exception {
        mvc.perform(get("/api/admin/summary")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/books").contentType("application/json").content("{}")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/members").session(session(member()))).andExpect(status().isForbidden());
        mvc.perform(delete("/api/books/"+book().getId()).session(session(member()))).andExpect(status().isForbidden());
        mvc.perform(get("/api/books")).andExpect(status().isOk());
    }
    @Test void memberCannotReadOrReturnAnotherMembersLoan() throws Exception {
        User owner=member(), other=member(); Book b=book();
        mvc.perform(payload(post("/api/borrow").session(session(owner)),borrowing(owner,b))).andExpect(status().isOk());
        var loan=loans.findByUserUsernameOrderByBorrowedDateDesc(owner.getUsername()).getFirst();
        mvc.perform(get("/api/borrow/"+owner.getUsername()).session(session(other))).andExpect(status().isForbidden());
        mvc.perform(post("/api/borrow/"+loan.getId()+"/return").session(session(other))).andExpect(status().isForbidden());
        mvc.perform(payload(post("/api/borrow").session(session(other)),borrowing(owner,book()))).andExpect(status().isForbidden());
        assertThat(loans.findById(loan.getId()).orElseThrow().getStatus()).isEqualTo(BorrowStatus.ACTIVE);
    }
    @Test void invalidInputAndMissingRecordsHaveUsefulClientErrors() throws Exception {
        mvc.perform(post("/api/books").session(staff()).contentType("application/json").content("{}")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isString());
        mvc.perform(post("/api/books").session(staff()).contentType("application/json").content("{broken")).andExpect(status().isBadRequest());
        mvc.perform(patch("/api/books/99999999/status?value=AVAILABLE").session(staff())).andExpect(status().isNotFound());
        mvc.perform(patch("/api/books/1/status?value=WRONG").session(staff())).andExpect(status().isBadRequest());
        User u=member();
        mvc.perform(payload(post("/api/borrow").session(session(u)),Map.of("username",u.getUsername(),"bookId","wrong"))).andExpect(status().isBadRequest());
        mvc.perform(payload(post("/api/borrow").session(session(u)),Map.of("username",u.getUsername(),"bookId","99999999"))).andExpect(status().isNotFound());
        mvc.perform(post("/api/borrow/99999999/return").session(session(u))).andExpect(status().isNotFound());
    }
    @Test void registrationValidationDuplicateAndPasswordPrivacy() throws Exception {
        String name="account"+UUID.randomUUID();
        Map<String,String> body=new HashMap<>(Map.of("firstName","Test","lastName","Reader","username",name,"email",name+"@test.local","password","testpass123"));
        mvc.perform(payload(post("/api/auth/register"),body)).andExpect(status().isOk());
        User user=users.findByUsername(name).orElseThrow();
        assertThat(user.getPassword()).startsWith("pbkdf2$"); assertThat(Passwords.matches("testpass123",user.getPassword())).isTrue();
        mvc.perform(payload(post("/api/auth/register"),body)).andExpect(status().isConflict());
        body.put("username","ab"); mvc.perform(payload(post("/api/auth/register"),body)).andExpect(status().isBadRequest());
        body.put("username","validname"); body.put("email","bad"); mvc.perform(payload(post("/api/auth/register"),body)).andExpect(status().isBadRequest());
        body.put("email","new@test.local"); body.put("password","short"); mvc.perform(payload(post("/api/auth/register"),body)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/members").session(staff())).andExpect(status().isOk()).andExpect(jsonPath("$[*].password").isEmpty());
    }
    @Test void realLoginRestoresSessionLogoutAndRejectsWrongPassword() throws Exception {
        User user=member();
        mvc.perform(payload(post("/api/auth/login"),Map.of("username",user.getUsername(),"password","wrong"))).andExpect(status().isUnauthorized());
        mvc.perform(payload(post("/api/auth/login"),Map.of())).andExpect(status().isBadRequest());
        var response=mvc.perform(payload(post("/api/auth/login"),Map.of("username",user.getEmail(),"password","testpass123"))).andExpect(status().isOk()).andReturn();
        var session=(MockHttpSession)response.getRequest().getSession(false);
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.username").value(user.getUsername()));
        assertThat(users.findById(user.getId()).orElseThrow().getPassword()).startsWith("pbkdf2$");
        mvc.perform(post("/api/auth/logout").session(session)).andExpect(status().isNoContent());
        assertThat(session.isInvalid()).isTrue();
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }
    @Test void activeLoansAndHistoryCannotBeCorruptedThroughCatalogue() throws Exception {
        User u=member(); Book b=book();
        mvc.perform(payload(post("/api/borrow").session(session(u)),borrowing(u,b))).andExpect(status().isOk());
        mvc.perform(patch("/api/books/"+b.getId()+"/status?value=AVAILABLE").session(staff())).andExpect(status().isConflict());
        mvc.perform(delete("/api/books/"+b.getId()).session(staff())).andExpect(status().isConflict());
        Book fresh=book();
        mvc.perform(patch("/api/books/"+fresh.getId()+"/status?value=BORROWED").session(staff())).andExpect(status().isBadRequest());
        assertThat(books.findById(b.getId()).orElseThrow().getStatus()).isEqualTo(BookStatus.BORROWED);
        mvc.perform(get("/api/borrow/"+u.getUsername()).session(session(u))).andExpect(jsonPath("$[0].user.password").doesNotExist());
    }
    @Test void duplicateWaitlistOwnLoanAndLostBooksAreRejected() throws Exception {
        User owner=member(),reader=member(); Book b=book();
        mvc.perform(payload(post("/api/borrow").session(session(owner)),borrowing(owner,b))).andExpect(status().isOk());
        mvc.perform(payload(post("/api/borrow/waitlist").session(session(owner)),borrowing(owner,b))).andExpect(status().isBadRequest());
        mvc.perform(payload(post("/api/borrow/waitlist").session(session(reader)),borrowing(reader,b))).andExpect(status().isOk());
        mvc.perform(payload(post("/api/borrow/waitlist").session(session(reader)),borrowing(reader,b))).andExpect(status().isConflict());
        assertThat(waitlist.findByUserUsernameOrderByRequestedDateDesc(reader.getUsername())).hasSize(1);
        Book lost=book(); lost.setStatus(BookStatus.LOST); books.save(lost);
        mvc.perform(payload(post("/api/borrow/waitlist").session(session(reader)),borrowing(reader,lost))).andExpect(status().isBadRequest());
    }
    @Test void duplicateIsbnUpdateSearchAndBookIdentityAreSafe() throws Exception {
        Book original=book();
        Map<String,Object> body=new HashMap<>(Map.of("title","A Unique Search Story","author","Some Writer","isbn",original.getIsbn(),"category","Fiction","publicationYear",2024));
        mvc.perform(payload(post("/api/books").session(staff()),body)).andExpect(status().isConflict());
        body.put("isbn",UUID.randomUUID().toString()); body.put("id",original.getId()); body.put("status","BORROWED");
        var response=mvc.perform(payload(post("/api/books").session(staff()),body)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("AVAILABLE")).andReturn();
        long id=json.readTree(response.getResponse().getContentAsString()).get("id").asLong(); assertThat(id).isNotEqualTo(original.getId());
        body.put("title","Updated Story");
        mvc.perform(payload(put("/api/books/"+id).session(staff()),body)).andExpect(status().isOk());
        assertThat(books.findById(id).orElseThrow().getTitle()).isEqualTo("Updated Story");
        mvc.perform(get("/api/books").param("query","  updated story  ")).andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(id));
        body.put("publicationYear",-1); mvc.perform(payload(put("/api/books/"+id).session(staff()),body)).andExpect(status().isBadRequest());
        assertThat(books.findById(id).orElseThrow().getPublicationYear()).isEqualTo(2024);
    }
    @Test void crossSiteWritesAreRejected() throws Exception {
        mvc.perform(post("/api/auth/logout").header("Origin","https://untrusted.example").session(staff())).andExpect(status().isForbidden());
    }
    @Test void concurrentBorrowsCannotCheckOutOneCopyTwice() throws Exception {
        Book b=book(); User first=member(),second=member();
        try(var executor=Executors.newFixedThreadPool(2)) {
            var start=new CountDownLatch(1);
            List<Future<Integer>> futures=new ArrayList<>();
            for(User user:List.of(first,second)) futures.add(executor.submit(()->{ start.await(); return mvc.perform(payload(post("/api/borrow").session(session(user)),borrowing(user,b))).andReturn().getResponse().getStatus(); }));
            start.countDown();
            List<Integer> statuses=new ArrayList<>(); for(var f:futures) statuses.add(f.get(15,TimeUnit.SECONDS));
            assertThat(statuses).containsExactlyInAnyOrder(200,400);
        }
        assertThat(loans.findAll().stream().filter(r->r.getBook().getId().equals(b.getId()) && r.getStatus()==BorrowStatus.ACTIVE)).hasSize(1);
    }
    @Test void concurrentBorrowsRespectTheThreeLoanLimit() throws Exception {
        User user=member();
        for(int i=0;i<2;i++) mvc.perform(payload(post("/api/borrow").session(session(user)),borrowing(user,book()))).andExpect(status().isOk());
        List<Book> candidates=List.of(book(),book());
        try(var executor=Executors.newFixedThreadPool(2)) {
            var start=new CountDownLatch(1); List<Future<Integer>> futures=new ArrayList<>();
            for(Book b:candidates) futures.add(executor.submit(()->{ start.await(); return mvc.perform(payload(post("/api/borrow").session(session(user)),borrowing(user,b))).andReturn().getResponse().getStatus(); }));
            start.countDown(); List<Integer> statuses=new ArrayList<>(); for(var f:futures) statuses.add(f.get(15,TimeUnit.SECONDS));
            assertThat(statuses).containsExactlyInAnyOrder(200,400);
        }
        assertThat(loans.findByUserUsernameOrderByBorrowedDateDesc(user.getUsername())).hasSize(3);
    }
    @Test void concurrentReturnsKeepBothFines() throws Exception {
        User user=member(); List<BorrowRecord> records=new ArrayList<>();
        for(int i=0;i<2;i++) {
            Book b=book(); b.setStatus(BookStatus.BORROWED); books.save(b);
            records.add(loans.save(new BorrowRecord(user,b,java.time.LocalDate.now().minusDays(10),java.time.LocalDate.now().minusDays(2))));
        }
        try(var executor=Executors.newFixedThreadPool(2)) {
            var start=new CountDownLatch(1); List<Future<Integer>> futures=new ArrayList<>();
            for(BorrowRecord record:records) futures.add(executor.submit(()->{ start.await(); return mvc.perform(post("/api/borrow/"+record.getId()+"/return").session(session(user))).andReturn().getResponse().getStatus(); }));
            start.countDown(); for(var f:futures) assertThat(f.get(15,TimeUnit.SECONDS)).isEqualTo(200);
        }
        assertThat(users.findById(user.getId()).orElseThrow().getOutstandingFine()).isEqualTo(40);
    }

    @Test void bothLocalPreviewOriginsWorkForStaffRequests() throws Exception {
        for(String origin:List.of("http://127.0.0.1:5173","http://localhost:5173")) {
            mvc.perform(get("/api/admin/summary").header("Origin",origin).session(staff())).andExpect(status().isOk());
            mvc.perform(payload(post("/api/books").header("Origin",origin).session(staff()),Map.of("title","Origin Test","isbn",UUID.randomUUID().toString(),"author","Writer","category","Fiction","publicationYear",2024))).andExpect(status().isOk());
        }
    }

}

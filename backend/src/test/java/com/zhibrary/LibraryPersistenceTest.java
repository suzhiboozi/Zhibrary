package com.zhibrary;

import com.zhibrary.book.*;
import com.zhibrary.borrow.*;
import com.zhibrary.user.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import com.zhibrary.common.Access;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:library-test;DB_CLOSE_DELAY=-1",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureMockMvc
class LibraryPersistenceTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired BookRepository books;
    @Autowired UserRepository users;
    @Autowired BorrowRepository records;
    @Autowired com.zhibrary.waitlist.WaitlistRepository waitlist;

    @Autowired WebApplicationContext context;
    MockHttpSession session(User user) {
        MockHttpSession session=new MockHttpSession(); session.setAttribute(Access.USER_ID,user.getId()); return session;
    }
    @BeforeEach void authenticateStaff() {
        mvc=MockMvcBuilders.webAppContextSetup(context).defaultRequest(get("/").session(session(users.findByUsername("admin").orElseThrow()))).build();
    }
    User member() {
        String id = UUID.randomUUID().toString();
        return users.save(new User("Test", "", "Reader", id+"@test.local", id, "test", UserRole.USER));
    }
    Book book() {
        return books.save(new Book("Persistence Test", UUID.randomUUID().toString(), "Test Author", "Fiction", 2024, ""));
    }
    void borrow(User user, Book book, int status) throws Exception {
        mvc.perform(post("/api/borrow").session(session(user)).contentType("application/json")
            .content(json.writeValueAsString(Map.of("username", user.getUsername(), "bookId", book.getId().toString()))))
            .andExpect(status().is(status));
    }
    @Test void bookCreationUpdateAndDeletionArePersisted() throws Exception {
        String isbn = UUID.randomUUID().toString();
        var response = mvc.perform(post("/api/books").contentType("application/json").content(json.writeValueAsString(
            Map.of("title", "New Story", "isbn", isbn, "author", "A Writer", "category", "Fiction", "publicationYear", 2024))))
            .andExpect(status().isOk()).andReturn();
        long id = json.readTree(response.getResponse().getContentAsString()).get("id").asLong();
        assertThat(books.findById(id).orElseThrow().getTitle()).isEqualTo("New Story");
        mvc.perform(patch("/api/books/"+id+"/status?value=UNDER_MAINTENANCE")).andExpect(status().isOk());
        assertThat(books.findById(id).orElseThrow().getStatus()).isEqualTo(BookStatus.UNDER_MAINTENANCE);
        mvc.perform(delete("/api/books/"+id)).andExpect(status().isNoContent());
        assertThat(books.findById(id)).isEmpty();
    }
    @Test void borrowAndReturnUpdateInventoryAndHistory() throws Exception {
        User u = member(); Book b = book(); borrow(u,b,200);
        assertThat(books.findById(b.getId()).orElseThrow().getStatus()).isEqualTo(BookStatus.BORROWED);
        var loan = records.findByUserUsernameOrderByBorrowedDateDesc(u.getUsername()).getFirst();
        assertThat(loan.getDueDate()).isEqualTo(LocalDate.now().plusDays(7));
        mvc.perform(get("/api/borrow/"+u.getUsername())).andExpect(jsonPath("$[0].status").value("ACTIVE"));
        mvc.perform(post("/api/borrow/"+loan.getId()+"/return")).andExpect(status().isOk());
        assertThat(books.findById(b.getId()).orElseThrow().getStatus()).isEqualTo(BookStatus.AVAILABLE);
        assertThat(records.findById(loan.getId()).orElseThrow().getStatus()).isEqualTo(BorrowStatus.RETURNED);
    }
    @Test void lateReturnPersistsFineAndRepeatedReturnDoesNotChargeAgain() throws Exception {
        User u = member(); Book b = book(); b.setStatus(BookStatus.BORROWED); books.save(b);
        var loan = records.save(new BorrowRecord(u,b,LocalDate.now().minusDays(10),LocalDate.now().minusDays(3)));
        for(int i=0;i<2;i++) mvc.perform(post("/api/borrow/"+loan.getId()+"/return")).andExpect(status().isOk());
        assertThat(users.findById(u.getId()).orElseThrow().getOutstandingFine()).isEqualTo(30);
        assertThat(records.findById(loan.getId()).orElseThrow().getFine()).isEqualTo(30);
        borrow(u,book(),400);
    }
    @Test void unavailableBookAndLoanLimitDoNotMutateInventory() throws Exception {
        User u=member(); Book b=book(); borrow(u,b,200); borrow(member(),b,400);
        borrow(u,book(),200); borrow(u,book(),200);
        Book fourth=book(); borrow(u,fourth,400);
        assertThat(books.findById(fourth.getId()).orElseThrow().getStatus()).isEqualTo(BookStatus.AVAILABLE);
        assertThat(records.findByUserUsernameOrderByBorrowedDateDesc(u.getUsername())).hasSize(3);
    }
    @Test void waitlistIsPersistedAndAvailableBooksAreRejected() throws Exception {
        User u=member(); Book b=book(); borrow(member(),b,200);
        long before = waitlist.count();
        mvc.perform(post("/api/borrow/waitlist").contentType("application/json").content(json.writeValueAsString(
            Map.of("username",u.getUsername(),"bookId",b.getId().toString())))).andExpect(status().isOk()).andExpect(jsonPath("$.id").isNumber());
        assertThat(waitlist.count()).isEqualTo(before + 1);
        Book available=book();
        mvc.perform(post("/api/borrow/waitlist").contentType("application/json").content(json.writeValueAsString(
            Map.of("username",u.getUsername(),"bookId",available.getId().toString())))).andExpect(status().isBadRequest());
        assertThat(waitlist.count()).isEqualTo(before + 1);
    }
    @Test void adminSummaryReflectsBorrowAndReturn() throws Exception {
        User u=member(); Book b=book();
        long availableBefore=books.countByStatus(BookStatus.AVAILABLE);
        long borrowedBefore=books.countByStatus(BookStatus.BORROWED);
        borrow(u,b,200);
        mvc.perform(get("/api/admin/summary")).andExpect(status().isOk())
            .andExpect(jsonPath("$.available").value(availableBefore-1))
            .andExpect(jsonPath("$.borrowed").value(borrowedBefore+1));
        var loan=records.findByUserUsernameOrderByBorrowedDateDesc(u.getUsername()).getFirst();
        mvc.perform(post("/api/borrow/"+loan.getId()+"/return")).andExpect(status().isOk());
        mvc.perform(get("/api/admin/summary")).andExpect(status().isOk())
            .andExpect(jsonPath("$.available").value(availableBefore))
            .andExpect(jsonPath("$.borrowed").value(borrowedBefore));
    }
    @Test void overdueLoanBlocksAnotherBorrowWithoutChangingData() throws Exception {
        User u=member(); Book old=book(); old.setStatus(BookStatus.BORROWED); books.save(old);
        records.save(new BorrowRecord(u,old,LocalDate.now().minusDays(9),LocalDate.now().minusDays(2)));
        Book next=book(); borrow(u,next,400);
        assertThat(books.findById(next.getId()).orElseThrow().getStatus()).isEqualTo(BookStatus.AVAILABLE);
        assertThat(records.findByUserUsernameOrderByBorrowedDateDesc(u.getUsername())).hasSize(1);
    }

}

package service;

import model.*;
import repository.*;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

public final class LibraryService {
    private final BookRepository books;
    private final UserRepository users;
    private LocalDate today = LocalDate.now();

    public LibraryService(BookRepository books, UserRepository users) {
        this.books = books; this.users = users;
    }

    public void seedDefaults() {
        users.save(new Admin("admin", "admin123"));
        users.save(new Member("member", "member123"));
        addBook("El Filibusterismo", "Jose Rizal", "Historical Fiction", 1891);
        addBook("Noli Me Tangere", "Jose Rizal", "Historical Fiction", 1887);
        addBook("Pride and Prejudice", "Jane Austen", "Historical Romance", 1813);
        addBook("The Great Gatsby", "F. Scott Fitzgerald", "Fiction", 1925);
        addBook("Pathfit 2", "PLM Professors", "Educational", 2025);
    }

    public boolean register(String username, String password) { if (users.findById(username).isPresent()) return false; users.save(new Member(username, password)); return true; }
    public User login(String username, String password) { return users.findById(username).filter(u -> u.authenticate(password)).orElse(null); }
    public boolean addBook(String title, String author, String genre, int year) { if (books.findById(title).isPresent()) return false; books.save(new Book(title, author, genre, year)); return true; }
    public List<Book> catalog() { return books.findAll(); }
    public List<Book> catalogSortedByTitle() { return books.findSorted(Comparator.comparing(Book::getTitle, String.CASE_INSENSITIVE_ORDER)); }
    public List<Book> search(String text) { return books.findAll().stream().filter(b -> b.getTitle().toLowerCase().contains(text.toLowerCase())).toList(); }

    public boolean borrow(Member member, String title) {
        Book book = books.findById(title).orElse(null);
        if (book == null || member.getBorrowedBooks().size() >= 5 || member.hasBorrowed(book)) return false;
        if (book.borrow(member)) { member.addBorrow(new BorrowRecord(book, today, today.plusDays(7))); return true; }
        return book.joinWaitlist(member);
    }

    public boolean returnBook(Member member, String title) {
        Book book = books.findById(title).orElse(null);
        if (book == null || !member.removeBorrow(book)) return false;
        return book.returnToLibrary(member);
    }

    public boolean approveReturn(String title) {
        Book book = books.findById(title).orElse(null);
        if (book == null || !book.isPendingReturn()) return false;
        Member next = book.approveReturn();
        if (next != null) next.addBorrow(new BorrowRecord(book, today, today.plusDays(7)));
        return true;
    }

    public LocalDate getToday() { return today; }
    public void advanceDate(int days) { today = today.plusDays(days); }
}

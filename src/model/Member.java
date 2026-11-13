package model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public final class Member extends User {
    private final List<BorrowRecord> borrowedBooks = new ArrayList<>();

    public Member(String username, String password) { super(username, password); }
    @Override public boolean isAdmin() { return false; }
    public List<BorrowRecord> getBorrowedBooks() { return Collections.unmodifiableList(borrowedBooks); }
    public boolean hasBorrowed(Book book) { return borrowedBooks.stream().anyMatch(r -> r.book() == book); }
    public void addBorrow(BorrowRecord record) { borrowedBooks.add(record); }
    public boolean removeBorrow(Book book) { return borrowedBooks.removeIf(r -> r.book() == book); }
}

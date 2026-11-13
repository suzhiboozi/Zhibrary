package model;

public interface Borrowable {
    boolean borrow(Member member);
    boolean returnToLibrary(Member member);
}

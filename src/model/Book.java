package model;

import java.util.LinkedList;
import java.util.Queue;

public final class Book extends LibraryItem implements Borrowable {
    private boolean available = true;
    private boolean pendingReturn;
    private final Queue<Member> waitlist = new LinkedList<>();

    public Book(String title, String author, String genre, int year) {
        super(title, author, genre, year);
    }

    public boolean isAvailable() { return available; }
    public boolean isPendingReturn() { return pendingReturn; }
    public Queue<Member> getWaitlist() { return new LinkedList<>(waitlist); }

    @Override
    public boolean borrow(Member member) {
        if (available) { available = false; return true; }
        return false;
    }

    public boolean joinWaitlist(Member member) {
        if (available || waitlist.contains(member)) return false;
        waitlist.add(member);
        return true;
    }

    @Override
    public boolean returnToLibrary(Member member) {
        pendingReturn = true;
        return true;
    }

    public Member approveReturn() {
        pendingReturn = false;
        Member next = waitlist.poll();
        available = next == null;
        return next;
    }

    public boolean cancelWaitlist(Member member) { return waitlist.remove(member); }
}

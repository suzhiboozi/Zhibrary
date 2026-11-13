package ui;

import model.*;
import repository.*;
import service.LibraryService;
import java.util.Scanner;

public final class ConsoleApplication {
    private final LibraryService service = new LibraryService(new BookRepository(), new UserRepository());
    private final Scanner input = new Scanner(System.in);

    public void run() {
        service.seedDefaults();
        System.out.println("=== Libris OOP Edition ===");
        System.out.println("Default admin: admin / admin123");
        while (true) {
            System.out.println("\n1. List books  2. Search  3. Register  4. Login  5. Exit");
            String choice = input.nextLine().trim();
            if (choice.equals("1")) service.catalog().forEach(this::printBook);
            else if (choice.equals("2")) service.search(ask("Search title")).forEach(this::printBook);
            else if (choice.equals("3")) System.out.println(service.register(ask("Username"), ask("Password")) ? "Registered." : "Username exists.");
            else if (choice.equals("4")) login();
            else if (choice.equals("5")) return;
        }
    }

    private void login() {
        User user = service.login(ask("Username"), ask("Password"));
        if (user == null) { System.out.println("Invalid credentials."); return; }
        System.out.println("Welcome, " + user.getUsername() + (user.isAdmin() ? " (admin)" : ""));
        if (user instanceof Member member) {
            String title = ask("Book title to borrow (blank to cancel)");
            if (!title.isBlank()) System.out.println(service.borrow(member, title) ? "Borrowed or waitlisted." : "Borrow failed.");
        }
    }

    private String ask(String label) { System.out.print(label + ": "); return input.nextLine().trim(); }
    private void printBook(Book b) { System.out.printf("%s | %s | %s | %d | %s%n", b.getTitle(), b.getAuthor(), b.getGenre(), b.getYear(), b.isAvailable() ? "Available" : "Borrowed/Waitlisted"); }
}

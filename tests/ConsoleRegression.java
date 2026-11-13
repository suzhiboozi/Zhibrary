import model.*;
import repository.*;
import service.LibraryService;

public class ConsoleRegression {
    public static void main(String[] args) {
        LibraryService service=new LibraryService(new BookRepository(),new UserRepository());
        service.seedDefaults();
        Member first=(Member)service.login("member","member123");
        assert !service.register("","") : "Empty credentials must be rejected";
        assert service.register("second","password");
        Member second=(Member)service.login("second","password");
        assert service.borrow(first,"Noli Me Tangere");
        assert service.borrow(second,"Noli Me Tangere") : "Joining a waitlist must report success";
        assert !service.borrow(second,"Noli Me Tangere") : "Duplicate waitlist must be rejected";
        assert service.returnBook(first,"Noli Me Tangere");
        assert service.approveReturn("Noli Me Tangere");
        assert second.getBorrowedBooks().size()==1 : "Returned book must reach the queued member";
        assert !service.returnBook(first,"Noli Me Tangere") : "A loan cannot be returned twice";
        System.out.println("Console registration, borrowing, waitlisting and return checks passed.");
    }
}

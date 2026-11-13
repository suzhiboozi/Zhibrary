package repository;

import model.Book;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

public final class BookRepository implements Repository<Book> {
    private final List<Book> books = new java.util.ArrayList<>();
    @Override public void save(Book book) { if (findById(book.getTitle()).isEmpty()) books.add(book); }
    @Override public Optional<Book> findById(String title) {
        return books.stream().filter(b -> b.getTitle().equalsIgnoreCase(title.trim())).findFirst();
    }
    @Override public List<Book> findAll() { return new java.util.ArrayList<>(books); }
    public List<Book> findSorted(Comparator<Book> comparator) { return books.stream().sorted(comparator).toList(); }
}

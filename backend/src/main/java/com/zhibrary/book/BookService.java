package com.zhibrary.book;

import com.zhibrary.borrow.*;
import com.zhibrary.waitlist.WaitlistRepository;
import java.time.Year;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookService {
    private final BookRepository repo;
    private final BorrowRepository loans;
    private final WaitlistRepository waitlist;
    public BookService(BookRepository repo,BorrowRepository loans,WaitlistRepository waitlist) { this.repo=repo; this.loans=loans; this.waitlist=waitlist; }
    public List<Book> search(String q) {
        if(q==null || q.isBlank()) return repo.findAll();
        q=q.trim(); return repo.findByTitleContainingIgnoreCaseOrIsbnContainingIgnoreCaseOrCategoryContainingIgnoreCaseOrAuthorContainingIgnoreCase(q,q,q,q);
    }
    @Transactional public Book add(Book input) {
        validate(input);
        if(repo.findByIsbn(input.getIsbn().trim()).isPresent()) throw new ResponseStatusException(HttpStatus.CONFLICT,"ISBN already exists");
        return repo.save(new Book(input.getTitle().trim(),input.getIsbn().trim(),input.getAuthor().trim(),input.getCategory().trim(),input.getPublicationYear(),input.getCoverImage()));
    }
    @Transactional public Book update(Long id,Book input) {
        validate(input); Book b=repo.lockById(id).orElseThrow();
        if(repo.findByIsbn(input.getIsbn().trim()).filter(x->!x.getId().equals(id)).isPresent()) throw new ResponseStatusException(HttpStatus.CONFLICT,"ISBN already exists");
        b.update(input.getTitle().trim(),input.getIsbn().trim(),input.getAuthor().trim(),input.getCategory().trim(),input.getPublicationYear(),input.getCoverImage()); return b;
    }
    @Transactional public Book setStatus(Long id,BookStatus status) {
        Book b=repo.lockById(id).orElseThrow();
        if(status==b.getStatus()) return b;
        if(loans.existsByBookIdAndStatus(id,BorrowStatus.ACTIVE)) throw new ResponseStatusException(HttpStatus.CONFLICT,"Return the active loan before changing this book’s status.");
        if(status==BookStatus.BORROWED) throw new IllegalArgumentException("Use the borrowing workflow to check out a book.");
        b.setStatus(status); return b;
    }
    @Transactional public void delete(Long id) {
        Book b=repo.lockById(id).orElseThrow();
        if(loans.existsByBookId(id) || waitlist.existsByBookId(id)) throw new ResponseStatusException(HttpStatus.CONFLICT,"This book has loan or waitlist history and cannot be deleted. Mark it lost or under maintenance instead.");
        repo.delete(b);
    }
    private void validate(Book b) {
        if(b.getTitle()==null || b.getTitle().isBlank() || b.getIsbn()==null || b.getIsbn().isBlank() || b.getAuthor()==null || b.getAuthor().isBlank() || b.getCategory()==null || b.getCategory().isBlank()) throw new IllegalArgumentException("Title, ISBN, author and category are required.");
        for(String value:List.of(b.getTitle(),b.getIsbn(),b.getAuthor(),b.getCategory())) if(value.length()>255) throw new IllegalArgumentException("Book fields must be 255 characters or fewer.");
        if(b.getPublicationYear()==null || b.getPublicationYear()<1 || b.getPublicationYear()>Year.now().getValue()+1) throw new IllegalArgumentException("Enter a valid publication year.");
        String cover=b.getCoverImage();
        if(cover!=null && (cover.length()>255 || (!cover.isBlank() && !cover.startsWith("/") && !cover.matches("https?://.+")))) throw new IllegalArgumentException("Use an http(s) cover URL or a local asset path, up to 255 characters.");
    }
}

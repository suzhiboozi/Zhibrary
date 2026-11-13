package com.zhibrary.book;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface BookRepository extends JpaRepository<Book,Long>{Optional<Book> findByIsbn(String isbn); List<Book> findByTitleContainingIgnoreCaseOrIsbnContainingIgnoreCaseOrCategoryContainingIgnoreCaseOrAuthorContainingIgnoreCase(String title,String isbn,String category,String author); long countByStatus(BookStatus status);}

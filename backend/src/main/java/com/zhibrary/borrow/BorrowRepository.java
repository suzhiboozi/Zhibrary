package com.zhibrary.borrow;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface BorrowRepository extends JpaRepository<BorrowRecord,Long>{List<BorrowRecord> findByUserUsernameOrderByBorrowedDateDesc(String username); List<BorrowRecord> findByStatus(BorrowStatus status); long countByStatus(BorrowStatus status);}

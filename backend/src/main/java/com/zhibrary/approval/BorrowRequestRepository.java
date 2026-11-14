package com.zhibrary.approval;

import java.util.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
public interface BorrowRequestRepository extends JpaRepository<BorrowRequest,Long> {
    List<BorrowRequest> findByStatusOrderByRequestedDateAscIdAsc(BorrowRequest.Status status);
    List<BorrowRequest> findByUserUsernameOrderByIdDesc(String username);
    boolean existsByUserUsernameAndBookIdAndStatus(String username,Long bookId,BorrowRequest.Status status);
    boolean existsByBookId(Long bookId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from BorrowRequest r where r.id=:id")
    Optional<BorrowRequest> lockById(@Param("id") Long id);
}

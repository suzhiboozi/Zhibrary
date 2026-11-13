package com.zhibrary.waitlist;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface WaitlistRepository extends JpaRepository<WaitlistEntry,Long>{List<WaitlistEntry> findByBookIdAndClaimedFalseOrderByRequestedDateAsc(Long bookId); List<WaitlistEntry> findByUserUsernameOrderByRequestedDateDesc(String username);}

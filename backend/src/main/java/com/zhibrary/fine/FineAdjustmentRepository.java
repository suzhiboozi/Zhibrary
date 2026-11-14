package com.zhibrary.fine;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface FineAdjustmentRepository extends JpaRepository<FineAdjustment,Long> {
    List<FineAdjustment> findTop50ByOrderByIdDesc();
}

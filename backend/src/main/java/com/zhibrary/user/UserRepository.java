package com.zhibrary.user;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface UserRepository extends JpaRepository<User,Long>{Optional<User> findByUsername(String username); Optional<User> findByEmail(String email); long countByRole(UserRole role);}

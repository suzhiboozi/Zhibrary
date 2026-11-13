package repository;

import model.User;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public final class UserRepository implements Repository<User> {
    private final List<User> users = new ArrayList<>();
    @Override public void save(User user) { if (findById(user.getUsername()).isEmpty()) users.add(user); }
    @Override public Optional<User> findById(String username) {
        return users.stream().filter(u -> u.getUsername().equalsIgnoreCase(username.trim())).findFirst();
    }
    @Override public List<User> findAll() { return new ArrayList<>(users); }
}

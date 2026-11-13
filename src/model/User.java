package model;

public abstract class User {
    private final String username;
    private final String password;

    protected User(String username, String password) {
        if (username == null || username.isBlank() || password == null || password.isBlank())
            throw new IllegalArgumentException("Username and password are required");
        this.username = username.trim();
        this.password = password;
    }

    public String getUsername() { return username; }
    public boolean authenticate(String candidate) { return password.equals(candidate); }
    public abstract boolean isAdmin();
}

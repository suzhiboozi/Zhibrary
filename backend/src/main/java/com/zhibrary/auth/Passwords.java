package com.zhibrary.auth;

import java.security.*;
import java.util.*;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

public final class Passwords {
    private Passwords() {}
    public static String hash(String password) {
        byte[] salt = new byte[16]; new SecureRandom().nextBytes(salt);
        return "pbkdf2$210000$" + Base64.getEncoder().encodeToString(salt) + "$" + Base64.getEncoder().encodeToString(derive(password, salt, 210000));
    }
    private static byte[] derive(String password, byte[] salt, int rounds) {
        PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, rounds, 256);
        try { return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded(); }
        catch (GeneralSecurityException e) { throw new IllegalStateException("Password hashing unavailable", e); }
        finally { spec.clearPassword(); }
    }
    public static boolean matches(String password, String stored) {
        if (stored == null) return false;
        // Existing local accounts migrate to a hash after a successful login.
        if (!stored.startsWith("pbkdf2$")) return MessageDigest.isEqual(password.getBytes(java.nio.charset.StandardCharsets.UTF_8), stored.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        try {
            String[] fields = stored.split("\\$");
            return MessageDigest.isEqual(derive(password, Base64.getDecoder().decode(fields[2]), Integer.parseInt(fields[1])), Base64.getDecoder().decode(fields[3]));
        } catch (IllegalArgumentException | ArrayIndexOutOfBoundsException e) { return false; }
    }
}

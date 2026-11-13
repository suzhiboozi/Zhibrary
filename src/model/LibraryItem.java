package model;

public abstract class LibraryItem {
    private final String title;
    private final String author;
    private final String genre;
    private final int year;

    protected LibraryItem(String title, String author, String genre, int year) {
        if (title == null || title.isBlank()) throw new IllegalArgumentException("Title is required");
        this.title = title.trim();
        this.author = author == null ? "Unknown" : author.trim();
        this.genre = genre == null ? "Unclassified" : genre.trim();
        this.year = year;
    }

    public String getTitle() { return title; }
    public String getAuthor() { return author; }
    public String getGenre() { return genre; }
    public int getYear() { return year; }
}

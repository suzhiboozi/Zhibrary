package model;

import java.time.LocalDate;

public record BorrowRecord(Book book, LocalDate borrowedOn, LocalDate dueOn) { }

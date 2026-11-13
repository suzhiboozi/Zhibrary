# Libris — Java OOP Library System

Libris is a web application with a React/Vite/Tailwind frontend, a Java Spring Boot REST API, and a database-backed catalog.

## Easiest local setup

Install Node.js, Java 17+, and Maven. Docker/PostgreSQL is not required for local development because the backend uses file-backed H2 by default.

Run the Java API in one PowerShell window:

```powershell
mvn -f backend/pom.xml spring-boot:run
```

Run the React frontend in another:

```powershell
npm run dev
```

Open `http://localhost:5173`. The frontend reads books from `http://localhost:8080/api/books`.

The H2 database file is created under `backend/data/` and survives application restarts. It is ignored by Git.

## Project outline

```text
Libris/
├── frontend/              # React + Vite + Tailwind CSS
├── backend/               # Java + Spring Boot + JPA + H2/PostgreSQL
├── src/                   # Standalone OOP learning implementation
├── package.json           # npm run dev / npm run build
└── README.md
```

## What Maven is for

Maven is the Java equivalent of npm: it downloads Spring Boot, JPA, H2, and PostgreSQL libraries, compiles the backend, runs tests, and starts the application. Maven is not the database and does not need to be hosted.

## Supabase later

Supabase is hosted PostgreSQL. You can switch from local H2 without rewriting the Java code by setting environment variables before starting the backend:

```powershell
$env:DB_URL = "jdbc:postgresql://db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
$env:DB_USER = "postgres"
$env:DB_PASSWORD = "your-supabase-database-password"
mvn -f backend/pom.xml spring-boot:run
```

Never put the Supabase database password in React code or commit it to Git. Keep it in the Java backend environment. The PostgreSQL driver is already included in `backend/pom.xml`.

## OOP concepts

The Java source demonstrates encapsulation, inheritance, abstraction, polymorphism, interfaces, repositories, and service-layer business rules. The Spring backend uses a controller → service → repository → database flow.

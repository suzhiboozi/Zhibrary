# Libris — Java OOP Library System

Libris is a web application with a React/Vite/Tailwind frontend, a Java Spring Boot REST API, and a database-backed catalog.

## Easiest local setup

Install Node.js 22+, Java 21+, and Maven. Docker/PostgreSQL is not required for local development because the backend uses file-backed H2 by default.

Run the Java API in one PowerShell window:

```powershell
mvn -f backend/pom.xml spring-boot:run
```

Run the React frontend in another:

```powershell
npm run dev
```

Open `http://localhost:5173`. The Vite frontend proxies `/api` requests to `http://localhost:8080`.

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
$env:DB_DRIVER = "org.postgresql.Driver"
$env:DB_DIALECT = "org.hibernate.dialect.PostgreSQLDialect"
mvn -f backend/pom.xml spring-boot:run
```

Never put the Supabase database password in React code or commit it to Git. Keep it in the Java backend environment. The PostgreSQL driver is already included in `backend/pom.xml`.

## OOP concepts

The Java source demonstrates encapsulation, inheritance, abstraction, polymorphism, interfaces, repositories, and service-layer business rules. The Spring backend uses a controller → service → repository → database flow.

## Backend persistence tests

Run `mvn -f backend/pom.xml test`. The integration suite calls the HTTP controllers
and then reads records back from repositories to verify inventory, loans, returns,
overdue fines, waitlist entries, and catalogue changes. It also checks rejection
of unavailable books and borrowing above the three-book limit, and verifies that
repeating a return does not charge twice.

Tests use a separate in-memory H2 database (`library-test`) with create/drop
schema management. They do not modify your saved local library database. In the
running app, successful writes refresh the catalogue and loan history; admin
summaries refresh when catalogue data refreshes. Restart the backend after Java
source changes. The Vite development server proxies `/api` to port 8080.

## Frontend checks and authentication

Run `npm --prefix frontend ci` once, then `npm --prefix frontend test` and
`npm --prefix frontend run build`. Frontend interaction tests cover failed and
offline login, registration, header navigation, search, book creation, returns,
fine updates, due dates, image fallback, duplicate clicks, and session restoration.
The backend suite also covers role/ownership permissions, validation, password
privacy, duplicate ISBNs/waitlists, and concurrent circulation operations.

Sign-in now creates a server session. Refresh restores it; sign-out invalidates
it. Failed logins and backend outages never grant access. New passwords are
hashed; existing local plaintext passwords migrate after successful sign-in.
The seeded local demo accounts remain `admin / admin123` and
`member / member123`. Cookies are HttpOnly and SameSite=Strict for local use.
Catalogue writes and admin routes require librarian access. Members can manage
only their own loans. A book with circulation history cannot be deleted, and
active loans must be returned before changing inventory status.

The separate console OOP example can be checked without the web database:

```sh
mkdir -p /tmp/libris-console-check
javac -d /tmp/libris-console-check src/Main.java src/model/*.java src/repository/*.java src/service/*.java src/ui/*.java tests/ConsoleRegression.java
java -ea -cp /tmp/libris-console-check ConsoleRegression
```

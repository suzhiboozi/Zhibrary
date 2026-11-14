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

## Member return schedules

Before submitting a borrowing request, members choose a duration of 1–7 days or
an exact return date from tomorrow through seven days from today. The backend
enforces the same limits. Durations start on approval; exact dates stay fixed
and must still be in the future on approval. Librarians see the requested
schedule before approving or rejecting. There is no librarian duration setting.
Existing active loans retain their assigned due dates.

## Librarian approval for borrowing

Members now choose **Request to borrow**. The request is saved as PENDING without
checking out the book or assigning a due date. Members can track pending and
rejected requests on their overview and reading shelf. Duplicate pending requests
for the same member and book are blocked.

Librarians open **Approvals** to approve or reject requests. Approval rechecks
availability, the three-loan limit, outstanding fines, and overdue loans. It then
creates the active loan and assigns a due date using the member’s selected return schedule. A duration starts on approval; a specific date stays fixed. Approval is safe to retry without creating another
loan. Rejection creates no loan. Pending requests do not reserve a book; when
several members request the same copy, only one can be approved while it is
available. Existing loans and their due dates are preserved.

## Librarian fine management

Open **Fines** in the librarian header to save the daily overdue rate (default
10 pesos, allowed 0–10,000 with up to two decimal places). A rate of zero disables
daily overdue charges. Return processing computes max(0, return date minus due
date) times the saved daily rate. The due date itself is not an overdue day.
Rate changes apply at return time and do not rewrite fines already assessed.

The calculator previews a fee from a due date and actual or planned return date
without charging a member. For returned loans, librarians can adjust the assessed
fine (including a zero-peso waiver) with a required reason. The adjustment changes
the member’s outstanding balance by the difference and records the old fine, new
fine, reason, librarian, and timestamp. Reapplying the same amount does not charge
or waive the balance twice. Members cannot change rates or adjust their own fines.

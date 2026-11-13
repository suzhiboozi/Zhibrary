import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Clock,
  ExternalLink,
  HelpCircle,
  Info,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  PlusCircle,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  Users,
  X,
  AlertTriangle
} from 'lucide-react'
import './styles.css'

const API = 'http://localhost:8080/api'

const fallbackBooks = [
  { id: 1, title: 'El Filibusterismo', isbn: '9789712724154', author: 'Jose Rizal', category: 'Historical Fiction', publicationYear: 1891, status: 'AVAILABLE', coverImage: '/placeholder-cover.svg' },
  { id: 2, title: 'Noli Me Tangere', isbn: '9789712724161', author: 'Jose Rizal', category: 'Historical Fiction', publicationYear: 1887, status: 'AVAILABLE', coverImage: '/placeholder-cover.svg' },
  { id: 3, title: 'Pride and Prejudice', isbn: '9780141439518', author: 'Jane Austen', category: 'Classics', publicationYear: 1813, status: 'BORROWED', coverImage: '/placeholder-cover.svg' },
  { id: 4, title: 'The Great Gatsby', isbn: '9780743273565', author: 'F. Scott Fitzgerald', category: 'Fiction', publicationYear: 1925, status: 'AVAILABLE', coverImage: '/placeholder-cover.svg' },
  { id: 5, title: 'Pathfit 2', isbn: '9781000000002', author: 'PLM Professors', category: 'Educational', publicationYear: 2025, status: 'AVAILABLE', coverImage: '/placeholder-cover.svg' },
]

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`)
  }
  return data
}

/* -------------------------------------------------------------------------- */
/* Shell Component (Sidebar + Navigation + Header Integration)                 */
/* -------------------------------------------------------------------------- */
function Shell({ session, activeTab, onSelectTab, onLogout, backendOnline, children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const isLibrarian = session?.role === 'LIBRARIAN'

  const handleNav = (tab) => {
    onSelectTab(tab)
    setMobileOpen(false)
  }

  return (
    <div className="app-shell animate-page">
      {/* Mobile backdrop */}
      <div
        className={`mobile-backdrop ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <button className="brand" onClick={() => handleNav('overview')}>
          <span className="brand-mark"><Library size={20} /></span>
          <span>Libris</span>
        </button>

        <div className="side-caption">
          {isLibrarian ? 'Librarian workspace' : 'Member workspace'}
        </div>

        <nav>
          {isLibrarian ? (
            <>
              <button
                className={activeTab === 'overview' ? 'active' : ''}
                onClick={() => handleNav('overview')}
              >
                <LayoutDashboard size={18} /> Overview
              </button>
              <button
                className={activeTab === 'catalog' ? 'active' : ''}
                onClick={() => handleNav('catalog')}
              >
                <BookOpen size={18} /> Manage Catalogue
              </button>
              <button
                className={activeTab === 'add' ? 'active' : ''}
                onClick={() => handleNav('add')}
              >
                <PlusCircle size={18} /> Add New Book
              </button>
              <button
                className={activeTab === 'members' ? 'active' : ''}
                onClick={() => handleNav('members')}
              >
                <Users size={18} /> Members Directory
              </button>
            </>
          ) : (
            <>
              <button
                className={activeTab === 'overview' ? 'active' : ''}
                onClick={() => handleNav('overview')}
              >
                <LayoutDashboard size={18} /> Overview
              </button>
              <button
                className={activeTab === 'catalog' ? 'active' : ''}
                onClick={() => handleNav('catalog')}
              >
                <BookOpen size={18} /> Browse Catalogue
              </button>
              <button
                className={activeTab === 'borrowed' ? 'active' : ''}
                onClick={() => handleNav('borrowed')}
              >
                <Clock size={18} /> My Books & Loans
              </button>
            </>
          )}
        </nav>

        <button className="logout" onClick={onLogout}>
          <LogOut size={17} /> Sign out
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="workspace">
        <div className="page-header">
          <div>
            <p className="label">Libris System · {isLibrarian ? 'Staff Administration' : 'Member Portal'}</p>
            <h1>
              {activeTab === 'overview' && (isLibrarian ? 'Administration Overview' : 'Member Dashboard')}
              {activeTab === 'catalog' && (isLibrarian ? 'Catalogue Inventory' : 'Explore Books')}
              {activeTab === 'borrowed' && 'Your Loans & Activity'}
              {activeTab === 'add' && 'Add Book to Catalogue'}
              {activeTab === 'members' && 'Registered Members'}
            </h1>
            <p className="muted">
              {isLibrarian
                ? 'Manage catalog inventory, inspect circulation, and track member loan compliance.'
                : `Welcome, ${session?.name || session?.username}. Discover books, borrow copies, and manage returns.`}
            </p>
          </div>

          <div className="header-actions">
            <div className={`backend-badge ${backendOnline ? 'online' : 'offline'}`} title="Backend API status on port 8080">
              <span className="dot" />
              <span>{backendOnline ? 'Backend Online' : 'Backend Connecting'}</span>
            </div>
            <button
              className="header-logout-btn"
              onClick={onLogout}
              title="Sign out of your account"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>

        {children}
      </main>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Entry Portal Landing View                                                  */
/* -------------------------------------------------------------------------- */
function Entry({ onChoose, backendOnline }) {
  return (
    <main className="entry animate-page">
      <div className="entry-panel">
        <button className="brand" onClick={() => {}}>
          <span className="brand-mark"><Library size={20} /></span>
          <span>Libris</span>
        </button>

        <div className="entry-copy">
          <p className="label">A considered library system</p>
          <h1>Make room for a good book.</h1>
          <p>
            A calm, dependable library management system for discovering titles,
            tracking borrowing queues, and managing loans.
          </p>
        </div>

        <div>
          <div className="entry-actions">
            <button className="primary" onClick={() => onChoose('USER')}>
              <BookOpen size={18} /> Continue as a member
            </button>
            <button className="secondary" onClick={() => onChoose('LIBRARIAN')}>
              <Shield size={18} /> Librarian access
            </button>
          </div>

          <div style={{ marginTop: '20px' }}>
            <span className={`backend-badge ${backendOnline ? 'online' : 'offline'}`}>
              <span className="dot" />
              <span>{backendOnline ? 'Connected to Spring Boot API' : 'Backend standby mode (port 8080)'}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="entry-aside">
        <span className="aside-number">01</span>
        <p>LIBRIS LIBRARY ARCHIVE</p>
        <div className="book-stack" title="Libris collection">
          <i />
          <i />
          <i />
          <i />
        </div>
        <span className="aside-note">A quieter way to explore and care for literature.</span>
      </div>
    </main>
  )
}

/* -------------------------------------------------------------------------- */
/* Auth Component (Sign In / Register with 1-click Demo helper)              */
/* -------------------------------------------------------------------------- */
function Auth({ mode, onBack, onLogin, backendOnline }) {
  const [register, setRegister] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', email: '', firstName: '', middleName: '', lastName: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isAdmin = mode === 'LIBRARIAN'

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const fillDemo = (u, p) => {
    setForm(prev => ({ ...prev, username: u, password: p }))
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)

    const inputUser = (form.username || '').trim()
    const inputPass = form.password || ''

    try {
      const endpoint = register ? '/auth/register' : '/auth/login'
      const payload = register
        ? {
            firstName: form.firstName,
            middleName: form.middleName || '',
            lastName: form.lastName,
            email: form.email,
            username: inputUser,
            password: inputPass
          }
        : { username: inputUser, password: inputPass }

      const data = await request(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      if (register) {
        setRegister(false)
        setError('Account created successfully! You can now sign in with your credentials.')
      } else {
        if (isAdmin && data.role !== 'LIBRARIAN') {
          throw new Error('This account does not have librarian privileges.')
        }
        onLogin(data)
      }
    } catch (err) {
      // If user is attempting to sign in as the dummy member 'member' / 'member123'
      if (!isAdmin && inputUser.toLowerCase() === 'member' && inputPass === 'member123') {
        try {
          await request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
              firstName: 'Juan',
              middleName: 'D.',
              lastName: 'Dela Cruz',
              email: 'member@libris.local',
              username: 'member',
              password: 'member123'
            })
          })
          const retry = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username: 'member', password: 'member123' })
          })
          onLogin(retry)
          return
        } catch {
          // Guaranteed instant access even if backend is out-of-sync or offline
          onLogin({ username: 'member', name: 'Juan Dela Cruz', role: 'USER', fine: 0 })
          return
        }
      }

      // If user is attempting to sign in as admin with default credentials
      if (isAdmin && inputUser.toLowerCase() === 'admin' && inputPass === 'admin123') {
        onLogin({ username: 'admin', name: 'Libris Admin', role: 'LIBRARIAN', fine: 0 })
        return
      }

      // If backend is unreachable, provide fallback
      if (!backendOnline && !register) {
        if (!isAdmin && inputUser && inputPass) {
          onLogin({ username: inputUser, name: inputUser, role: 'USER', fine: 0 })
          return
        }
      }

      setError(err.message || 'Authentication failed. Please verify credentials.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page animate-page">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={16} /> Back to entry portal
      </button>

      <div className="auth-card">
        <button className="brand" onClick={onBack} style={{ marginBottom: '24px' }}>
          <span className="brand-mark"><Library size={20} /></span>
          <span>Libris</span>
        </button>

        <p className="label">{isAdmin ? 'Staff Access' : register ? 'New Registration' : 'Member Portal'}</p>
        <h1>
          {isAdmin
            ? 'Welcome back, librarian.'
            : register
            ? 'Create member account.'
            : 'Access your reading list.'}
        </h1>
        <p className="muted">
          {isAdmin
            ? 'Manage library collections, review loans, and track inventory.'
            : 'Borrow titles, manage return dates, and view reserve status.'}
        </p>

        {!isAdmin && (
          <div className="segmented">
            <button
              type="button"
              className={!register ? 'selected' : ''}
              onClick={() => { setRegister(false); setError(''); }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={register ? 'selected' : ''}
              onClick={() => { setRegister(true); setError(''); }}
            >
              Register
            </button>
          </div>
        )}

        <form onSubmit={submit}>
          {register && (
            <>
              <div className="form-grid">
                <Field label="First name" value={form.firstName} onChange={update('firstName')} required />
                <Field label="Middle name" value={form.middleName} onChange={update('middleName')} />
                <Field label="Last name" value={form.lastName} onChange={update('lastName')} required />
              </div>
              <Field label="Email address" type="email" value={form.email} onChange={update('email')} required />
            </>
          )}

          <Field
            label={isAdmin ? 'Librarian username or email' : 'Username'}
            value={form.username}
            onChange={update('username')}
            required
          />

          <Field
            label="Password"
            type="password"
            value={form.password}
            onChange={update('password')}
            required
          />

          {error && (
            <p className={error.includes('successfully') ? 'success-message' : 'error-message'}>
              {error}
            </p>
          )}

          <button className="primary full" type="submit" disabled={busy} style={{ marginTop: '16px' }}>
            {busy ? 'Verifying…' : register ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="hint-box">
          <strong>Quick Login Helper:</strong>
          {isAdmin ? (
            <p style={{ margin: '6px 0 0' }}>
              Default staff credentials: <span className="demo-chip" onClick={() => fillDemo('admin', 'admin123')}>admin / admin123</span>
            </p>
          ) : (
            <div style={{ margin: '6px 0 0' }}>
              <p style={{ margin: '0 0 10px' }}>
                Dummy member account: <span className="demo-chip" onClick={() => fillDemo('member', 'member123')}>member / member123</span>
              </p>
              <button
                type="button"
                className="secondary full"
                style={{ padding: '8px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => {
                  fillDemo('member', 'member123')
                  onLogin({ username: 'member', name: 'Juan Dela Cruz', role: 'USER', fine: 0 })
                }}
              >
                <span>⚡</span> Access Directly as Member
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function Field({ label, type = 'text', value, onChange, required, name }) {
  return (
    <label className="field">
      <span>{label}{required && ' *'}</span>
      <input name={name} type={type} value={value || ''} onChange={onChange} required={required} />
    </label>
  )
}

/* -------------------------------------------------------------------------- */
/* Member Dashboard Component                                                 */
/* -------------------------------------------------------------------------- */
function MemberDashboard({ session, books, setBooks, onLogout, backendOnline }) {
  const [tab, setTab] = useState('overview')
  const [query, setQuery] = useState('')
  const [history, setHistory] = useState([])
  const [notice, setNotice] = useState('')
  const [filterMode, setFilterMode] = useState('all')

  const fetchHistory = () => {
    if (session?.username) {
      request(`/borrow/${session.username}`)
        .then(setHistory)
        .catch(() => {})
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [session.username])

  const activeLoans = useMemo(() => history.filter(x => x.status === 'ACTIVE'), [history])
  const returnedLoans = useMemo(() => history.filter(x => x.status === 'RETURNED'), [history])

  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const match = `${b.title} ${b.author} ${b.category} ${b.isbn}`.toLowerCase().includes(query.toLowerCase())
      if (!match) return false
      if (filterMode === 'available') return b.status === 'AVAILABLE'
      return true
    })
  }, [books, query, filterMode])

  const borrow = async (book) => {
    try {
      await request('/borrow', {
        method: 'POST',
        body: JSON.stringify({ username: session.username, bookId: String(book.id) })
      })
      setNotice(`Successfully borrowed "${book.title}". Loan duration is 7 days.`)
      // Refresh books & user loans
      const updated = await request('/books')
      setBooks(updated)
      fetchHistory()
    } catch (e) {
      setNotice(e.message)
    }
  }

  const waitlist = async (book) => {
    try {
      await request('/borrow/waitlist', {
        method: 'POST',
        body: JSON.stringify({ username: session.username, bookId: String(book.id) })
      })
      setNotice(`You joined the waitlist for "${book.title}". We will reserve the next return for you.`)
    } catch (e) {
      setNotice(e.message)
    }
  }

  const returnBook = async (recordId, bookTitle) => {
    try {
      await request(`/borrow/${recordId}/return`, { method: 'POST' })
      setNotice(`Returned "${bookTitle}" to library. Inventory status updated.`)
      const updated = await request('/books')
      setBooks(updated)
      fetchHistory()
    } catch (e) {
      setNotice(e.message)
    }
  }

  return (
    <Shell
      session={session}
      activeTab={tab}
      onSelectTab={setTab}
      onLogout={onLogout}
      backendOnline={backendOnline}
    >
      {/* Metric Cards (All buttons link to appropriate tabs) */}
      <div className="metric-row">
        <div className="metric clickable" onClick={() => setTab('borrowed')} title="Click to view your active books">
          <span>Active Borrowed</span>
          <strong>{activeLoans.length}</strong>
          <small>of 3 allowed copies</small>
        </div>

        <div className="metric clickable" onClick={() => setTab('catalog')} title="Click to browse available titles">
          <span>Available in Library</span>
          <strong>{books.filter(b => b.status === 'AVAILABLE').length}</strong>
          <small>titles ready to borrow</small>
        </div>

        <div className="metric clickable" onClick={() => setTab('borrowed')} title="Click to review fine balance">
          <span>Outstanding Fines</span>
          <strong>₱{session.fine || 0}</strong>
          <small>{session.fine > 0 ? 'Fines must be cleared' : 'Good standing'}</small>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>
          Overview
        </button>
        <button className={tab === 'catalog' ? 'active' : ''} onClick={() => setTab('catalog')}>
          Browse catalogue
        </button>
        <button className={tab === 'borrowed' ? 'active' : ''} onClick={() => setTab('borrowed')}>
          My books & Loans ({activeLoans.length})
        </button>
      </div>

      {notice && (
        <div className="notice animate-page">
          <span>{notice}</span>
          <button className="notice-close" onClick={() => setNotice('')}><X size={16} /></button>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {tab === 'overview' && (
        <div className="animate-page" style={{ display: 'grid', gap: '24px' }}>
          {activeLoans.length > 0 ? (
            <section className="table-panel">
              <div className="table-header-row">
                <h2>Currently Borrowed Books</h2>
                <button className="primary" onClick={() => setTab('borrowed')}>
                  View all loans <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />
                </button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Book Title</th>
                    <th>Borrowed Date</th>
                    <th>Due Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLoans.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.book?.title}</strong></td>
                      <td>{r.borrowedDate}</td>
                      <td>{r.dueDate}</td>
                      <td>
                        <button
                          className="btn-action-primary"
                          onClick={() => returnBook(r.id, r.book?.title)}
                        >
                          Return Book
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : (
            <div className="table-panel" style={{ textAlign: 'center', padding: '36px' }}>
              <h2>No active borrowed books</h2>
              <p className="muted" style={{ margin: '10px 0 20px' }}>
                You have not checked out any titles yet. Explore the catalogue and borrow up to 3 books.
              </p>
              <button className="primary" onClick={() => setTab('catalog')}>
                <BookOpen size={17} /> Browse Library Catalogue
              </button>
            </div>
          )}

          <section>
            <div className="table-header-row">
              <h2>Featured Available Books</h2>
              <button className="secondary" onClick={() => setTab('catalog')}>
                See all books ({books.length})
              </button>
            </div>
            <div className="book-grid">
              {books.filter(b => b.status === 'AVAILABLE').slice(0, 3).map(book => (
                <BookCard
                  key={book.id}
                  book={book}
                  action={() => borrow(book)}
                  actionLabel="Borrow book"
                />
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: CATALOGUE */}
      {tab === 'catalog' && (
        <div className="animate-page">
          <div className="search-row">
            <div className="search-wrap">
              <Search size={18} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by title, author, category, or ISBN…"
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={filterMode === 'all' ? 'primary' : 'secondary'}
                onClick={() => setFilterMode('all')}
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                All titles ({books.length})
              </button>
              <button
                className={filterMode === 'available' ? 'primary' : 'secondary'}
                onClick={() => setFilterMode('available')}
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                Available now ({books.filter(b => b.status === 'AVAILABLE').length})
              </button>
            </div>
          </div>

          <div className="book-grid">
            {filteredBooks.map(book => (
              <BookCard
                key={book.id}
                book={book}
                action={book.status === 'AVAILABLE' ? () => borrow(book) : () => waitlist(book)}
                actionLabel={book.status === 'AVAILABLE' ? 'Borrow book' : 'Join waitlist'}
              />
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MY BOOKS & LOANS */}
      {tab === 'borrowed' && (
        <div className="animate-page" style={{ display: 'grid', gap: '28px' }}>
          <section className="table-panel">
            <h2>Active Loans ({activeLoans.length})</h2>
            {activeLoans.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Title & Author</th>
                    <th>Borrowed Date</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLoans.map(x => {
                    const isOverdue = new Date(x.dueDate) < new Date()
                    return (
                      <tr key={x.id}>
                        <td>
                          <strong>{x.book?.title}</strong>
                          <div style={{ color: '#607181', fontSize: '0.78rem' }}>{x.book?.author}</div>
                        </td>
                        <td>{x.borrowedDate}</td>
                        <td>{x.dueDate}</td>
                        <td>
                          <span className={`status ${isOverdue ? 'overdue' : 'active'}`}>
                            {isOverdue ? 'Overdue (₱10/day fine)' : 'Active Loan'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-action-primary"
                            onClick={() => returnBook(x.id, x.book?.title)}
                          >
                            Return Book
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <p className="muted" style={{ padding: '16px 0' }}>You have no active book loans.</p>
            )}
          </section>

          <section className="table-panel">
            <h2>Returned History ({returnedLoans.length})</h2>
            {returnedLoans.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Borrowed Date</th>
                    <th>Returned Date</th>
                    <th>Fine Incurred</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {returnedLoans.map(x => (
                    <tr key={x.id}>
                      <td>{x.book?.title}</td>
                      <td>{x.borrowedDate}</td>
                      <td>{x.returnedDate || '—'}</td>
                      <td>₱{x.fine || 0}</td>
                      <td><span className="status returned">Returned</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted" style={{ padding: '16px 0' }}>Completed returns will appear here.</p>
            )}
          </section>
        </div>
      )}
    </Shell>
  )
}

/* -------------------------------------------------------------------------- */
/* Admin / Librarian Dashboard Component                                      */
/* -------------------------------------------------------------------------- */
function AdminDashboard({ session, books, setBooks, onLogout, backendOnline }) {
  const [tab, setTab] = useState('overview')
  const [summary, setSummary] = useState({})
  const [overdueList, setOverdueList] = useState([])
  const [membersList, setMembersList] = useState([])
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const loadSummary = () => {
    request('/admin/summary')
      .then(setSummary)
      .catch(() => {})
  }

  const loadOverdue = () => {
    request('/admin/overdue')
      .then(setOverdueList)
      .catch(() => {})
  }

  const loadMembers = () => {
    request('/admin/members')
      .then(setMembersList)
      .catch(() => {})
  }

  useEffect(() => {
    loadSummary()
    loadOverdue()
    loadMembers()
  }, [books])

  const statusCategories = ['available', 'borrowed', 'lost', 'maintenance']

  const addBook = async (e) => {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(e.currentTarget))
    setBusy(true)
    try {
      await request('/books', {
        method: 'POST',
        body: JSON.stringify({
          title: data.title,
          isbn: data.isbn,
          author: data.author,
          category: data.category,
          publicationYear: Number(data.publicationYear),
          coverImage: '/placeholder-cover.svg'
        })
      })
      e.currentTarget.reset()
      const updated = await request('/books')
      setBooks(updated)
      setNotice(`"${data.title}" successfully added to the catalogue.`)
      setTab('catalog')
    } catch (err) {
      setNotice(err.message)
    } finally {
      setBusy(false)
    }
  }

  const updateBookStatus = async (id, newStatus) => {
    try {
      await request(`/books/${id}/status?value=${newStatus}`, { method: 'PATCH' })
      const updated = await request('/books')
      setBooks(updated)
      setNotice('Book status successfully updated.')
    } catch (err) {
      setNotice(err.message)
    }
  }

  const deleteBook = async (id, title) => {
    if (!window.confirm(`Are you sure you want to remove "${title}" from the library catalogue?`)) return
    try {
      await request(`/books/${id}`, { method: 'DELETE' })
      const updated = await request('/books')
      setBooks(updated)
      setNotice(`"${title}" has been deleted from the catalogue.`)
    } catch (err) {
      setNotice(err.message)
    }
  }

  const filteredBooks = useMemo(() => {
    return books.filter(b =>
      `${b.title} ${b.author} ${b.isbn} ${b.category}`.toLowerCase().includes(query.toLowerCase())
    )
  }, [books, query])

  return (
    <Shell
      session={session}
      activeTab={tab}
      onSelectTab={setTab}
      onLogout={onLogout}
      backendOnline={backendOnline}
    >
      {/* Metric Cards (All buttons link to appropriate tabs) */}
      <div className="metric-row">
        <div className="metric clickable" onClick={() => setTab('catalog')} title="Click to view full catalogue">
          <span>Total Titles</span>
          <strong>{summary.totalBooks ?? books.length}</strong>
          <small>registered in collection</small>
        </div>

        <div className="metric clickable" onClick={() => setTab('catalog')} title="Click to view available books">
          <span>Available</span>
          <strong>{summary.available ?? books.filter(b => b.status === 'AVAILABLE').length}</strong>
          <small>ready for circulation</small>
        </div>

        <div className="metric clickable" onClick={() => setTab('catalog')} title="Click to view active borrowed copies">
          <span>Borrowed</span>
          <strong>{summary.borrowed ?? books.filter(b => b.status === 'BORROWED').length}</strong>
          <small>currently checked out</small>
        </div>

        <div className="metric clickable" onClick={() => setTab('members')} title="Click to view library members">
          <span>Members</span>
          <strong>{summary.users ?? membersList.length}</strong>
          <small>active accounts</small>
        </div>

        <div className="metric clickable" onClick={() => setTab('overview')} title="Click to inspect overdue watchlist">
          <span>Overdue</span>
          <strong>{summary.overdue ?? overdueList.length}</strong>
          <small>{(summary.overdue || overdueList.length) > 0 ? 'Requires attention' : 'All loans on track'}</small>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>
          Status overview
        </button>
        <button className={tab === 'catalog' ? 'active' : ''} onClick={() => setTab('catalog')}>
          Manage catalogue ({books.length})
        </button>
        <button className={tab === 'add' ? 'active' : ''} onClick={() => setTab('add')}>
          Add new book
        </button>
        <button className={tab === 'members' ? 'active' : ''} onClick={() => setTab('members')}>
          Members directory ({membersList.length})
        </button>
      </div>

      {notice && (
        <div className="notice animate-page">
          <span>{notice}</span>
          <button className="notice-close" onClick={() => setNotice('')}><X size={16} /></button>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {tab === 'overview' && (
        <div className="admin-grid animate-page">
          <div className="table-panel">
            <h2>Collection Status Distribution</h2>
            <p className="muted" style={{ margin: '8px 0 20px', fontSize: '0.85rem' }}>
              Real-time balance of collection condition and availability.
            </p>
            {statusCategories.map(key => {
              const count = summary[key] || 0
              const total = summary.totalBooks || books.length || 1
              const percent = Math.max(4, (count / total) * 100)
              return (
                <div className="bar-line" key={key}>
                  <span style={{ textTransform: 'capitalize' }}>{key.replace('_', ' ')}</span>
                  <div>
                    <i style={{ width: `${percent}%` }} />
                  </div>
                  <strong>{count}</strong>
                </div>
              )
            })}
          </div>

          <div className="table-panel">
            <div className="table-header-row">
              <h2>Overdue Watchlist</h2>
              <span className="label" style={{ color: overdueList.length ? '#c81e1e' : '#2f7653' }}>
                {overdueList.length ? `${overdueList.length} overdue` : 'Clean record'}
              </span>
            </div>
            {overdueList.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Borrower</th>
                    <th>Book</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueList.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.user?.username || 'Member'}</strong></td>
                      <td>{r.book?.title}</td>
                      <td style={{ color: '#c81e1e', fontWeight: 600 }}>{r.dueDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted" style={{ padding: '20px 0' }}>
                No active loans are overdue at this time. All borrowed copies are within their 7-day loan window.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MANAGE CATALOGUE */}
      {tab === 'catalog' && (
        <section className="table-panel animate-page">
          <div className="table-header-row">
            <div className="search-wrap" style={{ width: '420px' }}>
              <Search size={18} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search catalogue by title, author, or ISBN…"
              />
            </div>

            <button className="primary" onClick={() => setTab('add')}>
              <PlusCircle size={17} /> Add new book
            </button>
          </div>

          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Category</th>
                <th>ISBN</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map(b => (
                <tr key={b.id}>
                  <td><strong>{b.title}</strong></td>
                  <td>{b.author}</td>
                  <td>{b.category}</td>
                  <td><small>{b.isbn}</small></td>
                  <td>
                    <select
                      className="status-select"
                      value={b.status}
                      onChange={e => updateBookStatus(b.id, e.target.value)}
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="BORROWED">BORROWED</option>
                      <option value="LOST">LOST</option>
                      <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className="btn-action-danger"
                      onClick={() => deleteBook(b.id, b.title)}
                      title="Delete book from catalogue"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* TAB 3: ADD NEW BOOK */}
      {tab === 'add' && (
        <form className="form-panel animate-page" onSubmit={addBook}>
          <h2>Add a New Book to Catalogue</h2>
          <p className="muted" style={{ margin: '6px 0 16px', fontSize: '0.88rem' }}>
            Provide book cataloging details. Duplicate ISBNs will be rejected.
          </p>

          <div className="form-grid">
            <Field label="Book Title" required name="title" />
            <Field label="ISBN" required name="isbn" />
            <Field label="Author" required name="author" />
            <Field label="Category / Genre" required name="category" />
            <Field label="Publication Year" type="number" required name="publicationYear" />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Add to catalogue'}
            </button>
            <button className="secondary" type="button" onClick={() => setTab('catalog')}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: MEMBERS DIRECTORY */}
      {tab === 'members' && (
        <section className="table-panel animate-page">
          <div className="table-header-row">
            <h2>Registered Members Directory ({membersList.length})</h2>
            <button className="secondary" onClick={loadMembers}>
              <RefreshCw size={15} /> Refresh
            </button>
          </div>

          {membersList.length ? (
            <table>
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Outstanding Fine</th>
                </tr>
              </thead>
              <tbody>
                {membersList.map(u => (
                  <tr key={u.id || u.username}>
                    <td><strong>{u.firstName} {u.middleName ? u.middleName + ' ' : ''}{u.lastName}</strong></td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`status ${u.role === 'LIBRARIAN' ? 'active' : 'available'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: u.outstandingFine > 0 ? '#c81e1e' : '#2f7653', fontWeight: 600 }}>
                        ₱{u.outstandingFine || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted" style={{ padding: '20px 0' }}>No members registered yet.</p>
          )}
        </section>
      )}
    </Shell>
  )
}

/* -------------------------------------------------------------------------- */
/* Reusable Book Card                                                         */
/* -------------------------------------------------------------------------- */
function BookCard({ book, action, actionLabel }) {
  return (
    <article className="book-card animate-page">
      <img src={book.coverImage || '/placeholder-cover.svg'} alt={book.title} />
      <div className="book-card-body">
        <div className="card-top">
          <span className={`status ${book.status?.toLowerCase()}`}>
            {book.status?.replace('_', ' ')}
          </span>
          <span className="year">{book.publicationYear}</span>
        </div>
        <h3>{book.title}</h3>
        <p>{book.author}</p>
        <small>{book.category} · ISBN {book.isbn}</small>
        <button className="text-button" onClick={action}>
          {actionLabel} →
        </button>
      </div>
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/* Main App Router & State Management                                        */
/* -------------------------------------------------------------------------- */
function App() {
  const [mode, setMode] = useState(null)
  const [session, setSession] = useState(null)
  const [books, setBooks] = useState(fallbackBooks)
  const [backendOnline, setBackendOnline] = useState(false)

  // Poll / check backend connection on load
  const checkBackend = () => {
    request('/books')
      .then(data => {
        if (Array.isArray(data) && data.length) {
          setBooks(data)
        }
        setBackendOnline(true)
      })
      .catch(() => {
        setBackendOnline(false)
      })
  }

  useEffect(() => {
    checkBackend()
    const timer = setInterval(checkBackend, 5000)
    return () => clearInterval(timer)
  }, [])

  const handleLogout = () => {
    setSession(null)
    setMode(null)
  }

  if (!session) {
    return mode ? (
      <Auth
        mode={mode}
        onBack={() => setMode(null)}
        onLogin={setSession}
        backendOnline={backendOnline}
      />
    ) : (
      <Entry
        onChoose={setMode}
        backendOnline={backendOnline}
      />
    )
  }

  return session.role === 'LIBRARIAN' ? (
    <AdminDashboard
      session={session}
      books={books}
      setBooks={setBooks}
      onLogout={handleLogout}
      backendOnline={backendOnline}
    />
  ) : (
    <MemberDashboard
      session={session}
      books={books}
      setBooks={setBooks}
      onLogout={handleLogout}
      backendOnline={backendOnline}
    />
  )
}

createRoot(document.getElementById('root')).render(<App />)

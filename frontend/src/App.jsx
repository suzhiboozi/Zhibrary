import React, { useEffect, useMemo, useState } from 'react'
import {
  Settings,
  ArrowRight,
  Sparkles,
  Bookmark,
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

const API = '/api'

const fallbackBooks = [
  { id: 1, title: 'El Filibusterismo', isbn: '9789712724154', author: 'Jose Rizal', category: 'Historical Fiction', publicationYear: 1891, status: 'AVAILABLE', coverImage: '/placeholder-cover.svg' },
  { id: 2, title: 'Noli Me Tangere', isbn: '9789712724161', author: 'Jose Rizal', category: 'Historical Fiction', publicationYear: 1887, status: 'AVAILABLE', coverImage: '/placeholder-cover.svg' },
  { id: 3, title: 'Pride and Prejudice', isbn: '9780141439518', author: 'Jane Austen', category: 'Classics', publicationYear: 1813, status: 'BORROWED', coverImage: '/placeholder-cover.svg' },
  { id: 4, title: 'The Great Gatsby', isbn: '9780743273565', author: 'F. Scott Fitzgerald', category: 'Fiction', publicationYear: 1925, status: 'AVAILABLE', coverImage: '/placeholder-cover.svg' },
  { id: 5, title: 'Pathfit 2', isbn: '9781000000002', author: 'PLM Professors', category: 'Educational', publicationYear: 2025, status: 'AVAILABLE', coverImage: '/placeholder-cover.svg' },
]

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      credentials: 'same-origin',
      signal: options.signal || AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json', ...options.headers }
    })
  } catch (error) {
    throw new Error(error.name === 'TimeoutError' ? 'The library took too long to respond. Please try again.' : 'Cannot reach the library. Check that the backend is running and try again.')
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('libris:session-expired'))
    throw new Error(data.message || `Request failed with status ${response.status}`)
  }
  return data
}

/* -------------------------------------------------------------------------- */
/* Shell Component (Sidebar + Navigation + Header Integration)                 */
/* -------------------------------------------------------------------------- */
function Footer({ onChoose }) {
  return <footer className="site-footer"><div className="footer-brand"><Library size={20} /><strong>Libris</strong><span>A little curiosity. A whole new world.</span></div><div>{onChoose && <button onClick={() => onChoose('LIBRARIAN')}>Librarian access <ArrowRight size={14}/></button>}<span>Made for the love of reading.</span></div></footer>
}

function Shell({ session, activeTab, onSelectTab, onLogout, backendOnline, children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const staff = session?.role === 'LIBRARIAN'
  const links = staff ? [['overview', LayoutDashboard, 'Overview'], ['catalog', Library, 'Collection'], ['add', PlusCircle, 'Add a book'], ['members', Users, 'Members'], ['approvals', UserCheck, 'Approvals'], ['fines', Settings, 'Fines']] : [['overview', LayoutDashboard, 'Overview'], ['catalog', Library, 'Discover books'], ['borrowed', Bookmark, 'My reading shelf']]
  const titles = { overview: staff ? 'Your library, at a glance.' : `A new chapter awaits, ${session.name?.split(' ')[0] || session.username}.`, catalog: staff ? 'Care for your collection.' : 'Find your next great read.', add: 'Make room for a new story.', members: 'Meet your reading community.', approvals: 'Review borrowing requests.', fines: 'Manage overdue fines.', borrowed: 'Your personal reading shelf.' }
  return <div className="app-shell animate-page">
    <header className="top-header"><button className="brand" onClick={() => onSelectTab('overview')}><span className="brand-mark"><Library size={22}/></span>Libris<span className="workspace-tag">{staff ? 'LIBRARIAN' : 'MEMBER'}</span></button>
      <button className="mobile-menu" aria-label="Toggle navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X/> : <Menu/>}</button>
      <nav className={`top-nav ${mobileOpen ? 'is-open' : ''}`} aria-label="Main navigation">{links.map(([key, Icon, label]) => <button key={key} aria-current={activeTab === key ? 'page' : undefined} className={activeTab === key ? 'active' : ''} onClick={() => { onSelectTab(key); setMobileOpen(false) }}><Icon size={17}/>{label}</button>)}</nav>
      <details className="account-menu">
        <summary className="profile-exit" aria-label="View profile" title="View profile">
          <span className="avatar">{(session.name || session.username || 'L').slice(0,1)}</span>
          <span>{session.username}</span><UserCheck size={16}/>
        </summary>
        <div className="account-panel">
          <p className="label">YOUR ACCOUNT</p>
          <strong>{session.name || session.username}</strong>
          <p>@{session.username}</p>
          <span className="account-role">{staff ? 'Librarian' : 'Member'}</span>
          <button type="button" className="account-signout" onClick={onLogout}><LogOut size={16}/> Sign out</button>
        </div>
      </details>
    </header>
    <main className="workspace"><div className="page-header"><div><p className="label">{staff ? 'THE LIBRARIAN’S DESK' : 'YOUR READING JOURNEY'}</p><h1>{titles[activeTab]}</h1><p className="muted">{staff ? 'Keep stories circulating and your community connected.' : 'Discover a story, make it yours, and keep your curiosity growing.'}</p></div><span className={`backend-badge ${backendOnline ? 'online' : 'offline'}`}><span className="dot"/>{backendOnline ? 'Library connected' : 'Preview · library offline'}</span></div>{children}</main><Footer/>
  </div>
}

function Entry({ onChoose, backendOnline }) {
  return <div className="landing animate-page">
    <header className="landing-header"><button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><span className="brand-mark"><Library size={23}/></span>Libris</button><nav aria-label="Welcome navigation"><a href="#collection">The collection</a><a href="#how-it-works">How it works</a><button className="secondary" onClick={() => onChoose('USER')}>Member sign in <ArrowRight size={16}/></button></nav></header>
    <main><section className="landing-hero"><div className="hero-copy"><p className="label"><span className="small-line"/> YOUR NEXT CHAPTER STARTS HERE</p><h1>A world of stories.<br/><em>A place for you.</em></h1><p className="hero-description">Step away from the everyday. Discover timeless classics, new perspectives, and the book you didn’t know you needed.</p><div className="hero-actions"><button className="primary" onClick={() => onChoose('USER')}>Find your next read <ArrowRight size={18}/></button><a href="#collection">Explore the shelves <ArrowRight size={16}/></a></div><div className="hero-note"><span className="round-icon"><BookOpen size={20}/></span><p>A library at your fingertips.<br/><strong>Browse. Borrow. Begin again.</strong></p></div></div>
    <div className="hero-art"><span className="orbit-caption">GOOD BOOKS. ENDLESS POSSIBILITIES.</span><div className="hero-orbit"/><div className="hero-books">{[0,1,2].map((n) => <img key={n} src={`/covers/cover-${n}.svg`} alt={fallbackBooks[n].title} className={`hero-book book-${n}`}/>)}</div><div className="floating-note"><Sparkles size={21}/><div><strong>One more chapter?</strong><span>There’s always a story waiting.</span></div></div><span className="art-caption">THE LIBRIS COLLECTION · EST. FOR EVERY READER</span></div></section>
    <section className="reading-strip"><span><BookOpen/> Stories worth discovering</span><span><Bookmark/> A shelf of your own</span><span><Clock/> Clear return dates</span></section>
    <section className="landing-section" id="collection"><div className="section-heading"><div><p className="label">BETWEEN THE COVERS</p><h2>Old favorites. New discoveries.</h2></div><button className="text-button" onClick={() => onChoose('USER')}>Browse the collection <ArrowRight size={17}/></button></div><div className="featured-books">{fallbackBooks.slice(0,4).map((book,i) => <button className="featured-book" key={book.id} onClick={() => onChoose('USER')}><div className={`cover-stage stage-${i}`}><img src={`/covers/cover-${i}.svg`} alt={`${book.title} cover`}/><span className="cover-arrow"><ArrowRight size={20}/></span></div><span className="label">{book.category}</span><h3>{book.title}</h3><p>{book.author}</p></button>)}</div></section>
    <section className="how-section" id="how-it-works"><div><p className="label">LESS FRICTION. MORE FICTION.</p><h2>Your next adventure,<br/>in three little steps.</h2><p className="muted">More time with the stories you love.</p></div><div className="steps">{[[Search,'Find your story','Explore by title, author, or genre.'],[BookOpen,'Make it your next read','Request a book and wait for librarian approval.'],[RefreshCw,'Return. Rediscover.','Manage your loans and start a new chapter.']].map(([Icon,title,copy],i) => <div className="reading-step" key={title}><span className="step-icon"><Icon size={23}/></span><div><small>0{i+1}</small><h3>{title}</h3><p>{copy}</p></div></div>)}</div></section>
    <section className="join-banner"><Sparkles size={30}/><h2>Great stories are better shared.</h2><p>Your library community is waiting. Turn the first page.</p><button className="primary" onClick={() => onChoose('USER')}>Join the reading community <ArrowRight size={17}/></button></section></main><Footer onChoose={onChoose}/>
  </div>
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
          await request('/auth/logout', { method: 'POST' })
          throw new Error('This account does not have librarian privileges.')
        }
        onLogin(data)
      }
    } catch (err) {
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
              Default staff credentials: <button type="button" className="demo-chip" onClick={() => fillDemo('admin', 'admin123')}>admin / admin123</button>
            </p>
          ) : (
            <div style={{ margin: '6px 0 0' }}>
              <p style={{ margin: '0 0 10px' }}>
                Dummy member account: <button type="button" className="demo-chip" onClick={() => fillDemo('member', 'member123')}>member / member123</button>
              </p>
              <button type="button" className="secondary full" disabled={busy} onClick={() => fillDemo('member', 'member123')}>
                Fill member credentials
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
      <input name={name} type={type} value={onChange ? (value || '') : undefined} onChange={onChange} required={required} />
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
  const [borrowRequests, setBorrowRequests] = useState([])
  const [notice, setNotice] = useState('')
  const [filterMode, setFilterMode] = useState('all')

  const fetchHistory = () => {
    if (session?.username) {
      Promise.all([request(`/borrow/${encodeURIComponent(session.username)}`), request(`/borrow/requests/${encodeURIComponent(session.username)}`)])
        .then(([loans, requests]) => { setHistory(loans); setBorrowRequests(requests) })
        .catch(e => setNotice(e.message))
    }
  }

  useEffect(() => {
    fetchHistory()
    const timer = setInterval(fetchHistory, 5000)
    return () => clearInterval(timer)
  }, [session.username])

  const activeLoans = useMemo(() => history.filter(x => x.status === 'ACTIVE'), [history])
  const returnedLoans = useMemo(() => history.filter(x => x.status === 'RETURNED'), [history])
  const pendingRequests = borrowRequests.filter(r => r.status === 'PENDING')
  const requestedBookIds = new Set(pendingRequests.map(r => r.book?.id))
  const outstandingFine = history[0]?.user?.outstandingFine ?? session.fine ?? 0

  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const match = `${b.title} ${b.author} ${b.category} ${b.isbn}`.toLowerCase().includes(query.toLowerCase())
      if (!match) return false
      if (filterMode === 'available') return b.status === 'AVAILABLE'
      return true
    })
  }, [books, query, filterMode])

  const [requestBook, setRequestBook] = useState(null)
  const [returnMode, setReturnMode] = useState('duration')
  const [durationDays, setDurationDays] = useState('7')
  const [returnDate, setReturnDate] = useState('')
  const [sendingRequest, setSendingRequest] = useState(false)
  const [requestError, setRequestError] = useState('')
  const localDate = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1)
  const latest = new Date(); latest.setDate(latest.getDate()+7)
  useEffect(() => { if (requestBook) document.getElementById('return-choice-title')?.focus() }, [requestBook])
  const borrow = (book) => { if (sendingRequest) return; setRequestBook(book); setReturnMode('duration'); setDurationDays('7'); setReturnDate(localDate(latest)); setRequestError('') }
  const submitBorrowRequest = async event => {
    event.preventDefault()
    const book = requestBook
    if (returnMode === 'duration' && (!Number.isInteger(Number(durationDays)) || Number(durationDays)<1 || Number(durationDays)>7)) { setRequestError('Choose a whole number from 1 to 7 days.'); return }
    if (returnMode === 'date' && (!returnDate || returnDate<localDate(tomorrow) || returnDate>localDate(latest))) { setRequestError('Choose a return date from tomorrow through seven days from today.'); return }
    setSendingRequest(true); setRequestError('')
    try {
      await request('/borrow', {
        method: 'POST',
        body: JSON.stringify({ username: session.username, bookId: String(book.id), ...(returnMode === 'duration' ? {durationDays: Number(durationDays)} : {returnDate}) })
      })
      setRequestBook(null)
      setNotice(`Request sent for "${book.title}". A librarian must approve it before the loan begins.`)
      // Refresh books & user loans
      const updated = await request('/books')
      setBooks(updated)
      fetchHistory()
    } catch (e) {
      setRequestError(e.message)
    } finally { setSendingRequest(false) }
  }

  const waitlist = async (book) => {
    try {
      await request('/borrow/waitlist', {
        method: 'POST',
        body: JSON.stringify({ username: session.username, bookId: String(book.id) })
      })
      setNotice(`You joined the waitlist for "${book.title}". Your request has been added to the library queue.`)
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
      {requestBook && <section className="table-panel return-choice" aria-labelledby="return-choice-title">
        <h2 id="return-choice-title" tabIndex={-1}>Choose your return schedule</h2><p>Requesting <strong>{requestBook.title}</strong>. Maximum loan duration is seven days; librarian approval is required.</p>
        <form onSubmit={submitBorrowRequest}>
          <label className="field"><span>Return schedule type</span><select value={returnMode} onChange={e => setReturnMode(e.target.value)} disabled={sendingRequest}><option value="duration">Duration in days</option><option value="date">Specific return date</option></select></label>
          {returnMode === 'duration' ? <label className="field"><span>Borrowing duration in days</span><input type="number" min="1" max="7" step="1" required value={durationDays} disabled={sendingRequest} onChange={e => setDurationDays(e.target.value)}/></label> : <label className="field"><span>Requested return date</span><input type="date" min={localDate(tomorrow)} max={localDate(latest)} required value={returnDate} disabled={sendingRequest} onChange={e => setReturnDate(e.target.value)}/></label>}
          <p className="muted">Durations begin on approval. A specific return date stays fixed and must still be in the future when approved.</p>
          {requestError && <p className="error-message" role="alert">{requestError}</p>}
          <div className="approval-actions"><button className="primary" type="submit" disabled={sendingRequest || !backendOnline}>{sendingRequest ? 'Sending…' : 'Submit borrowing request'}</button><button className="secondary" type="button" disabled={sendingRequest} onClick={() => setRequestBook(null)}>Cancel</button></div>
        </form>
      </section>}

      {/* Metric Cards (All buttons link to appropriate tabs) */}
      <div className="metric-row">
        <button type="button" className="metric clickable" onClick={() => setTab('borrowed')} title="Click to view your active books">
          <span><Bookmark size={18}/> Active Borrowed</span>
          <strong>{activeLoans.length}</strong>
          <small>of 3 allowed copies</small>
        </button>

        <button type="button" className="metric clickable" onClick={() => setTab('catalog')} title="Click to browse available titles">
          <span><Library size={18}/> Available in Library</span>
          <strong>{books.filter(b => b.status === 'AVAILABLE').length}</strong>
          <small>titles ready to borrow</small>
        </button>

        <button type="button" className="metric clickable" onClick={() => setTab('borrowed')} title="Click to review fine balance">
          <span><Clock size={18}/> Outstanding Fines</span>
          <strong>₱{outstandingFine}</strong>
          <small>{outstandingFine > 0 ? 'Fines must be cleared' : 'Good standing'}</small>
        </button>
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
        <div className="notice animate-page" role="status" aria-live="polite">
          <span>{notice}</span>
          <button aria-label="Dismiss notification" className="notice-close" onClick={() => setNotice('')}><X size={16} /></button>
        </div>
      )}

      {(tab === 'overview' || tab === 'borrowed') && borrowRequests.some(r => r.status !== 'APPROVED') && <section className="table-panel request-panel">
        <h2>Borrowing requests</h2><p className="muted">Your loan and due date begin only after a librarian approves your request.</p>
        <table><thead><tr><th>Book</th><th>Requested</th><th>Return schedule</th><th>Decision</th></tr></thead><tbody>
          {borrowRequests.filter(r => r.status !== 'APPROVED').map(r => <tr key={r.id}><td><strong>{r.book?.title}</strong></td><td>{r.requestedDate}</td><td>{r.requestedReturnDate || `${r.durationDays || 7} days after approval`}</td><td><span className={`status request-${r.status?.toLowerCase()}`}>{r.status === 'PENDING' ? 'Awaiting approval' : 'Rejected'}</span></td></tr>)}
        </tbody></table>
      </section>}

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
                  actionLabel={requestedBookIds.has(book.id) ? 'Awaiting approval' : 'Request to borrow'}
                  disabled={!backendOnline || outstandingFine > 0 || activeLoans.length >= 3 || requestedBookIds.has(book.id)}
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
                aria-label="Search books"
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
            {!filteredBooks.length && <div className="empty-state"><Search size={28}/><h3>No books found</h3><p>Try a different title, author, or category.</p><button className="secondary" onClick={() => { setQuery(''); setFilterMode('all') }}>Clear filters</button></div>}
            {filteredBooks.map(book => (
              <BookCard
                key={book.id}
                book={book}
                action={book.status === 'AVAILABLE' ? () => borrow(book) : () => waitlist(book)}
                actionLabel={requestedBookIds.has(book.id) ? 'Awaiting approval' : book.status === 'AVAILABLE' ? 'Request to borrow' : book.status === 'BORROWED' ? 'Join waitlist' : 'Currently unavailable'}
                disabled={!backendOnline || requestedBookIds.has(book.id) || !['AVAILABLE', 'BORROWED'].includes(book.status) || (book.status === 'AVAILABLE' && (outstandingFine > 0 || activeLoans.length >= 3))}
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
                    const today = new Date()
                    const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
                    const isOverdue = x.dueDate < localDate
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
                            {isOverdue ? 'Overdue (fine applies)' : 'Active Loan'}
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
function FineManagement({ backendOnline }) {
  const [rate, setRate] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [loans, setLoans] = useState([])
  const [adjustments, setAdjustments] = useState([])
  const [selected, setSelected] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [dueDate, setDueDate] = useState('')
  const now = new Date()
  const [returnDate, setReturnDate] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`)
  const [calculation, setCalculation] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const loadRecords = async () => {
    const [records, history] = await Promise.all([request('/admin/fines/loans'), request('/admin/fines/adjustments')])
    setLoans(records); setAdjustments(history)
  }
  useEffect(() => {
    let active = true
    Promise.all([request('/admin/fines/policy'), request('/admin/fines/loans'), request('/admin/fines/adjustments')]).then(([policy, records, history]) => {
      if (active) { setRate(String(policy.dailyRate)); setLoans(records); setAdjustments(history); setLoaded(true) }
    }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [])
  const run = async action => {
    setBusy(true); setError(''); setNotice('')
    try { await action() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const saveRate = event => {
    event.preventDefault()
    run(async () => {
      const policy = await request('/admin/fines/policy', { method:'PUT', body:JSON.stringify({ dailyRate:Number(rate) }) })
      setRate(String(policy.dailyRate)); setCalculation(null); setNotice('Daily fine rate saved. It applies when books are returned; previously assessed fines stay unchanged.')
    })
  }
  const calculate = event => {
    event.preventDefault(); setCalculation(null)
    run(async () => setCalculation(await request('/admin/fines/calculate', { method:'POST', body:JSON.stringify({ dueDate, returnDate }) })))
  }
  const adjust = event => {
    event.preventDefault()
    run(async () => {
      await request(`/admin/fines/loans/${selected}/adjust`, { method:'POST', body:JSON.stringify({ amount:Number(amount), reason }) })
      await loadRecords(); setNotice('Fine adjusted and the member’s outstanding balance updated.'); setReason('')
    })
  }
  return <div className="fine-management">
    <p className="muted">Set the daily overdue rate, preview a calculation, or adjust an assessed fine on a returned book.</p>
    {error && <p role="alert" className="error-message">{error}</p>}
    {notice && <p role="status" className="success-message">{notice}</p>}
    <div className="admin-grid">
      <form className="form-panel" onSubmit={saveRate}><h2>Daily overdue fine</h2><p className="muted">The saved rate is used at return time. A book returned on or before its due date has no overdue fine.</p>
        <label className="field"><span>Daily fine rate in pesos</span><input type="number" min="0" max="10000" step="0.01" required value={rate} disabled={!loaded || busy} onChange={e => setRate(e.target.value)}/></label>
        <p className="muted">Use 0 to disable daily overdue charges. Changing this rate does not recalculate fines already assessed.</p><button className="primary" disabled={!loaded || busy || !backendOnline}>Save fine rate</button>
      </form>
      <form className="form-panel" onSubmit={calculate}><h2>Fine calculator</h2><p className="muted">Uses the saved rate. A calculation is a preview and does not charge a member.</p>
        <label className="field"><span>Book due date</span><input type="date" required value={dueDate} onChange={e => { setDueDate(e.target.value); setCalculation(null) }}/></label>
        <label className="field"><span>Actual or planned return date</span><input type="date" required value={returnDate} onChange={e => { setReturnDate(e.target.value); setCalculation(null) }}/></label>
        <button className="primary" disabled={!loaded || busy || !backendOnline}>Compute fine</button>
        {calculation && <div className="fine-calculation" role="status"><strong>₱{Number(calculation.total).toFixed(2)}</strong><span>{calculation.overdueDays} overdue day{calculation.overdueDays === 1 ? '' : 's'} × ₱{Number(calculation.dailyRate).toFixed(2)} per day</span></div>}
      </form>
    </div>
    <form className="form-panel" onSubmit={adjust}><h2>Adjust an assessed fine</h2><p className="muted">Choose a returned loan. The difference updates the member’s balance; the librarian and reason are recorded. Use 0 to waive this loan’s fine.</p>
      <label className="field"><span>Returned loan</span><select required value={selected} disabled={!loaded || busy} onChange={e => { setSelected(e.target.value); const loan=loans.find(l => String(l.id)===e.target.value); setAmount(loan ? String(loan.fine) : ''); setReason('') }}><option value="">Select a returned loan</option>{loans.map(l => <option key={l.id} value={l.id}>#{l.id} · {l.user?.username} · {l.book?.title} · ₱{Number(l.fine).toFixed(2)}</option>)}</select></label>
      <div className="form-grid"><label className="field"><span>Adjusted fine in pesos</span><input type="number" min="0" max="1000000" step="0.01" required value={amount} disabled={!selected || busy} onChange={e => setAmount(e.target.value)}/></label><label className="field"><span>Reason for adjustment</span><input required maxLength="255" value={reason} disabled={!selected || busy} onChange={e => setReason(e.target.value)}/></label></div>
      {!loans.length && loaded && <p className="muted">No returned loans are available to adjust.</p>}
      <button className="primary" disabled={!loaded || !selected || busy || !backendOnline}>Apply fine adjustment</button>
    </form>
    <section className="table-panel"><h2>Recent fine adjustments</h2>{adjustments.length ? <table><thead><tr><th>Loan</th><th>Previous fine</th><th>New fine</th><th>Reason</th><th>Librarian</th></tr></thead><tbody>{adjustments.map(a => <tr key={a.id}><td>#{a.loan?.id} · {a.loan?.user?.username}</td><td>₱{Number(a.previousFine).toFixed(2)}</td><td>₱{Number(a.newFine).toFixed(2)}</td><td>{a.reason}</td><td>{a.librarian}<br/><small>{a.adjustedAt?.replace('T',' ').slice(0,19)}</small></td></tr>)}</tbody></table> : <p className="muted">Adjustments will appear here after a fine is changed.</p>}</section>
  </div>
}

function AdminDashboard({ session, books, setBooks, onLogout, backendOnline }) {
  const [tab, setTab] = useState('overview')
  const [summary, setSummary] = useState({})
  const [overdueList, setOverdueList] = useState([])
  const [membersList, setMembersList] = useState([])
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [pendingRequests, setPendingRequests] = useState([])
  const [reviewing, setReviewing] = useState(null)

  const loadRequests = () => request('/admin/borrow-requests').then(setPendingRequests).catch(e => setNotice(e.message))
  const reviewRequest = async (id, decision) => {
    setReviewing(id)
    try {
      const reviewed = await request(`/admin/borrow-requests/${id}/${decision}`, { method: 'POST' })
      setNotice(decision === 'approve' ? `Request approved. Return due ${reviewed.loan.dueDate}.` : 'Borrowing request rejected.')
      await loadRequests()
      setBooks(await request('/books'))
    } catch (e) { setNotice(e.message) } finally { setReviewing(null) }
  }

  const loadSummary = () => {
    request('/admin/summary')
      .then(setSummary)
      .catch(e => setNotice(e.message))
  }

  const loadOverdue = () => {
    request('/admin/overdue')
      .then(setOverdueList)
      .catch(e => setNotice(e.message))
  }

  const loadMembers = () => {
    request('/admin/members')
      .then(setMembersList)
      .catch(e => setNotice(e.message))
  }

  useEffect(() => {
    loadSummary()
    loadOverdue()
    loadMembers()
    loadRequests()
  }, [books])

  const statusCategories = ['available', 'borrowed', 'lost', 'maintenance']

  const addBook = async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))
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
          coverImage: data.coverImage || '/placeholder-cover.svg'
        })
      })
      form.reset()
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
        <button type="button" className="metric clickable" onClick={() => setTab('catalog')} title="Click to view full catalogue">
          <span><Library size={18}/> Total Titles</span>
          <strong>{summary.totalBooks ?? books.length}</strong>
          <small>registered in collection</small>
        </button>

        <button type="button" className="metric clickable" onClick={() => setTab('catalog')} title="Click to view available books">
          <span><BookOpen size={18}/> Available</span>
          <strong>{summary.available ?? books.filter(b => b.status === 'AVAILABLE').length}</strong>
          <small>ready for circulation</small>
        </button>

        <button type="button" className="metric clickable" onClick={() => setTab('catalog')} title="Click to view active borrowed copies">
          <span><Bookmark size={18}/> Borrowed</span>
          <strong>{summary.borrowed ?? books.filter(b => b.status === 'BORROWED').length}</strong>
          <small>currently checked out</small>
        </button>

        <button type="button" className="metric clickable" onClick={() => setTab('members')} title="Click to view library members">
          <span><Users size={18}/> Members</span>
          <strong>{summary.users ?? membersList.length}</strong>
          <small>active accounts</small>
        </button>

        <button type="button" className="metric clickable" onClick={() => setTab('overview')} title="Click to inspect overdue watchlist">
          <span><Clock size={18}/> Overdue</span>
          <strong>{summary.overdue ?? overdueList.length}</strong>
          <small>{(summary.overdue || overdueList.length) > 0 ? 'Requires attention' : 'All loans on track'}</small>
        </button>
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
        <div className="notice animate-page" role="status" aria-live="polite">
          <span>{notice}</span>
          <button aria-label="Dismiss notification" className="notice-close" onClick={() => setNotice('')}><X size={16} /></button>
        </div>
      )}

      {tab === 'overview' && <section className="approval-callout"><UserCheck size={24}/><div><strong>{pendingRequests.length} borrowing request{pendingRequests.length === 1 ? '' : 's'} awaiting approval</strong><p>Review requests before books leave the library.</p></div><button className="secondary" onClick={() => setTab('approvals')}>Review requests</button></section>}
      {tab === 'fines' && <FineManagement backendOnline={backendOnline}/>}
      {tab === 'approvals' && <section className="table-panel request-panel">
        <div className="table-header-row"><h2>Pending borrowing requests ({pendingRequests.length})</h2><button className="secondary" onClick={loadRequests}><RefreshCw size={16}/> Refresh</button></div>
        <p className="muted">Approval starts the loan using the member’s selected return schedule, with a seven-day maximum. Availability, fines, overdue loans, and the three-book limit are checked again.</p>
        {pendingRequests.length ? <table><thead><tr><th>Member</th><th>Book</th><th>Requested</th><th>Return schedule</th><th>Actions</th></tr></thead><tbody>{pendingRequests.map(r => <tr key={r.id}><td>{r.user?.firstName} {r.user?.lastName}<br/><small>@{r.user?.username}</small></td><td><strong>{r.book?.title}</strong><br/><small>{r.book?.status === 'AVAILABLE' ? 'Available' : 'Currently unavailable'}</small></td><td>{r.requestedDate}</td><td>{r.requestedReturnDate || `${r.durationDays || 7} days after approval`}</td><td><div className="approval-actions"><button className="primary" aria-label={`Approve ${r.book?.title} for ${r.user?.username}`} disabled={!backendOnline || reviewing !== null || r.book?.status !== 'AVAILABLE'} onClick={() => reviewRequest(r.id, 'approve')}>Approve</button><button className="secondary" aria-label={`Reject ${r.book?.title} for ${r.user?.username}`} disabled={!backendOnline || reviewing !== null} onClick={() => reviewRequest(r.id, 'reject')}>Reject</button></div></td></tr>)}</tbody></table> : <div className="empty-state"><CheckCircle size={28}/><h3>No requests awaiting review</h3><p>New member borrowing requests will appear here.</p></div>}
      </section>}


      {/* TAB 1: OVERVIEW */}
      {tab === 'overview' && (
        <div className="admin-grid animate-page">
          <div className="table-panel">
            <h2>Collection Status Distribution</h2>
            <p className="muted" style={{ margin: '8px 0 20px', fontSize: '0.85rem' }}>
              Real-time balance of collection condition and availability.
            </p>
            {statusCategories.map(key => {
              const count = summary[key] ?? books.filter(b => b.status === (key === 'maintenance' ? 'UNDER_MAINTENANCE' : key.toUpperCase())).length
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
                No active loans are overdue at this time. All borrowed copies are within their assigned loan window.
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
                aria-label="Search catalogue"
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
              {!filteredBooks.length && <tr><td colSpan={6}><div className="empty-state"><Search size={28}/><h3>No matching titles</h3><p>Try a different search or add a new book.</p></div></td></tr>}
              {filteredBooks.map(b => (
                <tr key={b.id}>
                  <td><div className="inventory-title"><BookCover book={b}/><strong>{b.title}</strong></div></td>
                  <td>{b.author}</td>
                  <td>{b.category}</td>
                  <td><small>{b.isbn}</small></td>
                  <td>
                    <select
                      className="status-select"
                      value={b.status}
                      disabled={!backendOnline}
                      aria-label={`Status for ${b.title}`}
                      onChange={e => updateBookStatus(b.id, e.target.value)}
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="BORROWED" disabled>BORROWED (via loan)</option>
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
            <Field label="Cover image URL (optional)" type="url" name="coverImage" />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="primary" type="submit" disabled={busy || !backendOnline}>
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
function BookCover({ book }) {
  const [failed, setFailed] = useState(false)
  const known = fallbackBooks.findIndex(item => item.title.toLowerCase() === book.title?.toLowerCase())
  const custom = book.coverImage && !book.coverImage.includes('placeholder') ? book.coverImage : null
  const src = custom || (known >= 0 ? `/covers/cover-${known}.svg` : null)
  useEffect(() => setFailed(false), [src])
  if (!src || failed) return <div className={`generated-cover cover-tone-${(book.id || 0) % 3}`} role="img" aria-label={`${book.title} placeholder cover`}><span>THE LIBRIS COLLECTION</span><BookOpen size={25}/><strong>{book.title}</strong><small>{book.author}</small></div>
  return <img loading="lazy" src={src} alt={`${book.title} book cover`} onError={() => setFailed(true)}/>
}

function BookCard({ book, action, actionLabel, disabled = false }) {
  const [pending, setPending] = useState(false)
  const handleAction = async () => {
    if (pending || disabled) return
    setPending(true)
    try { await action() } finally { setPending(false) }
  }
  return (
    <article className="book-card animate-page">
      <div className="book-cover-stage"><BookCover book={book}/></div>
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
        <button className="text-button" onClick={handleAction} disabled={pending || disabled}>
          {pending ? 'Please wait…' : actionLabel} <ArrowRight size={15}/>
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
        if (Array.isArray(data)) {
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

  useEffect(() => {
    let mounted = true
    request('/auth/me').then(data => { if (mounted) setSession(data) }).catch(() => {})
    const expired = () => setSession(null)
    window.addEventListener('libris:session-expired', expired)
    return () => { mounted = false; window.removeEventListener('libris:session-expired', expired) }
  }, [])

  const handleLogout = async () => {
    try {
      await request('/auth/logout', { method: 'POST' })
      setSession(null)
      setMode(null)
    } catch (error) { window.alert(error.message) }
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

export { App, Auth, MemberDashboard, AdminDashboard, BookCard, BookCover }

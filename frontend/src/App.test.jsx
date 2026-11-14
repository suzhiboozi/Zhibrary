import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App, Auth, MemberDashboard, AdminDashboard, BookCard, BookCover } from './App.jsx'

const member = { username: 'member', name: 'Juan Reader', role: 'USER', fine: 0 }
const staff = { username: 'admin', name: 'Libris Admin', role: 'LIBRARIAN', fine: 0 }
const books = [
  { id: 1, title: 'El Filibusterismo', author: 'Jose Rizal', category: 'Classics', isbn: '123', status: 'AVAILABLE', publicationYear: 1891 },
  { id: 2, title: 'A Borrowed Story', author: 'A Writer', category: 'Fiction', isbn: '456', status: 'BORROWED', publicationYear: 2024 },
  { id: 3, title: 'A Lost Story', author: 'A Writer', category: 'Fiction', isbn: '789', status: 'LOST', publicationYear: 2024 }
]
function mockAPI(handler = () => []) {
  const fetch = vi.fn(async (url, options = {}) => {
    const result = await handler(url, options)
    return { ok: true, status: 200, json: async () => result }
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}
const dashboardProps = { books, setBooks: vi.fn(), onLogout: vi.fn(), backendOnline: true }

describe('Authentication', () => {
  it('does not bypass rejected demo logins', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, json: async () => ({ message: 'Invalid credentials' }) })))
    const login = vi.fn()
    render(<Auth mode="USER" onBack={vi.fn()} onLogin={login} backendOnline={true}/>)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Fill member credentials' }))
    await user.click(screen.getAllByRole('button', { name: 'Sign in', exact: true }).at(-1))
    await screen.findByText('Invalid credentials')
    expect(login).not.toHaveBeenCalled()
  })
  it('shows a connection error rather than logging in offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')))
    const login = vi.fn()
    render(<Auth mode="LIBRARIAN" onBack={vi.fn()} onLogin={login} backendOnline={false}/>)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'admin / admin123' }))
    await user.click(screen.getAllByRole('button', { name: 'Sign in', exact: true }).at(-1))
    await screen.findByText(/Cannot reach the library/)
    expect(login).not.toHaveBeenCalled()
  })
  it('submits registration with the entered fields', async () => {
    const fetch=mockAPI(() => ({ username:'newreader' }))
    render(<Auth mode="USER" onBack={vi.fn()} onLogin={vi.fn()} backendOnline={true}/>)
    const user=userEvent.setup()
    await user.click(screen.getByRole('button', {name:'Register',exact:true}))
    await user.type(screen.getByLabelText('First name *'),'New')
    await user.type(screen.getByLabelText('Last name *'),'Reader')
    await user.type(screen.getByLabelText('Email address *'),'reader@test.local')
    await user.type(screen.getByLabelText('Username *'),'newreader')
    await user.type(screen.getByLabelText('Password *'),'password123')
    await user.click(screen.getByRole('button',{name:'Create account'}))
    await screen.findByText(/Account created successfully/)
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({username:'newreader',firstName:'New',lastName:'Reader'})
  })
})

describe('Member dashboard', () => {
  it('navigates from the header, searches and clears an empty result', async () => {
    mockAPI()
    render(<MemberDashboard {...dashboardProps} session={member}/>)
    const user=userEvent.setup()
    await user.click(screen.getByRole('button',{name:'Discover books'}))
    await user.type(screen.getByRole('textbox',{name:'Search books'}),'nonexistent title')
    expect(screen.getByText('No books found')).toBeTruthy()
    await user.click(screen.getByRole('button',{name:'Clear filters'}))
    expect(screen.getByText('El Filibusterismo')).toBeTruthy()
    expect(screen.getByRole('button',{name:/Currently unavailable/}).disabled).toBe(true)
  })
  it('reflects a return in books, history and the fine display', async () => {
    let returned=false
    const record={id:9,book:books[0],status:'ACTIVE',borrowedDate:'2026-01-01',dueDate:'2026-01-02',user:{outstandingFine:0}}
    mockAPI((url,options)=>{
      if(url.endsWith('/return')) {returned=true; return {}}
      if(url==='/api/books') return books
      if(url.startsWith('/api/borrow/')) return [{...record,status:returned?'RETURNED':'ACTIVE',fine:returned?30:0,user:{outstandingFine:returned?30:0}}]
      return []
    })
    const updateBooks=vi.fn()
    render(<MemberDashboard {...dashboardProps} setBooks={updateBooks} session={member}/>)
    await userEvent.setup().click(screen.getByRole('button',{name:'My reading shelf'}))
    await userEvent.setup().click(await screen.findByRole('button',{name:'Return Book',exact:true}))
    await screen.findAllByText('₱30')
    expect(screen.getByText('Fines must be cleared')).toBeTruthy()
    expect(updateBooks).toHaveBeenCalledWith(books)
    expect(screen.getByText('Returned History (1)')).toBeTruthy()
  })
  it('does not mark a loan due today as overdue', async () => {
    const d=new Date(); const today=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    mockAPI(()=>[{id:9,book:books[0],status:'ACTIVE',dueDate:today,borrowedDate:today}])
    render(<MemberDashboard {...dashboardProps} session={member}/>)
    await userEvent.setup().click(screen.getByRole('button',{name:'My reading shelf'}))
    expect(await screen.findByText('Active Loan')).toBeTruthy()
    expect(screen.queryByText(/Overdue \(/)).toBeNull()
  })
})

describe('Staff and reusable controls', () => {
  it('allows typing and adding a book, then refreshes the catalogue', async () => {
    const fetch=mockAPI(url=>url==='/api/admin/summary'?{}:[])
    const update=vi.fn()
    render(<AdminDashboard {...dashboardProps} setBooks={update} session={staff}/>)
    const user=userEvent.setup()
    await user.click(screen.getByRole('button',{name:'Add a book'}))
    for(const [label,value] of [['Book Title *','New Story'],['ISBN *','987654'],['Author *','Writer'],['Category / Genre *','Fiction'],['Publication Year *','2024']]) await user.type(screen.getByLabelText(label),value)
    await user.click(screen.getByRole('button',{name:'Add to catalogue'}))
    await screen.findByText(/successfully added/)
    const call=fetch.mock.calls.find(([url,options])=>url==='/api/books' && options.method==='POST')
    expect(JSON.parse(call[1].body)).toMatchObject({title:'New Story',publicationYear:2024})
    expect(update).toHaveBeenCalled()
  })
  it('prevents repeated card actions while the first request is pending', async () => {
    let resolve
    const action=vi.fn(()=>new Promise(r=>{resolve=r}))
    render(<BookCard book={books[0]} action={action} actionLabel="Borrow book"/>)
    const user=userEvent.setup()
    await user.click(screen.getByRole('button',{name:/Borrow book/}))
    const button=screen.getByRole('button',{name:/Please wait/})
    expect(button.disabled).toBe(true)
    await user.click(button)
    expect(action).toHaveBeenCalledTimes(1)
    resolve()
    await waitFor(()=>expect(screen.getByRole('button',{name:/Borrow book/}).disabled).toBe(false))
  })
  it('uses a titled placeholder when a cover image fails', () => {
    render(<BookCover book={{...books[0],title:'My New Story',coverImage:'https://example.com/missing.jpg'}}/>)
    fireEvent.error(screen.getByRole('img'))
    expect(screen.getByRole('img',{name:'My New Story placeholder cover'})).toBeTruthy()
    expect(screen.getByText('My New Story')).toBeTruthy()
  })
  it('loads a saved authenticated session on refresh', async () => {
    mockAPI(url=>url==='/api/auth/me'?member:[])
    render(<App/> )
    expect(await screen.findByRole('button',{name:'My reading shelf'})).toBeTruthy()
  })
})


describe('Profile menu', () => {
  it.each([[member, MemberDashboard, 'Member'], [staff, AdminDashboard, 'Librarian']])('opens the profile without signing out for $username', async (session, Dashboard, role) => {
    mockAPI(url => url === '/api/admin/summary' ? {} : [])
    const logout = vi.fn()
    render(<Dashboard {...dashboardProps} session={session} onLogout={logout}/>)
    const user = userEvent.setup()
    const profile = screen.getByLabelText('View profile')
    expect(profile.closest('details').open).toBe(false)
    await user.click(profile)
    expect(profile.closest('details').open).toBe(true)
    expect(screen.getByText(session.name)).toBeTruthy()
    expect(screen.getByText(role, { selector: '.account-role' })).toBeTruthy()
    expect(logout).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', {name:'Sign out'}))
    expect(logout).toHaveBeenCalledTimes(1)
  })
})

describe('Borrowing approval', () => {
  it('submits a request and displays pending status rather than starting a loan', async () => {
    let requested = false
    mockAPI((url, options) => {
      if (url === '/api/borrow' && options.method === 'POST') { requested = true; return {id:31,status:'PENDING'} }
      if (url === '/api/borrow/requests/member') return requested ? [{id:31,status:'PENDING',book:books[0],requestedDate:'2026-11-14'}] : []
      if (url === '/api/books') return books
      return []
    })
    render(<MemberDashboard {...dashboardProps} session={member}/>)
    await userEvent.setup().click(screen.getByRole('button',{name:/Request to borrow/}))
    await userEvent.setup().click(screen.getByRole('button',{name:'Submit borrowing request'}))
    await screen.findByText(/A librarian must approve it before the loan begins/)
    await waitFor(() => expect(screen.getByRole('button',{name:/Awaiting approval/}).disabled).toBe(true))
    expect(screen.queryByText(/Successfully borrowed/)).toBeNull()
    expect(screen.getByText('Borrowing requests')).toBeTruthy()
  })
  it('allows the librarian to approve and refresh the queue', async () => {
    let reviewed = false
    const fetch=mockAPI((url, options) => {
      if (url === '/api/admin/borrow-requests/31/approve') { reviewed = true; return {status:'APPROVED',loan:{dueDate:'2026-12-01'}} }
      if (url === '/api/admin/borrow-requests') return reviewed ? [] : [{id:31,book:books[0],user:{username:'member',firstName:'Juan',lastName:'Reader'},requestedDate:'2026-11-14'}]
      if (url === '/api/admin/summary') return {}
      if (url === '/api/books') return books
      return []
    })
    render(<AdminDashboard {...dashboardProps} session={staff}/>)
    const user=userEvent.setup()
    await user.click(screen.getByRole('button',{name:'Approvals'}))
    await user.click(await screen.findByRole('button',{name:'Approve El Filibusterismo for member'}))
    await screen.findByText('Request approved. Return due 2026-12-01.')
    await screen.findByText('No requests awaiting review')
    expect(fetch.mock.calls.some(([url, options]) => url.endsWith('/31/approve') && options.method === 'POST')).toBe(true)
  })
  it('keeps a request visible when approval fails', async () => {
    mockAPI(url => url === '/api/admin/borrow-requests' ? [{id:31,book:books[0],user:{username:'member'},requestedDate:'2026-11-14'}] : url === '/api/admin/summary' ? {} : [])
    const original=globalThis.fetch
    vi.stubGlobal('fetch',vi.fn((url,options)=>url.endsWith('/31/approve')?Promise.resolve({ok:false,status:400,json:async()=>({message:'Member has outstanding fines.'})}):original(url,options)))
    render(<AdminDashboard {...dashboardProps} session={staff}/>)
    const user=userEvent.setup()
    await user.click(screen.getByRole('button',{name:'Approvals'}))
    await user.click(await screen.findByRole('button',{name:'Approve El Filibusterismo for member'}))
    await screen.findByText('Member has outstanding fines.')
    expect(screen.getByRole('button',{name:'Reject El Filibusterismo for member'}).disabled).toBe(false)
  })
})

describe('Member return schedule choice', () => {
  it('sends a chosen duration with the borrowing request', async () => {
    const fetch=mockAPI(url => url === '/api/borrow' ? {id:1,status:'PENDING'} : url === '/api/books' ? books : [])
    render(<MemberDashboard {...dashboardProps} session={member}/>)
    const user=userEvent.setup()
    await user.click(screen.getByRole('button',{name:/Request to borrow/}))
    const input=screen.getByLabelText('Borrowing duration in days')
    expect(input.max).toBe('7')
    await user.clear(input);await user.type(input,'3')
    await user.click(screen.getByRole('button',{name:'Submit borrowing request'}))
    await screen.findByText(/A librarian must approve it/)
    const call=fetch.mock.calls.find(([url,options]) => url === '/api/borrow' && options.method === 'POST')
    expect(JSON.parse(call[1].body)).toMatchObject({durationDays:3})
    expect(JSON.parse(call[1].body).returnDate).toBeUndefined()
  })
  it('sends an exact return date with no competing duration', async () => {
    const fetch=mockAPI(url => url === '/api/borrow' ? {id:1,status:'PENDING'} : url === '/api/books' ? books : [])
    render(<MemberDashboard {...dashboardProps} session={member}/>)
    const user=userEvent.setup()
    await user.click(screen.getByRole('button',{name:/Request to borrow/}))
    await user.selectOptions(screen.getByLabelText('Return schedule type'),'date')
    const input=screen.getByLabelText('Requested return date')
    const chosen=input.min
    fireEvent.change(input,{target:{value:chosen}})
    await user.click(screen.getByRole('button',{name:'Submit borrowing request'}))
    await screen.findByText(/A librarian must approve it/)
    const call=fetch.mock.calls.find(([url,options]) => url === '/api/borrow' && options.method === 'POST')
    expect(JSON.parse(call[1].body)).toMatchObject({returnDate:chosen})
    expect(JSON.parse(call[1].body).durationDays).toBeUndefined()
  })
  it('does not expose a duration settings tab to the librarian', async () => {
    mockAPI(url => url === '/api/admin/summary' ? {} : [])
    render(<AdminDashboard {...dashboardProps} session={staff}/>)
    expect(screen.queryByRole('button',{name:'Settings'})).toBeNull()
  })
})

describe('Librarian fines management', () => {
  function fineAPI() {
    let fine=30
    return mockAPI((url, options) => {
      if(url === '/api/admin/summary') return {}
      if(url === '/api/admin/fines/policy') return {dailyRate: options.method === 'PUT' ? Number(JSON.parse(options.body).dailyRate) : 10}
      if(url === '/api/admin/fines/calculate') return {overdueDays:3,dailyRate:10,total:30}
      if(url === '/api/admin/fines/loans/9/adjust') { fine=Number(JSON.parse(options.body).amount); return {id:9,fine} }
      if(url === '/api/admin/fines/loans') return [{id:9,book:books[0],user:{username:'member'},fine}]
      return []
    })
  }
  it('loads and saves the daily fine rate', async () => {
    const fetch=fineAPI()
    render(<AdminDashboard {...dashboardProps} session={staff}/>)
    const user=userEvent.setup();await user.click(screen.getByRole('button',{name:'Fines'}))
    const input=await screen.findByLabelText('Daily fine rate in pesos')
    await waitFor(()=>expect(input.value).toBe('10'))
    await user.clear(input);await user.type(input,'12.50')
    await user.click(screen.getByRole('button',{name:'Save fine rate'}))
    await screen.findByText(/Daily fine rate saved/)
    const call=fetch.mock.calls.find(([url,options])=>url === '/api/admin/fines/policy' && options.method === 'PUT')
    expect(JSON.parse(call[1].body)).toEqual({dailyRate:12.5})
  })
  it('computes a preview using due and return dates', async () => {
    const fetch=fineAPI()
    render(<AdminDashboard {...dashboardProps} session={staff}/>)
    const user=userEvent.setup();await user.click(screen.getByRole('button',{name:'Fines'}))
    fireEvent.change(await screen.findByLabelText('Book due date'),{target:{value:'2026-11-10'}})
    fireEvent.change(screen.getByLabelText('Actual or planned return date'),{target:{value:'2026-11-13'}})
    await waitFor(()=>expect(screen.getByRole('button',{name:'Compute fine'}).disabled).toBe(false))
    await user.click(screen.getByRole('button',{name:'Compute fine'}))
    await screen.findByText('₱30.00')
    expect(screen.getByText('3 overdue days × ₱10.00 per day')).toBeTruthy()
    expect(fetch.mock.calls.some(([url])=>url.endsWith('/adjust'))).toBe(false)
  })
  it('requires a selected returned loan and sends the fine adjustment reason', async () => {
    const fetch=fineAPI()
    render(<AdminDashboard {...dashboardProps} session={staff}/>)
    const user=userEvent.setup();await user.click(screen.getByRole('button',{name:'Fines'}))
    const select=await screen.findByLabelText('Returned loan')
    await waitFor(()=>expect(select.options.length).toBe(2))
    await user.selectOptions(select,'9')
    const amount=screen.getByLabelText('Adjusted fine in pesos')
    await user.clear(amount);await user.type(amount,'10')
    await user.type(screen.getByLabelText('Reason for adjustment'),'Approved partial waiver')
    await user.click(screen.getByRole('button',{name:'Apply fine adjustment'}))
    await screen.findByText(/member’s outstanding balance updated/)
    const call=fetch.mock.calls.find(([url])=>url.endsWith('/9/adjust'))
    expect(JSON.parse(call[1].body)).toEqual({amount:10,reason:'Approved partial waiver'})
  })
})

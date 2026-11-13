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

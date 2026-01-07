import { useState, useEffect } from 'react'
import './styles.css'
import { Tabs } from './components/Tabs'
import { ConfirmModal } from './components/ConfirmModal'
import { LoginModal } from './components/LoginModal'
import { UserMenu } from './components/Auth'
import { useAuthStore } from './store/useAuthStore'
import { useBudgetStore } from './store/useBudgetStore'
import { Overview } from './pages/Overview'
import { ExpenseTracker } from './pages/ExpenseTracker'
import { IncomeExpenses } from './pages/IncomeExpenses'
import { SavingsDashboard } from './pages/SavingsDashboard'

function downloadText(filename, text){
  const blob = new Blob([text], { type:'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Hardcoded months list
const MONTHS = [
  'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026',
  'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026'
]

export default function App(){
  const { user, loading, init } = useAuthStore()
  const { data, loadFromSupabase } = useBudgetStore()
  const month = useBudgetStore(s => s.month)
  const tab = useBudgetStore(s => s.tab)
  const syncing = useBudgetStore(s => s.syncing)
  const setMonth = useBudgetStore(s => s.setMonth)
  const setTab = useBudgetStore(s => s.setTab)
  const updateExpense = useBudgetStore(s => s.updateExpense)
  const updateIncome = useBudgetStore(s => s.updateIncome)
  const addCategory = useBudgetStore(s => s.addCategory)
  const removeCategory = useBudgetStore(s => s.removeCategory)
  const reset = useBudgetStore(s => s.reset)
  const exportJson = useBudgetStore(s => s.exportJson)
  const importJson = useBudgetStore(s => s.importJson)
  const [showResetModal, setShowResetModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  useEffect(() => {
    init()
  }, [init])

  // Load user data when they log in
  useEffect(() => {
    if (user) {
      loadFromSupabase(user.id)
    }
  }, [user, loadFromSupabase])

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <div className="logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="m19,22H5c-1.1,0-2-.9-2-2v-10.68c-.6-.75-.95-1.66-1-2.62-.05-1.14.36-2.22,1.15-3.05,1.02-1.07,2.59-1.66,4.42-1.66h9.73c1.29,0,2.55.54,3.45,1.48.85.89,1.29,2.04,1.24,3.23h0c-.04.96-.39,1.87-1,2.62v10.68c0,1.1-.9,2-2,2ZM7.58,4c-1.28,0-2.34.37-2.98,1.04-.42.44-.63.98-.6,1.58.03.61.28,1.19.71,1.63.18.19.28.44.28.7v11.06h14v-11.06c0-.26.1-.51.28-.7.43-.44.69-1.02.71-1.63h0c.03-.64-.21-1.26-.68-1.75-.52-.55-1.25-.86-2-.86H7.58Z"></path>
              <path d="M12 7A1 1 0 1 0 12 9 1 1 0 1 0 12 7z"></path>
              <path d="M15.5 10A.5.5 0 1 0 15.5 11 .5.5 0 1 0 15.5 10z"></path>
              <path d="M16 6A1 1 0 1 0 16 8 1 1 0 1 0 16 6z"></path>
            </svg>
          </div>
          <div>
            <h1>breadbox</h1>
            <p>Budget management dashboard</p>
          </div>
        </div>

        <div className="controls">
          <select 
            className="select" 
            value={month || ''} 
            onChange={(e)=> setMonth(e.target.value)}
          >
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          {!user && (
            <span className="small" style={{ color: 'var(--muted)', fontSize: '12px', fontStyle: 'italic' }}>
              Guest mode
            </span>
          )}
          {user && syncing && (
            <span className="small" style={{ color: 'var(--muted)', fontSize: '12px' }}>
              Syncing...
            </span>
          )}

          <button className="btn secondary" onClick={() => {
            const text = exportJson()
            downloadText('breadbox-data.json', text)
          }}>
            Export JSON
          </button>

          <label className="btn secondary" style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
            Import JSON
            <input
              type="file"
              accept="application/json"
              style={{ display:'none' }}
              onChange={async (e)=>{
                const f = e.target.files?.[0]
                if(!f) return
                try{
                  const text = await f.text()
                  importJson(text)
                }catch(err){
                  alert('Import failed: ' + (err?.message || 'invalid file'))
                }finally{
                  e.target.value = ''
                }
              }}
            />
          </label>

          <button className="btn bad" onClick={() => setShowResetModal(true)}>
            Reset
          </button>

          {user ? (
            <UserMenu />
          ) : (
            <button 
              className="btn secondary" 
              onClick={() => setShowLoginModal(true)}
              style={{ fontSize: '13px' }}
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      <Tabs value={tab} onChange={setTab} />

      {tab === 'overview' && <Overview data={data} month={month} />}
      {tab === 'expense' && <ExpenseTracker data={data} month={month} onUpdateExpense={updateExpense} onAddCategory={addCategory} onRemoveCategory={removeCategory} />}
      {tab === 'income' && <IncomeExpenses data={data} month={month} onUpdateIncome={updateIncome} />}
      {tab === 'savings' && <SavingsDashboard data={data} />}

      <ConfirmModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={() => reset()}
        title="Reset Dashboard"
        message="Reset dashboard back to the template? This clears all local changes and cannot be undone."
        confirmText="Reset"
        cancelText="Cancel"
        confirmVariant="bad"
      />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  )
}

import { useState } from 'react'
import './styles.css'
import { Tabs } from './components/Tabs'
import { ConfirmModal } from './components/ConfirmModal'
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

export default function App(){
  const data = useBudgetStore(s => s.data)
  const month = useBudgetStore(s => s.month)
  const tab = useBudgetStore(s => s.tab)
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

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <div className="logo">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6H20V18H4V6Z" stroke="rgba(255,255,255,0.95)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 10H20" stroke="rgba(255,255,255,0.95)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6" stroke="rgba(255,255,255,0.95)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="9" cy="14" r="1" fill="rgba(255,255,255,0.9)"/>
              <circle cx="12" cy="14" r="1" fill="rgba(255,255,255,0.9)"/>
              <circle cx="15" cy="14" r="1" fill="rgba(255,255,255,0.9)"/>
            </svg>
          </div>
          <div>
            <h1>breadbox</h1>
            <p>Budget management dashboard</p>
          </div>
        </div>

        <div className="controls">
          <select className="select" value={month} onChange={(e)=> setMonth(e.target.value)}>
            {data.months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

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
    </div>
  )
}

import { memo, useState } from 'react'
import { monthExpenseTotals } from '../lib/calc'
import { adherence, money, pct, statusFromAdh } from '../lib/format'
import { NumberInput } from '../components/NumberInput'
import { ConfirmModal } from '../components/ConfirmModal'
import { CategoryInsights } from '../components/CategoryInsights'
import seed from '../seed.json'

// Default categories that cannot be removed
const DEFAULT_CATEGORIES = seed.categories

const Row = memo(function Row({ currency, month, category, row, onUpdate, onRemove }){
  const adh = adherence(row.actual, row.projected)
  const status = statusFromAdh(adh)
  const pillClass = status === 'over budget' ? 'pill bad' : 'pill good'
  const [showModal, setShowModal] = useState(false)
  const isDefaultCategory = DEFAULT_CATEGORIES.includes(category)

  return (
    <>
      <tr>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{category}</span>
            {!isDefaultCategory && (
              <button
                className="btn secondary"
                onClick={() => setShowModal(true)}
                style={{ 
                  padding: '4px 8px', 
                  fontSize: '11px',
                  minWidth: 'auto',
                  height: '24px',
                  lineHeight: '1'
                }}
                title="Remove category"
              >
                ×
              </button>
            )}
          </div>
        </td>
      <td className="num">
        <NumberInput
          value={row.projected}
          ariaLabel={`${category} projected`}
          onCommit={(n)=> onUpdate(month, category, { projected: n })}
        />
      </td>
      <td className="num">
        <NumberInput
          value={row.actual}
          ariaLabel={`${category} actual`}
          onCommit={(n)=> onUpdate(month, category, { actual: n })}
        />
      </td>
      <td className="num">{pct(adh)}</td>
      <td><span className={pillClass}>{status}</span></td>
      <td style={{ minWidth: 220 }}>
        <input
          className="input wide"
          type="text"
          value={row.notes || ''}
          onChange={(e)=> onUpdate(month, category, { notes: e.target.value })}
          placeholder="Optional…"
        />
      </td>
    </tr>
    <ConfirmModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      onConfirm={() => onRemove(category)}
      title="Remove Category"
      message={`Remove category "${category}"? This will delete all expense data for this category across all months.`}
      confirmText="Remove"
      cancelText="Cancel"
      confirmVariant="bad"
    />
    </>
  )
})

export function ExpenseTracker({ data, month, onUpdateExpense, onAddCategory, onRemoveCategory }){
  const totals = monthExpenseTotals(data, month)
  const adhClass = totals.adh > 0 ? 'pill bad' : 'pill good'
  const statusClass = totals.status === 'over budget' ? 'pill bad' : 'pill good'
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim()
    if (trimmed && !data.categories.includes(trimmed)) {
      onAddCategory(trimmed)
      setNewCategoryName('')
      setShowAddForm(false)
    } else if (data.categories.includes(trimmed)) {
      alert('Category already exists')
    }
  }

  return (
    <div className="grid">
      <CategoryInsights data={data} month={month} />
      
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="row">
            <span className="pill">Projected: {money(totals.projected, data.currency)}</span>
            <span className="pill">Actual: {money(totals.actual, data.currency)}</span>
            <span className={adhClass}>Adherence: {pct(totals.adh)}</span>
            <span className={statusClass}>Status: {totals.status}</span>
          </div>
          {!showAddForm ? (
            <button 
              className="btn secondary" 
              onClick={() => setShowAddForm(true)}
              style={{ fontSize: '13px' }}
            >
              + Add Category
            </button>
          ) : (
            <div className="row" style={{ gap: '8px', alignItems: 'center' }}>
              <input
                className="input"
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCategory()
                  } else if (e.key === 'Escape') {
                    setShowAddForm(false)
                    setNewCategoryName('')
                  }
                }}
                placeholder="Category name"
                autoFocus
                style={{ width: '150px' }}
              />
              <button 
                className="btn good" 
                onClick={handleAddCategory}
                style={{ fontSize: '13px' }}
              >
                Add
              </button>
              <button 
                className="btn secondary" 
                onClick={() => {
                  setShowAddForm(false)
                  setNewCategoryName('')
                }}
                style={{ fontSize: '13px' }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="hr" />

        <div style={{ overflowX:'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th className="num">Projected</th>
                <th className="num">Actual</th>
                <th className="num">Adherence</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {data.categories.map((c) => {
                // Ensure expense data exists for this month and category
                const expenseData = data.expense?.[month]?.[c] || {
                  projected: 0,
                  actual: 0,
                  notes: ''
                }
                return (
                  <Row
                    key={c}
                    currency={data.currency}
                    month={month}
                    category={c}
                    row={expenseData}
                    onUpdate={onUpdateExpense}
                    onRemove={onRemoveCategory}
                  />
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td><b>Totals</b></td>
                <td className="num"><b>{money(totals.projected, data.currency)}</b></td>
                <td className="num"><b>{money(totals.actual, data.currency)}</b></td>
                <td className="num"><b>{pct(totals.adh)}</b></td>
                <td><span className={statusClass}><b>{totals.status}</b></span></td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="small" style={{ marginTop: 10 }}>
          Notes: projected/actual commit on blur or Enter (so Chrome stays fast).
        </div>
      </div>
    </div>
  )
}

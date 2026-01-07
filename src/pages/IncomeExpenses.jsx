import { monthStats } from '../lib/calc'
import { money, pct } from '../lib/format'
import { NumberInput } from '../components/NumberInput'
import { KpiCard } from '../components/KpiCard'

export function IncomeExpenses({ data, month, onUpdateIncome }){
  // Ensure income data exists for this month, initialize with defaults if not
  const inc = data.income[month] || {
    gross_income: 0,
    net_pay: 0,
    num_pays: 0,
    refunds: 0,
    gifts: 0,
    volleyball: 0,
    other: 0,
    notes: ''
  }
  const stats = monthStats(data, month)

  const setField = (key, value) => onUpdateIncome(month, { [key]: value })

  return (
    <div className="grid">
      <div className="card">
        <div style={{ fontWeight: 800, fontSize: 14 }}>Income</div>
        <div className="small">Monthly revenue = net pay × # pays. Net income = revenue + refunds + gifts + volleyball + other.</div>
        <div className="hr" />

        <div className="grid">
          <div className="card" style={{ gridColumn: 'span 12', background:'rgba(255,250,245,.85)', border: '1px solid rgba(212,74,58,.12)' }}>
            <div className="row" style={{ gap:14, flexWrap:'wrap' }}>
              <div>
                <div className="small">Gross Income (optional)</div>
                <NumberInput value={inc.gross_income} onCommit={(n)=> setField('gross_income', n)} ariaLabel="Gross income" />
              </div>
              <div>
                <div className="small">Net Pay (per paycheck)</div>
                <NumberInput value={inc.net_pay} onCommit={(n)=> setField('net_pay', n)} ariaLabel="Net pay" />
              </div>
              <div>
                <div className="small">Number of Pays</div>
                <NumberInput value={inc.num_pays} onCommit={(n)=> setField('num_pays', n)} ariaLabel="Number of pays" width={90} />
              </div>
              <div>
                <div className="small">Refunds</div>
                <NumberInput value={inc.refunds} onCommit={(n)=> setField('refunds', n)} ariaLabel="Refunds" />
              </div>
              <div>
                <div className="small">Gifts</div>
                <NumberInput value={inc.gifts} onCommit={(n)=> setField('gifts', n)} ariaLabel="Gifts" />
              </div>
              <div>
                <div className="small">Volleyball</div>
                <NumberInput value={inc.volleyball} onCommit={(n)=> setField('volleyball', n)} ariaLabel="Volleyball" />
              </div>
              <div>
                <div className="small">Other</div>
                <NumberInput value={inc.other} onCommit={(n)=> setField('other', n)} ariaLabel="Other" />
              </div>
            </div>

            <div className="hr" />
            <div className="small">Notes</div>
            <textarea
              className="textarea"
              value={inc.notes || ''}
              onChange={(e)=> setField('notes', e.target.value)}
              placeholder="Optional notes for this month…"
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 800, fontSize: 14 }}>Month Summary</div>
        <div className="small">Tied to actual expenses from the Expense Tracker.</div>
        <div className="hr" />
        <div className="kpis">
          <KpiCard label="Monthly Revenue" value={money(stats.monthlyRevenue, data.currency)} sub="Net pay × # pays" />
          <KpiCard label="Net Income" value={money(stats.netIncome, data.currency)} sub="Revenue + extras" />
          <KpiCard label="Actual Expenses" value={money(stats.actual, data.currency)} sub="From Expense Tracker" />
          <KpiCard label="Monthly Surplus" value={money(stats.surplus, data.currency)} sub="Net income − actual" />
          <KpiCard label="Budget Adherence" value={pct(stats.adh)} sub="(Actual − Projected) ÷ Projected" />
          <KpiCard label="Status" value={stats.status} sub="Over/under budget" />
          <KpiCard label="Savings Rate" value={pct(stats.savingsRate)} sub="Surplus ÷ net income" />
        </div>
      </div>
    </div>
  )
}

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts'
import { annualStats, monthStats } from '../lib/calc'
import { money, pct } from '../lib/format'
import { KpiCard } from '../components/KpiCard'

function tooltipMoney(currency){
  return ({ active, payload, label }) => {
    if(!active || !payload?.length) return null
    return (
      <div style={{ background:'rgba(255,252,247,.98)', border:'1px solid rgba(212,74,58,.2)', borderRadius:12, padding:12, boxShadow:'0 4px 12px rgba(212,74,58,.1)' }}>
        <div style={{ color:'#8B6F5A', fontSize:12, marginBottom:4 }}>{label}</div>
        <div style={{ fontWeight:700, color:'#2A1F16', fontSize:14 }}>{money(payload[0].value, currency)}</div>
      </div>
    )
  }
}

export function Overview({ data, month }){
  const a = annualStats(data)
  const m = monthStats(data, month)

  const lineData = a.monthsStats.map(x => ({ month: x.month, surplus: x.surplus }))
  const barData = data.categories.map(c => ({ category: c, spend: a.catTotals[c] || 0 }))

  return (
    <div className="grid">
      <div className="card">
        <div className="kpis">
          <KpiCard label="Month Net Income" value={money(m.netIncome, data.currency)} sub="Monthly revenue + extras" />
          <KpiCard label="Month Actual Expenses" value={money(m.actual, data.currency)} sub="Sum of category actuals" />
          <KpiCard label="Month Surplus" value={money(m.surplus, data.currency)} sub="Net income − actual" />
          <KpiCard label="Month Savings Rate" value={pct(m.savingsRate)} sub="Surplus ÷ net income" />

          <KpiCard label="Total Net Income (Year)" value={money(a.totalNetIncome, data.currency)} sub="Sum across months" />
          <KpiCard label="Avg Monthly Expenses" value={money(a.avgMonthlyExpenses, data.currency)} sub="Average actual expenses" />
          <KpiCard label="Avg Monthly Surplus" value={money(a.avgMonthlySurplus, data.currency)} sub="Average surplus" />
          <KpiCard label="Avg Savings Rate" value={pct(a.avgSavingsRate)} sub="Average savings rate" />
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent:'space-between' }}>
          <div>
            <div style={{ fontWeight:800, fontSize:14 }}>Monthly Surplus</div>
            <div className="small">Tracks surplus by month</div>
          </div>
        </div>
        <div style={{ height: 280, marginTop: 10 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <XAxis dataKey="month" tick={{ fill:'#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill:'#94a3b8', fontSize: 12 }} tickFormatter={(v)=> money(v, data.currency)} />
              <Tooltip content={tooltipMoney(data.currency)} />
              <Line type="monotone" dataKey="surplus" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight:800, fontSize:14 }}>Annual Spend by Category</div>
        <div className="small">Total actual spend summed across the year</div>
        <div style={{ height: 340, marginTop: 10 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <XAxis dataKey="category" tick={{ fill:'#94a3b8', fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={80} />
              <YAxis tick={{ fill:'#94a3b8', fontSize: 12 }} tickFormatter={(v)=> money(v, data.currency)} />
              <Tooltip content={tooltipMoney(data.currency)} />
              <Bar dataKey="spend" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

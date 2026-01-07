import { annualStats } from '../lib/calc'
import { money, pct, safeDiv } from '../lib/format'
import { KpiCard } from '../components/KpiCard'

export function SavingsDashboard({ data }){
  const a = annualStats(data)

  return (
    <div className="grid">
      <div className="card">
        <div className="kpis">
          <KpiCard label="Total Net Income" value={money(a.totalNetIncome, data.currency)} sub="Sum across months" />
          <KpiCard label="Avg Monthly Expenses" value={money(a.avgMonthlyExpenses, data.currency)} sub="Average actual expenses" />
          <KpiCard label="Avg Monthly Surplus" value={money(a.avgMonthlySurplus, data.currency)} sub="Average surplus" />
          <KpiCard label="Avg Savings Rate" value={pct(a.avgSavingsRate)} sub="Average savings rate" />
          <KpiCard label="Avg Budget Adherence" value={pct(a.avgBudgetAdh)} sub="Average adherence" />
          <KpiCard label="Total Spend" value={money(a.totalSpend, data.currency)} sub="Sum of category totals" />
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 800, fontSize: 14 }}>Category Totals (Actual)</div>
        <div className="small">This matches the spreadsheet style rollups: sum actuals by category across months.</div>
        <div className="hr" />
        <div style={{ overflowX:'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th className="num">Total Actual</th>
                <th className="num">% of Spend</th>
              </tr>
            </thead>
            <tbody>
              {data.categories.map((c)=> {
                const sum = a.catTotals[c] || 0
                const share = safeDiv(sum, a.totalSpend)
                return (
                  <tr key={c}>
                    <td>{c}</td>
                    <td className="num">{money(sum, data.currency)}</td>
                    <td className="num">{pct(share)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td><b>Grand Total</b></td>
                <td className="num"><b>{money(a.totalSpend, data.currency)}</b></td>
                <td className="num"><b>100.0%</b></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

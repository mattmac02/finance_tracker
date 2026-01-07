import { adherence, safeDiv, statusFromAdh } from './format'

export function monthExpenseTotals(data, month){
  let projected = 0;
  let actual = 0;
  for(const c of data.categories){
    const row = data.expense?.[month]?.[c] || {};
    projected += Number(row.projected || 0);
    actual += Number(row.actual || 0);
  }
  const adh = adherence(actual, projected);
  const status = statusFromAdh(adh);
  return { projected, actual, adh, status };
}

export function monthIncomeTotals(data, month){
  const inc = data.income?.[month] || {};
  const monthlyRevenue = Number(inc.net_pay || 0) * Number(inc.num_pays || 0);
  const netIncome =
    monthlyRevenue +
    Number(inc.refunds || 0) +
    Number(inc.gifts || 0) +
    Number(inc.volleyball || 0) +
    Number(inc.other || 0);

  return { monthlyRevenue, netIncome };
}

export function monthStats(data, month){
  const exp = monthExpenseTotals(data, month);
  const inc = monthIncomeTotals(data, month);
  const surplus = inc.netIncome - exp.actual;
  const savingsRate = safeDiv(surplus, inc.netIncome);
  return { month, ...exp, ...inc, surplus, savingsRate };
}

export function annualStats(data){
  const ms = data.months.map(m => monthStats(data, m));
  const totalNetIncome = ms.reduce((s,x)=> s + x.netIncome, 0);
  const avgMonthlyExpenses = ms.reduce((s,x)=> s + x.actual, 0) / (data.months.length || 1);
  const avgMonthlySurplus = ms.reduce((s,x)=> s + x.surplus, 0) / (data.months.length || 1);
  const avgSavingsRate = ms.reduce((s,x)=> s + x.savingsRate, 0) / (data.months.length || 1);
  const avgBudgetAdh = ms.reduce((s,x)=> s + x.adh, 0) / (data.months.length || 1);

  const catTotals = {};
  for(const c of data.categories){
    catTotals[c] = 0;
    for(const m of data.months){
      catTotals[c] += Number(data.expense?.[m]?.[c]?.actual || 0);
    }
  }
  const totalSpend = Object.values(catTotals).reduce((s,x)=> s + x, 0);

  return { monthsStats: ms, totalNetIncome, avgMonthlyExpenses, avgMonthlySurplus, avgSavingsRate, avgBudgetAdh, catTotals, totalSpend };
}

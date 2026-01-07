export function parseNum(raw){
  if(raw === null || raw === undefined) return 0;
  const s = String(raw).trim();
  if(!s) return 0;
  const normalized = s.replace(/,/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function money(n, currency='CAD'){
  const v = Number(n || 0);
  return v.toLocaleString(undefined, { style:'currency', currency, maximumFractionDigits: 2 });
}

export function pct(n){
  const v = Number(n || 0);
  return (v * 100).toFixed(1) + '%';
}

export function safeDiv(a,b){
  a = Number(a || 0); b = Number(b || 0);
  if(!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return 0;
  return a / b;
}

export function adherence(actual, projected){
  return safeDiv((Number(actual||0) - Number(projected||0)), Number(projected||0));
}

export function statusFromAdh(adh){
  return Number(adh) > 0 ? 'over budget' : 'under budget';
}

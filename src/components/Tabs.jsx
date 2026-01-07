export function Tabs({ value, onChange }){
  const tabs = [
    { key:'overview', label:'Overview' },
    { key:'expense', label:'Expense Tracker' },
    { key:'income', label:'Income & Expenses' },
    { key:'savings', label:'Savings Dashboard' },
  ]
  return (
    <div className="tabs">
      {tabs.map(t => (
        <button
          key={t.key}
          className={"tab " + (value === t.key ? "active" : "")}
          onClick={()=> onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import seed from '../seed.json'

function getCurrentMonth() {
  const now = new Date()
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const currentMonth = `${monthNames[now.getMonth()]} ${now.getFullYear()}`
  return currentMonth
}

function getInitialMonth() {
  const currentMonth = getCurrentMonth()
  // Check if current month exists in the available months
  if (seed.months.includes(currentMonth)) {
    return currentMonth
  }
  // Otherwise, return the first month or closest future month
  const now = new Date()
  const currentTime = now.getTime()
  
  // Find the closest month (prefer current or future months)
  for (const month of seed.months) {
    const [monthName, year] = month.split(' ')
    const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(monthName)
    const monthDate = new Date(parseInt(year), monthIndex, 1)
    if (monthDate.getTime() >= currentTime) {
      return month
    }
  }
  // Fallback to first month
  return seed.months[0]
}

export const useBudgetStore = create(persist(
  (set, get) => ({
    data: seed,
    month: getInitialMonth(),
    tab: 'overview',

    setMonth: (month) => set({ month }),
    setTab: (tab) => set({ tab }),

    updateExpense: (month, category, patch) => {
      set((state) => {
        const next = structuredClone(state.data)
        next.expense[month][category] = { ...next.expense[month][category], ...patch }
        return { data: next }
      })
    },

    updateIncome: (month, patch) => {
      set((state) => {
        const next = structuredClone(state.data)
        next.income[month] = { ...next.income[month], ...patch }
        return { data: next }
      })
    },

    addCategory: (categoryName) => {
      set((state) => {
        const next = structuredClone(state.data)
        if (!next.categories.includes(categoryName)) {
          next.categories.push(categoryName)
          // Initialize expense data for all months
          next.months.forEach(month => {
            if (!next.expense[month]) {
              next.expense[month] = {}
            }
            next.expense[month][categoryName] = {
              projected: 0,
              actual: 0,
              notes: ''
            }
          })
        }
        return { data: next }
      })
    },

    removeCategory: (categoryName) => {
      set((state) => {
        const next = structuredClone(state.data)
        // Remove from categories array
        next.categories = next.categories.filter(c => c !== categoryName)
        // Remove from all months' expense data
        next.months.forEach(month => {
          if (next.expense[month] && next.expense[month][categoryName]) {
            delete next.expense[month][categoryName]
          }
        })
        return { data: next }
      })
    },

    reset: () => set({ data: seed, month: getInitialMonth(), tab: 'overview' }),

    exportJson: () => {
      const { data } = get()
      return JSON.stringify(data, null, 2)
    },

    importJson: (jsonText) => {
      const parsed = JSON.parse(jsonText)
      if(!parsed || !parsed.months || !parsed.categories || !parsed.expense || !parsed.income){
        throw new Error('Invalid budget JSON')
      }
      set({ data: parsed, month: parsed.months?.[0] ?? seed.months[0] })
    }
  }),
  {
    name: 'kd_budget_dashboard_react_v1',
    version: 1,
  }
))

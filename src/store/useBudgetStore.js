import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import seed from '../seed.json'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { 
  saveBudgetToDatabase, 
  loadBudgetFromDatabase,
  updateExpenseInDatabase,
  updateIncomeInDatabase,
  addCategoryToDatabase,
  removeCategoryFromDatabase
} from '../lib/dbHelpers'

function getCurrentMonth() {
  const now = new Date()
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const currentMonth = `${monthNames[now.getMonth()]} ${now.getFullYear()}`
  return currentMonth
}

function getInitialMonth() {
  const currentMonth = getCurrentMonth()
  if (seed.months.includes(currentMonth)) {
    return currentMonth
  }
  const now = new Date()
  const currentTime = now.getTime()
  
  for (const month of seed.months) {
    const [monthName, year] = month.split(' ')
    const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(monthName)
    const monthDate = new Date(parseInt(year), monthIndex, 1)
    if (monthDate.getTime() >= currentTime) {
      return month
    }
  }
  return seed.months[0]
}

// Helper to save to Supabase (using normalized structure)
async function saveToSupabase(userId, data) {
  if (!userId || !isSupabaseConfigured()) return
  try {
    await saveBudgetToDatabase(userId, data)
  } catch (err) {
    console.error('Error saving to Supabase:', err)
  }
}

// Helper to load from Supabase (using normalized structure)
async function loadFromSupabase(userId) {
  if (!userId || !isSupabaseConfigured()) return null
  try {
    return await loadBudgetFromDatabase(userId)
  } catch (err) {
    console.error('Error loading from Supabase:', err)
    return null
  }
}

export const useBudgetStore = create(
  persist(
    (set, get) => ({
      data: seed,
      month: getInitialMonth(),
      tab: 'overview',
      loading: false,
      syncing: false,

      // Load data from Supabase
      loadFromSupabase: async (userId) => {
        set({ loading: true })
        const supabaseData = await loadFromSupabase(userId)
        if (supabaseData) {
          set({ data: supabaseData, loading: false })
        } else {
          set({ loading: false })
        }
      },

      setMonth: async (month) => {
        set({ month })
        if (!isSupabaseConfigured()) return
        const { data } = get()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await saveToSupabase(user.id, data)
        }
      },

      setTab: (tab) => set({ tab }),

      updateExpense: async (month, category, patch) => {
        set((state) => {
          const next = structuredClone(state.data)
          next.expense[month][category] = { ...next.expense[month][category], ...patch }
          return { data: next }
        })
        
        // Use efficient single-row update for logged-in users
        if (isSupabaseConfigured()) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            set({ syncing: true })
            try {
              await updateExpenseInDatabase(user.id, month, category, patch)
            } catch (err) {
              // Fallback to full save if single update fails
              const { data } = get()
              await saveToSupabase(user.id, data)
            }
            set({ syncing: false })
          }
        }
      },

      updateIncome: async (month, patch) => {
        set((state) => {
          const next = structuredClone(state.data)
          next.income[month] = { ...next.income[month], ...patch }
          return { data: next }
        })
        
        // Use efficient single-row update for logged-in users
        if (isSupabaseConfigured()) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            set({ syncing: true })
            try {
              await updateIncomeInDatabase(user.id, month, patch)
            } catch (err) {
              // Fallback to full save if single update fails
              const { data } = get()
              await saveToSupabase(user.id, data)
            }
            set({ syncing: false })
          }
        }
      },

      addCategory: async (categoryName) => {
        set((state) => {
          const next = structuredClone(state.data)
          if (!next.categories.includes(categoryName)) {
            next.categories.push(categoryName)
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
        
        // Use efficient category add for logged-in users
        if (isSupabaseConfigured()) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            set({ syncing: true })
            try {
              const { data } = get()
              await addCategoryToDatabase(user.id, categoryName, data.months)
            } catch (err) {
              // Fallback to full save if category add fails
              const { data } = get()
              await saveToSupabase(user.id, data)
            }
            set({ syncing: false })
          }
        }
      },

      removeCategory: async (categoryName) => {
        set((state) => {
          const next = structuredClone(state.data)
          next.categories = next.categories.filter(c => c !== categoryName)
          next.months.forEach(month => {
            if (next.expense[month] && next.expense[month][categoryName]) {
              delete next.expense[month][categoryName]
            }
          })
          return { data: next }
        })
        
        // Use efficient category remove for logged-in users
        if (isSupabaseConfigured()) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            set({ syncing: true })
            try {
              await removeCategoryFromDatabase(user.id, categoryName)
            } catch (err) {
              // Fallback to full save if category remove fails
              const { data } = get()
              await saveToSupabase(user.id, data)
            }
            set({ syncing: false })
          }
        }
      },

      reset: async () => {
        set({ data: seed, month: getInitialMonth(), tab: 'overview' })
        if (isSupabaseConfigured()) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            set({ syncing: true })
            await saveToSupabase(user.id, seed)
            set({ syncing: false })
          }
        }
      },

      exportJson: () => {
        const { data } = get()
        return JSON.stringify(data, null, 2)
      },

      importJson: async (jsonText) => {
        const parsed = JSON.parse(jsonText)
        if(!parsed || !parsed.months || !parsed.categories || !parsed.expense || !parsed.income){
          throw new Error('Invalid budget JSON')
        }
        set({ data: parsed, month: parsed.months?.[0] ?? seed.months[0] })
        
        if (isSupabaseConfigured()) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            set({ syncing: true })
            await saveToSupabase(user.id, parsed)
            set({ syncing: false })
          }
        }
      }
    }),
    {
      name: 'kd_budget_dashboard_react_v1',
      version: 1,
    }
  )
)

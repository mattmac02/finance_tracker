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

// Default categories that should always be present
const DEFAULT_CATEGORIES = seed.categories

// Hardcoded months list - must match App.jsx
const MONTHS = [
  'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026',
  'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026'
]

function getCurrentMonth() {
  const now = new Date()
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const currentMonth = `${monthNames[now.getMonth()]} ${now.getFullYear()}`
  return currentMonth
}

function getInitialMonth() {
  const currentMonth = getCurrentMonth()
  // If current month is in 2026, use it; otherwise use first month of 2026
  if (MONTHS.includes(currentMonth)) {
    return currentMonth
  }
  // Default to current month if it's 2026, otherwise first month
  const currentYear = new Date().getFullYear()
  if (currentYear === 2026) {
    const monthIndex = new Date().getMonth()
    return MONTHS[monthIndex] || MONTHS[0]
  }
  return MONTHS[0]
}

// Helper to save to Supabase (using normalized structure)
async function saveToSupabase(userId, data) {
  if (!userId || !isSupabaseConfigured()) return
  try {
    // Ensure default categories and hardcoded months are included before saving
    const dataToSave = {
      ...data,
      months: [...MONTHS], // Always use hardcoded months
      categories: [...new Set([...DEFAULT_CATEGORIES, ...(data.categories || [])])]
    }
    await saveBudgetToDatabase(userId, dataToSave)
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
      // Ensure default categories are always in seed data and months match hardcoded list
      data: {
        ...seed,
        months: [...MONTHS], // Always use hardcoded months
        categories: [...new Set([...DEFAULT_CATEGORIES, ...(seed.categories || [])])]
      },
      month: getInitialMonth(),
      tab: 'overview',
      loading: false,
      syncing: false,

      // Load data from Supabase
      loadFromSupabase: async (userId) => {
        set({ loading: true })
        const supabaseData = await loadFromSupabase(userId)
        if (supabaseData) {
          const currentMonth = get().month
          // Always use hardcoded months, but validate current month
          const validMonth = MONTHS.includes(currentMonth) 
            ? currentMonth 
            : MONTHS[0]
          
          // Ensure default categories are always present
          const mergedCategories = [...new Set([...DEFAULT_CATEGORIES, ...(supabaseData.categories || [])])]
          
          // Merge data but always use hardcoded months
          const mergedData = {
            ...supabaseData,
            months: [...MONTHS], // Always use hardcoded months
            categories: mergedCategories
          }
          
          // Ensure all categories have expense entries for all hardcoded months
          MONTHS.forEach(month => {
            if (!mergedData.expense[month]) {
              mergedData.expense[month] = {}
            }
            // Initialize expense entries for all categories (default + custom)
            mergedCategories.forEach(category => {
              if (!mergedData.expense[month][category]) {
                mergedData.expense[month][category] = {
                  projected: 0,
                  actual: 0,
                  notes: ''
                }
              }
            })
            // Initialize income for all months if missing
            if (!mergedData.income[month]) {
              mergedData.income[month] = {
                gross_income: 0,
                net_pay: 0,
                num_pays: 0,
                refunds: 0,
                gifts: 0,
                volleyball: 0,
                other: 0,
                notes: ''
              }
            }
          })
          
          set({ data: mergedData, month: validMonth, loading: false })
        } else {
          set({ loading: false })
        }
      },

      setMonth: (month) => {
        // Validate month exists in hardcoded months list
        if (MONTHS.includes(month)) {
          set({ month })
          // Sync to Supabase in background (non-blocking)
          if (isSupabaseConfigured()) {
            supabase.auth.getUser().then(({ data: { user } }) => {
              if (user) {
                const { data: currentData } = get()
                saveToSupabase(user.id, currentData).catch(err => {
                  console.error('Error syncing month change:', err)
                })
              }
            })
          }
        }
      },

      setTab: (tab) => set({ tab }),

      updateExpense: async (month, category, patch) => {
        set((state) => {
          const next = structuredClone(state.data)
          // Ensure months is always set to hardcoded months
          next.months = [...MONTHS]
          // Initialize expense object for month if it doesn't exist
          if (!next.expense[month]) {
            next.expense[month] = {}
          }
          // Initialize expense entry for category if it doesn't exist
          if (!next.expense[month][category]) {
            next.expense[month][category] = {
              projected: 0,
              actual: 0,
              notes: ''
            }
          }
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
          // Ensure months is always set to hardcoded months
          next.months = [...MONTHS]
          // Initialize income for month if it doesn't exist
          if (!next.income[month]) {
            next.income[month] = {
              gross_income: 0,
              net_pay: 0,
              num_pays: 0,
              refunds: 0,
              gifts: 0,
              volleyball: 0,
              other: 0,
              notes: ''
            }
          }
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
          // Ensure months is always set to hardcoded months
          next.months = [...MONTHS]
          if (!next.categories.includes(categoryName)) {
            next.categories.push(categoryName)
            MONTHS.forEach(month => {
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
              await addCategoryToDatabase(user.id, categoryName, MONTHS)
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
        // Prevent removal of default categories
        if (DEFAULT_CATEGORIES.includes(categoryName)) {
          return
        }
        
        set((state) => {
          const next = structuredClone(state.data)
          // Ensure months is always set to hardcoded months
          next.months = [...MONTHS]
          next.categories = next.categories.filter(c => c !== categoryName)
          MONTHS.forEach(month => {
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
        const resetData = {
          ...seed,
          months: [...MONTHS],
          categories: [...new Set([...DEFAULT_CATEGORIES, ...(seed.categories || [])])]
        }
        set({ data: resetData, month: getInitialMonth(), tab: 'overview' })
        if (isSupabaseConfigured()) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            set({ syncing: true })
            await saveToSupabase(user.id, resetData)
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
        if(!parsed || !parsed.categories || !parsed.expense || !parsed.income){
          throw new Error('Invalid budget JSON')
        }
        // Always use hardcoded months when importing
        const importedData = {
          ...parsed,
          months: [...MONTHS]
        }
        set({ data: importedData, month: MONTHS[0] })
        
        if (isSupabaseConfigured()) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            set({ syncing: true })
            await saveToSupabase(user.id, importedData)
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

import { supabase, isSupabaseConfigured } from './supabase'

/**
 * Convert app's JSON data format to normalized database format and save
 */
export async function saveBudgetToDatabase(userId, budgetData) {
  if (!isSupabaseConfigured() || !userId) return

  try {
    // Start a transaction-like operation
    // 1. Get or create budget
    let { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .upsert({
        user_id: userId,
        currency: budgetData.currency || 'CAD',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (budgetError) throw budgetError
    const budgetId = budget.id

    // 2. Save months
    if (budgetData.months && budgetData.months.length > 0) {
      const monthsData = budgetData.months.map((month, index) => ({
        budget_id: budgetId,
        month_label: month,
        display_order: index
      }))

      // Delete existing months and insert new ones
      await supabase.from('budget_months').delete().eq('budget_id', budgetId)
      const { error: monthsError } = await supabase
        .from('budget_months')
        .insert(monthsData)

      if (monthsError) throw monthsError
    }

    // 3. Save categories
    if (budgetData.categories && budgetData.categories.length > 0) {
      const categoriesData = budgetData.categories.map((category, index) => ({
        budget_id: budgetId,
        category_name: category,
        display_order: index
      }))

      // Delete existing categories and insert new ones
      await supabase.from('budget_categories').delete().eq('budget_id', budgetId)
      const { error: categoriesError } = await supabase
        .from('budget_categories')
        .insert(categoriesData)

      if (categoriesError) throw categoriesError
    }

    // 4. Save expenses
    if (budgetData.expense) {
      const expensesData = []
      for (const [month, categories] of Object.entries(budgetData.expense)) {
        for (const [category, data] of Object.entries(categories)) {
          expensesData.push({
            budget_id: budgetId,
            month_label: month,
            category_name: category,
            projected: data.projected || 0,
            actual: data.actual || 0,
            notes: data.notes || '',
            updated_at: new Date().toISOString()
          })
        }
      }

      if (expensesData.length > 0) {
        // Delete existing expenses and insert new ones
        await supabase.from('expenses').delete().eq('budget_id', budgetId)
        const { error: expensesError } = await supabase
          .from('expenses')
          .insert(expensesData)

        if (expensesError) throw expensesError
      }
    }

    // 5. Save income
    if (budgetData.income) {
      const incomeData = Object.entries(budgetData.income).map(([month, data]) => ({
        budget_id: budgetId,
        month_label: month,
        gross_income: data.gross_income || 0,
        net_pay: data.net_pay || 0,
        num_pays: data.num_pays || 0,
        refunds: data.refunds || 0,
        gifts: data.gifts || 0,
        volleyball: data.volleyball || 0,
        other: data.other || 0,
        notes: data.notes || '',
        updated_at: new Date().toISOString()
      }))

      if (incomeData.length > 0) {
        // Delete existing income and insert new ones
        await supabase.from('income').delete().eq('budget_id', budgetId)
        const { error: incomeError } = await supabase
          .from('income')
          .insert(incomeData)

        if (incomeError) throw incomeError
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error saving budget to database:', error)
    throw error
  }
}

/**
 * Load budget data from normalized database format and convert to app's JSON format
 */
export async function loadBudgetFromDatabase(userId) {
  if (!isSupabaseConfigured() || !userId) return null

  try {
    // 1. Get budget
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (budgetError) {
      if (budgetError.code === 'PGRST116') return null // No budget found
      throw budgetError
    }

    const budgetId = budget.id

    // 2. Load months
    const { data: months, error: monthsError } = await supabase
      .from('budget_months')
      .select('month_label')
      .eq('budget_id', budgetId)
      .order('display_order')

    if (monthsError) throw monthsError

    // 3. Load categories
    const { data: categories, error: categoriesError } = await supabase
      .from('budget_categories')
      .select('category_name')
      .eq('budget_id', budgetId)
      .order('display_order')

    if (categoriesError) throw categoriesError

    // 4. Load expenses
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .eq('budget_id', budgetId)

    if (expensesError) throw expensesError

    // 5. Load income
    const { data: income, error: incomeError } = await supabase
      .from('income')
      .select('*')
      .eq('budget_id', budgetId)

    if (incomeError) throw incomeError

    // Convert to app's JSON format
    const result = {
      currency: budget.currency || 'CAD',
      months: months?.map(m => m.month_label) || [],
      categories: categories?.map(c => c.category_name) || [],
      expense: {},
      income: {}
    }

    // Build expense object
    if (expenses) {
      for (const exp of expenses) {
        if (!result.expense[exp.month_label]) {
          result.expense[exp.month_label] = {}
        }
        result.expense[exp.month_label][exp.category_name] = {
          projected: Number(exp.projected) || 0,
          actual: Number(exp.actual) || 0,
          notes: exp.notes || ''
        }
      }
    }

    // Build income object
    if (income) {
      for (const inc of income) {
        result.income[inc.month_label] = {
          gross_income: Number(inc.gross_income) || 0,
          net_pay: Number(inc.net_pay) || 0,
          num_pays: Number(inc.num_pays) || 0,
          refunds: Number(inc.refunds) || 0,
          gifts: Number(inc.gifts) || 0,
          volleyball: Number(inc.volleyball) || 0,
          other: Number(inc.other) || 0,
          notes: inc.notes || ''
        }
      }
    }

    return result
  } catch (error) {
    console.error('Error loading budget from database:', error)
    return null
  }
}

/**
 * Update a single expense entry (more efficient than saving entire budget)
 */
export async function updateExpenseInDatabase(userId, month, category, patch) {
  if (!isSupabaseConfigured() || !userId) return

  try {
    // Get budget_id
    const { data: budget } = await supabase
      .from('budgets')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!budget) return

    // Upsert expense
    const { error } = await supabase
      .from('expenses')
      .upsert({
        budget_id: budget.id,
        month_label: month,
        category_name: category,
        projected: patch.projected ?? 0,
        actual: patch.actual ?? 0,
        notes: patch.notes ?? '',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'budget_id,month_label,category_name'
      })

    if (error) throw error
  } catch (error) {
    console.error('Error updating expense in database:', error)
    throw error
  }
}

/**
 * Update income for a month (more efficient than saving entire budget)
 */
export async function updateIncomeInDatabase(userId, month, patch) {
  if (!isSupabaseConfigured() || !userId) return

  try {
    // Get budget_id
    const { data: budget } = await supabase
      .from('budgets')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!budget) return

    // Upsert income
    const { error } = await supabase
      .from('income')
      .upsert({
        budget_id: budget.id,
        month_label: month,
        gross_income: patch.gross_income ?? 0,
        net_pay: patch.net_pay ?? 0,
        num_pays: patch.num_pays ?? 0,
        refunds: patch.refunds ?? 0,
        gifts: patch.gifts ?? 0,
        volleyball: patch.volleyball ?? 0,
        other: patch.other ?? 0,
        notes: patch.notes ?? '',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'budget_id,month_label'
      })

    if (error) throw error
  } catch (error) {
    console.error('Error updating income in database:', error)
    throw error
  }
}

/**
 * Add a category to the budget
 */
export async function addCategoryToDatabase(userId, categoryName, allMonths) {
  if (!isSupabaseConfigured() || !userId) return

  try {
    const { data: budget } = await supabase
      .from('budgets')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!budget) return

    const budgetId = budget.id

    // Get current max order
    const { data: categories } = await supabase
      .from('budget_categories')
      .select('display_order')
      .eq('budget_id', budgetId)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = categories && categories.length > 0 
      ? categories[0].display_order + 1 
      : 0

    // Add category
    const { error: catError } = await supabase
      .from('budget_categories')
      .insert({
        budget_id: budgetId,
        category_name: categoryName,
        display_order: nextOrder
      })

    if (catError) throw catError

    // Initialize expense entries for all months
    if (allMonths && allMonths.length > 0) {
      const expensesData = allMonths.map(month => ({
        budget_id: budgetId,
        month_label: month,
        category_name: categoryName,
        projected: 0,
        actual: 0,
        notes: ''
      }))

      const { error: expError } = await supabase
        .from('expenses')
        .insert(expensesData)

      if (expError) throw expError
    }
  } catch (error) {
    console.error('Error adding category to database:', error)
    throw error
  }
}

/**
 * Remove a category from the budget
 */
export async function removeCategoryFromDatabase(userId, categoryName) {
  if (!isSupabaseConfigured() || !userId) return

  try {
    const { data: budget } = await supabase
      .from('budgets')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!budget) return

    const budgetId = budget.id

    // Delete all expenses for this category
    await supabase
      .from('expenses')
      .delete()
      .eq('budget_id', budgetId)
      .eq('category_name', categoryName)

    // Delete the category
    await supabase
      .from('budget_categories')
      .delete()
      .eq('budget_id', budgetId)
      .eq('category_name', categoryName)
  } catch (error) {
    console.error('Error removing category from database:', error)
    throw error
  }
}


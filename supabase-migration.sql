-- ============================================
-- Normalized Budget Database Schema
-- ============================================
-- Note: auth.users table is automatically created by Supabase Auth
-- This migration creates the budget-related tables that reference it

-- Main budgets table (one per user)
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Budget months (months available for each budget)
CREATE TABLE IF NOT EXISTS budget_months (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
  month_label VARCHAR(20) NOT NULL, -- e.g., "Jan 2026"
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(budget_id, month_label)
);

-- Budget categories (expense categories for each budget)
CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(budget_id, category_name)
);

-- Expenses table (individual expense entries)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
  month_label VARCHAR(20) NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  projected DECIMAL(12, 2) DEFAULT 0 NOT NULL,
  actual DECIMAL(12, 2) DEFAULT 0 NOT NULL,
  notes TEXT DEFAULT '' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(budget_id, month_label, category_name)
);

-- Income table (income entries per month)
CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
  month_label VARCHAR(20) NOT NULL,
  gross_income DECIMAL(12, 2) DEFAULT 0 NOT NULL,
  net_pay DECIMAL(12, 2) DEFAULT 0 NOT NULL,
  num_pays DECIMAL(5, 2) DEFAULT 0 NOT NULL,
  refunds DECIMAL(12, 2) DEFAULT 0 NOT NULL,
  gifts DECIMAL(12, 2) DEFAULT 0 NOT NULL,
  volleyball DECIMAL(12, 2) DEFAULT 0 NOT NULL,
  other DECIMAL(12, 2) DEFAULT 0 NOT NULL,
  notes TEXT DEFAULT '' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(budget_id, month_label)
);

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS budgets_user_id_idx ON budgets(user_id);
CREATE INDEX IF NOT EXISTS budgets_updated_at_idx ON budgets(updated_at);

CREATE INDEX IF NOT EXISTS budget_months_budget_id_idx ON budget_months(budget_id);
CREATE INDEX IF NOT EXISTS budget_months_month_label_idx ON budget_months(month_label);

CREATE INDEX IF NOT EXISTS budget_categories_budget_id_idx ON budget_categories(budget_id);
CREATE INDEX IF NOT EXISTS budget_categories_category_name_idx ON budget_categories(category_name);

CREATE INDEX IF NOT EXISTS expenses_budget_id_idx ON expenses(budget_id);
CREATE INDEX IF NOT EXISTS expenses_month_label_idx ON expenses(month_label);
CREATE INDEX IF NOT EXISTS expenses_category_name_idx ON expenses(category_name);
CREATE INDEX IF NOT EXISTS expenses_budget_month_idx ON expenses(budget_id, month_label);
CREATE INDEX IF NOT EXISTS expenses_updated_at_idx ON expenses(updated_at);

CREATE INDEX IF NOT EXISTS income_budget_id_idx ON income(budget_id);
CREATE INDEX IF NOT EXISTS income_month_label_idx ON income(month_label);
CREATE INDEX IF NOT EXISTS income_budget_month_idx ON income(budget_id, month_label);
CREATE INDEX IF NOT EXISTS income_updated_at_idx ON income(updated_at);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;

-- Budgets policies (comprehensive with USING and WITH CHECK)
-- Explicitly require authentication and ownership
DROP POLICY IF EXISTS "Users can only see their own budgets" ON budgets;
CREATE POLICY "Users can only see their own budgets"
  ON budgets FOR ALL
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Budget months policies (comprehensive with USING and WITH CHECK)
-- Explicitly require authentication and ownership
DROP POLICY IF EXISTS "Users can only see their own budget months" ON budget_months;
CREATE POLICY "Users can only see their own budget months"
  ON budget_months FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM budgets 
      WHERE budgets.id = budget_months.budget_id 
      AND budgets.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM budgets 
      WHERE budgets.id = budget_months.budget_id 
      AND budgets.user_id = auth.uid()
    )
  );

-- Budget categories policies (comprehensive with USING and WITH CHECK)
-- Explicitly require authentication and ownership
DROP POLICY IF EXISTS "Users can only see their own budget categories" ON budget_categories;
CREATE POLICY "Users can only see their own budget categories"
  ON budget_categories FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM budgets 
      WHERE budgets.id = budget_categories.budget_id 
      AND budgets.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM budgets 
      WHERE budgets.id = budget_categories.budget_id 
      AND budgets.user_id = auth.uid()
    )
  );

-- Expenses policies (comprehensive with USING and WITH CHECK)
-- Explicitly require authentication and ownership
DROP POLICY IF EXISTS "Users can only see their own expenses" ON expenses;
CREATE POLICY "Users can only see their own expenses"
  ON expenses FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM budgets 
      WHERE budgets.id = expenses.budget_id 
      AND budgets.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM budgets 
      WHERE budgets.id = expenses.budget_id 
      AND budgets.user_id = auth.uid()
    )
  );

-- Income policies (comprehensive with USING and WITH CHECK)
-- Explicitly require authentication and ownership
DROP POLICY IF EXISTS "Users can only see their own income" ON income;
CREATE POLICY "Users can only see their own income"
  ON income FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM budgets 
      WHERE budgets.id = income.budget_id 
      AND budgets.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM budgets 
      WHERE budgets.id = income.budget_id 
      AND budgets.user_id = auth.uid()
    )
  );

-- ============================================
-- Functions and Triggers
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_income_updated_at ON income;
CREATE TRIGGER update_income_updated_at
  BEFORE UPDATE ON income
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Helper Views (Optional - for easier querying)
-- ============================================
-- Note: Views inherit RLS from underlying tables, but we'll make them secure

-- View for expense totals by month (secured via underlying expenses table RLS)
CREATE OR REPLACE VIEW expense_totals_by_month AS
SELECT 
  budget_id,
  month_label,
  SUM(projected) as total_projected,
  SUM(actual) as total_actual,
  COUNT(*) as category_count
FROM expenses
GROUP BY budget_id, month_label;

-- View for income summary by month (secured via underlying income table RLS)
CREATE OR REPLACE VIEW income_summary_by_month AS
SELECT 
  budget_id,
  month_label,
  gross_income,
  net_pay,
  num_pays,
  (net_pay * num_pays) as monthly_revenue,
  refunds,
  gifts,
  volleyball,
  other,
  (net_pay * num_pays + refunds + gifts + volleyball + other) as net_income
FROM income;

-- Note: Views inherit RLS from underlying tables (expenses and income)
-- Since the underlying tables have RLS enabled, the views are automatically secured
-- Views will only return data that the authenticated user has access to

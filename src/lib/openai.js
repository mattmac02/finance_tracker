const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY

// Helper to check if OpenAI is configured
export const isOpenAIConfigured = () => !!openaiApiKey

/**
 * Get AI insights for budget data
 * Uses gpt-4o-mini for cost efficiency
 */
export async function getBudgetInsights(data, month, annualStats, monthStats) {
  if (!isOpenAIConfigured()) {
    return null
  }

  try {
    // Prepare data summary for AI
    const summary = {
      currentMonth: month,
      monthStats: {
        netIncome: monthStats.netIncome,
        actualExpenses: monthStats.actual,
        surplus: monthStats.surplus,
        savingsRate: monthStats.savingsRate,
        status: monthStats.status
      },
      annualStats: {
        totalNetIncome: annualStats.totalNetIncome,
        avgMonthlyExpenses: annualStats.avgMonthlyExpenses,
        avgMonthlySurplus: annualStats.avgMonthlySurplus,
        avgSavingsRate: annualStats.avgSavingsRate
      },
      topCategories: Object.entries(annualStats.catTotals || {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, total]) => ({ name, total })),
      monthsWithData: data.months?.length || 0
    }

    const prompt = `Analyze this budget data and provide 2-3 concise, actionable insights. Be specific and helpful. Keep each insight to 1-2 sentences max.

Current Month: ${summary.currentMonth}
- Net Income: ${summary.monthStats.netIncome}
- Expenses: ${summary.monthStats.actualExpenses}
- Surplus: ${summary.monthStats.surplus}
- Savings Rate: ${summary.monthStats.savingsRate}%
- Status: ${summary.monthStats.status}

Annual Averages:
- Avg Monthly Expenses: ${summary.annualStats.avgMonthlyExpenses}
- Avg Monthly Surplus: ${summary.annualStats.avgMonthlySurplus}
- Avg Savings Rate: ${summary.annualStats.avgSavingsRate}%

Top Spending Categories:
${summary.topCategories.map(c => `- ${c.name}: ${c.total}`).join('\n')}

Provide insights in this exact JSON format:
{
  "insights": [
    {"title": "Brief title", "text": "Insight text"},
    {"title": "Brief title", "text": "Insight text"},
    {"title": "Brief title", "text": "Insight text"}
  ]
}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful financial advisor. Provide concise, actionable budget insights. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const result = await response.json()
    const content = result.choices[0]?.message?.content
    
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.insights && Array.isArray(parsed.insights) && parsed.insights.length > 0) {
          return parsed
        }
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', parseError)
      }
    }

    throw new Error('Invalid response format')
  } catch (error) {
    console.error('Error getting AI insights:', error)
    return null
  }
}


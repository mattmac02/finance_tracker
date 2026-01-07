import { useState, useEffect } from 'react'
import { getBudgetInsights, isOpenAIConfigured } from '../lib/openai'
import { annualStats, monthStats } from '../lib/calc'

export function CategoryInsights({ data, month }) {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!isOpenAIConfigured() || !data || !month) {
      return
    }

    const fetchInsights = async () => {
      setLoading(true)
      setError(false)
      
      try {
        const a = annualStats(data)
        const m = monthStats(data, month)
        
        // Prepare category-specific data
        const categoryData = data.categories?.map(cat => {
          const monthExpense = data.expense?.[month]?.[cat] || { projected: 0, actual: 0 }
          const annualTotal = a.catTotals[cat] || 0
          return {
            name: cat,
            monthProjected: monthExpense.projected,
            monthActual: monthExpense.actual,
            annualTotal: annualTotal,
            variance: monthExpense.actual - monthExpense.projected
          }
        }).filter(c => c.annualTotal > 0 || c.monthActual > 0) || []

        const prompt = `Analyze spending patterns and provide 2 concise insights about expense categories. Focus on trends, over-budget categories, or opportunities to save.

Current Month: ${month}
Top Categories This Month:
${categoryData
  .sort((a, b) => b.monthActual - a.monthActual)
  .slice(0, 5)
  .map(c => `- ${c.name}: Projected ${c.monthProjected}, Actual ${c.monthActual} (${c.variance >= 0 ? '+' : ''}${c.variance.toFixed(0)} variance)`)
  .join('\n')}

Annual Totals:
${categoryData
  .sort((a, b) => b.annualTotal - a.annualTotal)
  .slice(0, 5)
  .map(c => `- ${c.name}: ${c.annualTotal}`)
  .join('\n')}

Provide insights in this exact JSON format:
{
  "insights": [
    {"title": "Brief title", "text": "Insight text"},
    {"title": "Brief title", "text": "Insight text"}
  ]
}`

        const apiKey = import.meta.env.VITE_OPENAI_API_KEY
        if (!apiKey) {
          throw new Error('OpenAI API key not configured')
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful financial advisor. Provide concise, actionable spending insights. Always respond with valid JSON only.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 250
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

        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (parsed.insights && Array.isArray(parsed.insights)) {
            setInsights(parsed.insights)
          } else {
            setError(true)
          }
        } else {
          setError(true)
        }
      } catch (err) {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(fetchInsights, 500)
    return () => clearTimeout(timeoutId)
  }, [data, month])

  if (!isOpenAIConfigured()) {
    return null
  }

  if (loading) {
    return (
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, rgba(255,252,247,0.95) 0%, rgba(255,250,245,0.98) 100%)',
        border: '1px solid rgba(212,74,58,0.15)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '24px', 
            height: '24px', 
            border: '2px solid rgba(212,74,58,0.2)',
            borderTopColor: '#D44A3A',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}></div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#2A1F16', marginBottom: 2 }}>
              Spending Insights
            </div>
            <div className="small" style={{ color: '#8B6F5A' }}>Analyzing categories...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !insights || insights.length === 0) {
    return null
  }

  return (
    <div className="card" style={{ 
      background: 'linear-gradient(135deg, rgba(255,252,247,0.95) 0%, rgba(255,250,245,0.98) 100%)',
      border: '1px solid rgba(212,74,58,0.15)',
      boxShadow: '0 2px 8px rgba(212,74,58,0.08)',
      marginBottom: '20px'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px',
        marginBottom: '16px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #D44A3A 0%, #E06B5C 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 22V12H15V22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#2A1F16', marginBottom: 2 }}>
            Spending Insights
          </div>
          <div className="small" style={{ color: '#8B6F5A' }}>
            Category analysis & recommendations
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {insights && Array.isArray(insights) && insights.map((insight, index) => (
          <div 
            key={index}
            style={{
              padding: '12px 14px',
              background: 'rgba(255,255,255,0.6)',
              borderRadius: '10px',
              border: '1px solid rgba(212,74,58,0.1)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.8)'
              e.currentTarget.style.borderColor = 'rgba(212,74,58,0.2)'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(212,74,58,0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.6)'
              e.currentTarget.style.borderColor = 'rgba(212,74,58,0.1)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ 
              fontWeight: 700, 
              fontSize: 13, 
              color: '#D44A3A',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <div style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: '#D44A3A',
                flexShrink: 0
              }}></div>
              {insight.title}
            </div>
            <div style={{ 
              fontSize: 13, 
              lineHeight: '1.5',
              color: '#2A1F16'
            }}>
              {insight.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


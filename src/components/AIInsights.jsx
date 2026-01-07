import { useState, useEffect } from 'react'
import { getBudgetInsights, isOpenAIConfigured } from '../lib/openai'
import { annualStats, monthStats } from '../lib/calc'

export function AIInsights({ data, month }) {
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
        const result = await getBudgetInsights(data, month, a, m)
        
        if (result && result.insights && Array.isArray(result.insights)) {
          setInsights(result.insights)
        } else {
          setError(true)
        }
      } catch (err) {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    // Debounce to avoid too many API calls
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
        border: '1px solid rgba(212,74,58,0.15)'
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
              AI Insights
            </div>
            <div className="small" style={{ color: '#8B6F5A' }}>Analyzing your budget...</div>
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
      boxShadow: '0 2px 8px rgba(212,74,58,0.08)'
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
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#2A1F16', marginBottom: 2 }}>
            AI Insights
          </div>
          <div className="small" style={{ color: '#8B6F5A' }}>
            Personalized budget analysis
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


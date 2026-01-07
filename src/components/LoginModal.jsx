import { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { useBudgetStore } from '../store/useBudgetStore'
import { ConfirmModal } from './ConfirmModal'

export function LoginModal({ isOpen, onClose }) {
  const { signIn, signUp } = useAuthStore()
  const { data, importJson } = useBudgetStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loadingAuth, setLoadingAuth] = useState(false)
  const [showMigrateModal, setShowMigrateModal] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoadingAuth(true)

    try {
      if (isSignUp) {
        await signUp(email, password)
      } else {
        await signIn(email, password)
      }
      // Check if user has guest data to migrate
      const hasGuestData = data && Object.keys(data.expense || {}).length > 0
      if (hasGuestData) {
        setShowMigrateModal(true)
      } else {
        onClose()
      }
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoadingAuth(false)
    }
  }

  const handleMigrate = async () => {
    try {
      const jsonData = JSON.stringify(data, null, 2)
      await importJson(jsonData)
      setShowMigrateModal(false)
      onClose()
    } catch (err) {
      setError('Failed to migrate data: ' + err.message)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div 
        className="modal-backdrop" 
        onClick={onClose}
      >
        <div className="modal-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{isSignUp ? 'Sign Up' : 'Sign In'}</h3>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: 'var(--muted)' }}>
                  Email
                </label>
                <input
                  className="input wide"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: 'var(--muted)' }}>
                  Password
                </label>
                <input
                  className="input wide"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              {error && (
                <div style={{ 
                  padding: '12px', 
                  marginBottom: '16px', 
                  background: 'rgba(212,74,58,.1)', 
                  border: '1px solid rgba(212,74,58,.3)', 
                  borderRadius: '8px',
                  color: 'var(--bad)',
                  fontSize: '13px'
                }}>
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                className="btn" 
                style={{ width: '100%', marginBottom: '12px' }}
                disabled={loadingAuth}
              >
                {loadingAuth ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
              </button>

              <button
                type="button"
                className="btn secondary"
                style={{ width: '100%' }}
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError('')
                }}
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showMigrateModal}
        onClose={() => {
          setShowMigrateModal(false)
          onClose()
        }}
        onConfirm={handleMigrate}
        title="Migrate Guest Data?"
        message="You have budget data saved locally. Would you like to migrate it to your account? This will sync your data to the cloud."
        confirmText="Migrate Data"
        cancelText="Skip"
        confirmVariant="good"
      />
    </>
  )
}


import { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { ConfirmModal } from './ConfirmModal'


export function UserMenu() {
  const { user, signOut } = useAuthStore()
  const [showSignOutModal, setShowSignOutModal] = useState(false)

  if (!user) return null

  return (
    <>
      <div className="row" style={{ gap: '8px', alignItems: 'center' }}>
        <span className="small" style={{ color: 'var(--muted)' }}>
          {user.email}
        </span>
        <button 
          className="btn secondary" 
          onClick={() => setShowSignOutModal(true)}
          style={{ fontSize: '13px' }}
        >
          Sign Out
        </button>
      </div>

      <ConfirmModal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={signOut}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        cancelText="Cancel"
        confirmVariant="bad"
      />
    </>
  )
}


import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { useAuthStore } from './store/useAuthStore'

// Initialize auth on app start
useAuthStore.getState().init()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

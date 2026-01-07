import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  loading: true,

  init: async () => {
    if (!isSupabaseConfigured()) {
      set({ loading: false })
      return
    }

    try {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession()
      set({ user: session?.user ?? null, session, loading: false })

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ user: session?.user ?? null, session })
      })
    } catch (error) {
      console.error('Auth initialization error:', error)
      set({ loading: false })
    }
  },

  signUp: async (email, password) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please set up your environment variables.')
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error
    return data
  },

  signIn: async (email, password) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please set up your environment variables.')
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  },

  signOut: async () => {
    if (!isSupabaseConfigured()) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    set({ user: null, session: null })
  },

  resetPassword: async (email) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please set up your environment variables.')
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  },
}))


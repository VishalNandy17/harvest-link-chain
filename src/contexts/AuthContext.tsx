import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

// Import user roles from types
import { UserRole } from '@/lib/types';

// Extended user profile with role
export interface UserProfile {
  id: string
  first_name: string
  last_name: string
  email: string
  role: UserRole
  phone?: string
  address?: string
  created_at?: string
  updated_at?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  userRole: UserRole | null
  signUp: (email: string, password: string, userData: { firstName: string; lastName: string; role: UserRole }) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>
  updateProfile: (data: Partial<UserProfile>) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  // Fetch user profile from Supabase
  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      setProfileLoading(true)
      console.log('Fetching profile for user:', userId)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      console.log('Profile fetched successfully:', data)
      return data as UserProfile
    } catch (error) {
      console.error('Exception fetching profile:', error)
      return null
    } finally {
      setProfileLoading(false)
    }
  }

  // Handle auth state changes
  const handleAuthStateChange = async (event: string, session: Session | null) => {
    console.log('Auth state change:', event, session?.user?.id)
    
    setSession(session)
    setUser(session?.user ?? null)
    
    if (session?.user) {
      // User is authenticated, fetch profile
      const userProfile = await fetchProfile(session.user.id)
      setProfile(userProfile)
      setUserRole(userProfile?.role || null)
    } else {
      // User is not authenticated, clear profile
      setProfile(null)
      setUserRole(null)
    }
    
    // Always set loading to false after handling auth state
    setLoading(false)
  }

  useEffect(() => {
    console.log('AuthProvider: Setting up auth state listener')
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange)

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting initial session:', error)
          setLoading(false)
          return
        }

        console.log('Initial session:', session?.user?.id)
        
        // Manually trigger auth state change for initial session
        await handleAuthStateChange('INITIAL_SESSION', session)
      } catch (error) {
        console.error('Exception getting initial session:', error)
        setLoading(false)
      }
    }

    getInitialSession()

    return () => {
      console.log('AuthProvider: Cleaning up auth state listener')
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, userData: { firstName: string; lastName: string; role: UserRole }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role
        }
      }
    })

    return { error }
  }
  
  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      if (!user) throw new Error('User not authenticated')
      
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('user_id', user.id)
      
      if (error) throw error
      
      // Refresh the profile after update
      const updatedProfile = await fetchProfile(user.id)
      setProfile(updatedProfile)
      setUserRole(updatedProfile?.role || null)
      
      return { error: null }
    } catch (error) {
      console.error('Error updating profile:', error)
      return { error: error as Error }
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { error }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      // Proactively clear local auth state to avoid UI flashes
      setSession(null)
      setUser(null)
      setProfile(null)
      setUserRole(null)
    }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    return { error }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password
    })
    return { error }
  }

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading: loading || profileLoading,
    userRole,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
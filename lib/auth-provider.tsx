"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { createOrJoinOrganization, userNeedsOrganization } from '@/lib/organization-utils'

type Profile = Database['public']['Tables']['profiles']['Row']
type Organization = Database['public']['Tables']['organizations']['Row']

interface AuthContextType {
  user: User | null
  profile: Profile | null
  organization: Organization | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  
  const router = useRouter()
  const supabase = createClient()

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select(`
          *,
          organizations (*)
        `)
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur lors du chargement du profil:', error)
        return
      }

      if (profileData) {
        setProfile(profileData)
        setOrganization(profileData.organizations as Organization)
      } else {
        setProfile(null)
        setOrganization(null)
      }
    } catch (error) {
      console.error('Erreur inattendue lors du chargement du profil:', error)
    }
  }

  const handleUserSetup = async (user: User) => {
    try {
      setLoading(true)
      
      // Vérifier si l'utilisateur a besoin d'une organisation
      const needsOrganization = await userNeedsOrganization(user)
      
      if (needsOrganization) {
        console.log('Création automatique de l\'organisation pour:', user.email)
        
        // Créer ou rejoindre une organisation automatiquement
        const { organization: newOrg, profile: newProfile } = await createOrJoinOrganization(user)
        
        setProfile(newProfile)
        setOrganization(newOrg)
        
        console.log('Organisation créée/rejointe avec succès:', newOrg.name)
      } else {
        // L'utilisateur a déjà un profil, le charger normalement
        await fetchProfile(user.id)
      }
    } catch (error) {
      console.error('Erreur lors de la configuration utilisateur:', error)
      // En cas d'erreur, essayer de charger le profil existant
      await fetchProfile(user.id)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      setOrganization(null)
      
      // Rediriger vers la landing page
      router.push('/')
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      // Même en cas d'erreur, rediriger pour éviter d'être bloqué
      router.push('/')
    }
  }

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await handleUserSetup(session.user)
      }
      
      setLoading(false)
    }

    getInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await handleUserSetup(session.user)
        } else {
          setProfile(null)
          setOrganization(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    user,
    profile,
    organization,
    loading,
    signOut,
    refreshProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
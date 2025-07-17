import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type Organization = Database['public']['Tables']['organizations']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

/**
 * Extrait le domaine d'un email
 * @param email - L'email de l'utilisateur
 * @returns Le domaine (ex: "company.com")
 */
export function extractDomainFromEmail(email: string): string {
  return email.split('@')[1].toLowerCase()
}

/**
 * Génère un nom d'organisation à partir du domaine
 * @param domain - Le domaine (ex: "company.com") 
 * @returns Le nom de l'organisation (ex: "Company")
 */
export function generateOrganizationName(domain: string): string {
  // Prendre la partie avant le premier point et capitaliser
  const companyName = domain.split('.')[0]
  return companyName.charAt(0).toUpperCase() + companyName.slice(1)
}

/**
 * Détermine si l'utilisateur doit être propriétaire (premier de l'organisation)
 * @param supabase - Client Supabase
 * @param organizationId - ID de l'organisation
 * @returns true si c'est le premier utilisateur, false sinon
 */
async function shouldBeOwner(supabase: ReturnType<typeof createClient>, organizationId: string): Promise<boolean> {
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  return count === 0
}

/**
 * Crée ou rejoint une organisation basée sur le domaine email de l'utilisateur
 * @param user - L'utilisateur authentifié
 * @returns L'organisation et le profil créés/trouvés
 */
export async function createOrJoinOrganization(user: User): Promise<{
  organization: Organization
  profile: Profile
}> {
  const supabase = createClient()

  if (!user.email) {
    throw new Error('Email utilisateur non disponible')
  }

  const domain = extractDomainFromEmail(user.email)
  const organizationName = generateOrganizationName(domain)

  try {
    console.log(`Recherche d'une organisation pour le domaine: ${domain}`)

    // 1. D'abord, essayer de récupérer une organisation existante
    const { data: existingOrg, error: searchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('domain', domain)
      .maybeSingle() // N'erreur pas si aucun résultat

    let organization: Organization

    if (searchError) {
      console.error('Erreur lors de la recherche d\'organisation:', searchError)
      throw new Error(`Erreur lors de la recherche d'organisation: ${searchError.message}`)
    }

    if (existingOrg) {
      // Organisation existante trouvée
      console.log(`Organisation existante trouvée: ${existingOrg.name} (${existingOrg.domain})`)
      organization = existingOrg
    } else {
      // Aucune organisation trouvée, essayer d'en créer une nouvelle
      console.log(`Aucune organisation trouvée pour ${domain}, création en cours...`)
      
      const { data: newOrg, error: createError } = await supabase
        .from('organizations')
        .insert([{
          name: organizationName,
          domain: domain
        }])
        .select()
        .single()

      if (createError) {
        // Vérifier si c'est une erreur de clé dupliquée (race condition)
        if (createError.code === '23505' || createError.message?.includes('duplicate key')) {
          console.log('Conflit détecté (race condition), récupération de l\'organisation existante...')
          
          // Quelqu'un d'autre a créé l'organisation entre temps, la récupérer
          const { data: conflictOrg, error: conflictError } = await supabase
            .from('organizations')
            .select('*')
            .eq('domain', domain)
            .single()

          if (conflictError) {
            throw new Error(`Erreur lors de la récupération après conflit: ${conflictError.message}`)
          }

          console.log(`Organisation récupérée après conflit: ${conflictOrg.name}`)
          organization = conflictOrg
        } else {
          console.error('Erreur lors de la création d\'organisation:', createError)
          throw new Error(`Erreur lors de la création de l'organisation: ${createError.message}`)
        }
      } else {
        console.log(`Nouvelle organisation créée: ${newOrg.name} (${newOrg.domain})`)
        organization = newOrg
      }
    }

    // 2. Vérifier si l'utilisateur a déjà un profil
    console.log(`Vérification du profil existant pour l'utilisateur: ${user.id}`)
    
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Erreur lors de la vérification du profil:', profileError)
      throw new Error(`Erreur lors de la vérification du profil: ${profileError.message}`)
    }

    if (existingProfile) {
      console.log(`Profil existant trouvé pour l'utilisateur ${user.email}`)
      return {
        organization,
        profile: existingProfile
      }
    }

    // 3. Déterminer le rôle (owner si premier de l'org, sinon member)
    console.log('Aucun profil existant, création en cours...')
    const isOwner = await shouldBeOwner(supabase, organization.id)
    const role = isOwner ? 'owner' : 'member'

    console.log(`Création du profil utilisateur avec le rôle: ${role} pour l'organisation: ${organization.name}`)

    // 4. Créer le profil utilisateur
    const { data: newProfile, error: createProfileError } = await supabase
      .from('profiles')
      .insert([{
        id: user.id,
        organization_id: organization.id,
        full_name: user.user_metadata?.full_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        role: role
      }])
      .select()
      .single()

    if (createProfileError) {
      console.error('Erreur lors de la création du profil:', createProfileError)
      throw new Error(`Erreur lors de la création du profil: ${createProfileError.message}`)
    }

    console.log(`✅ Succès: Organisation "${organization.name}" et profil utilisateur créés pour ${user.email}`)

    return {
      organization,
      profile: newProfile
    }

  } catch (error) {
    console.error('Erreur dans createOrJoinOrganization:', error)
    throw error
  }
}

/**
 * Vérifie si un utilisateur a besoin d'une organisation
 * @param user - L'utilisateur authentifié
 * @returns true si l'utilisateur n'a pas de profil/organisation
 */
export async function userNeedsOrganization(user: User): Promise<boolean> {
  const supabase = createClient()

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    return !profile || !profile.organization_id
  } catch {
    // Si erreur (probablement pas de profil), alors oui il a besoin d'une organisation
    return true
  }
}
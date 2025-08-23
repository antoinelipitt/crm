import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

/**
 * Refreshes an expired Google access token using the refresh token
 */
export async function refreshGoogleAccessToken(refreshToken: string) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    )

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    })

    const { credentials } = await oauth2Client.refreshAccessToken()
    
    return {
      access_token: credentials.access_token,
      expires_at: credentials.expiry_date ? Math.floor(credentials.expiry_date / 1000) : null,
      refresh_token: credentials.refresh_token || refreshToken, // Google might return a new refresh token
      token_type: credentials.token_type,
      scope: credentials.scope,
    }
  } catch (error) {
    console.error('Error refreshing access token:', error)
    throw new Error('Failed to refresh access token')
  }
}

/**
 * Gets a valid access token for a user, refreshing if necessary
 */
export async function getValidGoogleToken(userId: string) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'google',
    },
  })

  if (!account) {
    throw new Error('No Google account linked')
  }

  if (!account.access_token) {
    throw new Error('No access token available')
  }

  // Check if token is expired (with 5 minute buffer)
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = account.expires_at || 0
  const isExpired = expiresAt > 0 && expiresAt < (now + 300) // 5 min buffer

  if (!isExpired) {
    return {
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expires_at: account.expires_at,
    }
  }

  // Token is expired, try to refresh it
  if (!account.refresh_token) {
    throw new Error('No refresh token available. Please re-authenticate.')
  }

  console.log(`Refreshing expired token for user ${userId}`)
  
  try {
    const newTokens = await refreshGoogleAccessToken(account.refresh_token)
    
    // Update the tokens in the database
    await prisma.account.update({
      where: {
        id: account.id,
      },
      data: {
        access_token: newTokens.access_token,
        expires_at: newTokens.expires_at,
        refresh_token: newTokens.refresh_token,
        token_type: newTokens.token_type,
        scope: newTokens.scope,
      },
    })

    console.log(`Successfully refreshed token for user ${userId}`)

    return {
      access_token: newTokens.access_token!,
      refresh_token: newTokens.refresh_token,
      expires_at: newTokens.expires_at,
    }
  } catch (error) {
    console.error(`Failed to refresh token for user ${userId}:`, error)
    throw new Error('Failed to refresh token. Please re-authenticate.')
  }
}
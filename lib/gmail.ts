import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { refreshGoogleAccessToken } from '@/lib/google-auth'

interface MessageData {
  id?: string | null;
  threadId?: string | null;
  payload?: {
    headers?: { name?: string | null; value?: string | null }[];
    parts?: BodyPart[];
    body?: { data?: string | null };
    mimeType?: string | null;
  };
  labelIds?: string[] | null;
  snippet?: string | null;
}

interface BodyPart {
  mimeType?: string | null;
  body?: { data?: string | null };
  parts?: BodyPart[];
  filename?: string | null;
}

interface GmailError {
  code?: number;
  message?: string;
}

export class GmailClient {
  private gmail
  private auth
  private userId: string
  private refreshToken?: string

  constructor(accessToken: string, refreshToken?: string, userId?: string) {
    this.auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    )

    this.auth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    this.gmail = google.gmail({ version: 'v1', auth: this.auth })
    this.refreshToken = refreshToken
    this.userId = userId || ''
  }

  /**
   * Refreshes the access token and updates the OAuth2 client
   */
  private async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const newTokens = await refreshGoogleAccessToken(this.refreshToken)
      
      // Update the OAuth2 client with new credentials
      this.auth.setCredentials({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || this.refreshToken,
      })

      // Update stored refresh token if a new one was provided
      if (newTokens.refresh_token && newTokens.refresh_token !== this.refreshToken) {
        this.refreshToken = newTokens.refresh_token
      }

      // If we have userId, update the database
      if (this.userId) {
        await prisma.account.findFirst({
          where: {
            provider: 'google',
            userId: this.userId,
          },
        }).then(account => {
          if (account) {
            return prisma.account.update({
              where: {
                provider_providerAccountId: {
                  provider: 'google',
                  providerAccountId: account.providerAccountId,
                },
              },
          data: {
            access_token: newTokens.access_token,
            expires_at: newTokens.expires_at,
            refresh_token: newTokens.refresh_token,
              },
            })
          }
        }).catch(console.error)
      }

      return true
    } catch (error) {
      console.error('Failed to refresh access token:', error)
      return false
    }
  }

  async syncEmails(userId: string, organizationId: string) {
    try {
      // Get sync settings for the organization
      const syncSettings = await prisma.gmailSyncSettings.findUnique({
        where: { organizationId },
      })

      // Use settings or defaults
      const maxResults = syncSettings?.maxEmailsPerSync || 50
      const syncFromDays = syncSettings?.syncFromDays || 30
      const useIncrementalSync = syncSettings?.useIncrementalSync ?? true

      // Get the last sync info
      const lastSync = await prisma.emailSync.findUnique({
        where: { userId }
      })

      // Update sync status to syncing
      await prisma.emailSync.upsert({
        where: { userId },
        update: { syncStatus: 'syncing', lastError: null },
        create: { 
          userId, 
          syncStatus: 'syncing',
          emailCount: 0 
        }
      })

      // Create query based on sync settings
      let query = ''
      let syncDescription = ''
      
      if (useIncrementalSync && lastSync?.lastSyncAt) {
        // Incremental sync: fetch emails since last sync
        const afterDate = lastSync.lastSyncAt.toISOString().split('T')[0].replace(/-/g, '/')
        query = `after:${afterDate}`
        syncDescription = `Incremental sync - fetching emails after ${afterDate}`
      } else {
        // Fixed period sync: fetch emails from last X days
        const daysAgo = new Date()
        daysAgo.setDate(daysAgo.getDate() - syncFromDays)
        const afterDate = daysAgo.toISOString().split('T')[0].replace(/-/g, '/')
        query = `after:${afterDate}`
        syncDescription = useIncrementalSync 
          ? `First sync - fetching emails from last ${syncFromDays} days`
          : `Fixed period sync - fetching emails from last ${syncFromDays} days`
      }
      
      console.log(syncDescription)

      // Fetch emails with pagination support
      interface GmailMessage {
        id?: string | null;
        threadId?: string | null;
      }
      
      let allMessages: GmailMessage[] = []
      let nextPageToken: string | undefined = undefined
      let totalFetched = 0
      const maxPages = Math.ceil(maxResults / 50) // Gmail API max is 50 per page
      
      for (let page = 0; page < maxPages; page++) {
        let response
        const pageSize = Math.min(50, maxResults - totalFetched)
        
        try {
          // Fetch emails from Gmail with query and pagination
          response = await this.gmail.users.messages.list({
            userId: 'me',
            maxResults: pageSize,
            q: query,
            pageToken: nextPageToken,
          })
        } catch (error: unknown) {
          const gmailError = error as GmailError
          // If we get a 401, try to refresh the token and retry
          if (gmailError?.code === 401 && this.refreshToken) {
            console.log('Access token expired, attempting to refresh...')
            const refreshed = await this.refreshAccessToken()
            
            if (refreshed) {
              // Retry the request with the new token
              response = await this.gmail.users.messages.list({
                userId: 'me',
                maxResults: pageSize,
                q: query,
                pageToken: nextPageToken,
              })
            } else {
              throw new Error('Failed to refresh access token. Please re-authenticate.')
            }
          } else {
            throw error
          }
        }

        const pageMessages = response.data.messages || []
        allMessages = allMessages.concat(pageMessages)
        totalFetched += pageMessages.length
        
        // Check if there are more pages and we haven't reached our limit
        nextPageToken = response.data.nextPageToken ?? undefined
        if (!nextPageToken || totalFetched >= maxResults || pageMessages.length === 0) {
          break
        }
        
        console.log(`Fetched page ${page + 1}: ${pageMessages.length} messages (total: ${totalFetched})`)
      }

      const messages = allMessages.slice(0, maxResults) // Ensure we don't exceed maxResults
        let newEmailsCount = 0

      console.log(`Found ${messages.length} messages to process (max: ${maxResults})`)

      // Fetch full details for each message
      for (const message of messages) {
        if (!message.id) continue

        try {
          // Check if email already exists to count only new ones
          const existingEmail = await prisma.email.findUnique({
            where: { messageId: message.id }
          })
          
          const fullMessage = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id,
          })

          await this.saveEmail(fullMessage.data, userId, organizationId)
          
          // Count new emails only
          if (!existingEmail) {
            newEmailsCount++
          }
        } catch (error) {
          console.error(`Error fetching message ${message.id}:`, error)
        }
      }

      // Get total count of emails in database for this user
      const totalEmailCount = await prisma.email.count({
        where: { userId }
      })

      // Update sync status to completed
      await prisma.emailSync.update({
        where: { userId },
        data: {
          syncStatus: 'completed',
          lastSyncAt: new Date(),
          emailCount: totalEmailCount, // Total emails in database
          lastError: null,
        }
      })

      console.log(`Sync completed: ${newEmailsCount} new emails, ${totalEmailCount} total emails`)
      return { success: true, count: newEmailsCount, total: totalEmailCount }
    } catch (error) {
      console.error('Error syncing emails:', error)
      
      // Update sync status to failed
      await prisma.emailSync.upsert({
        where: { userId },
        update: {
          syncStatus: 'failed',
          lastError: error instanceof Error ? error.message : 'Unknown error',
        },
        create: {
          userId,
          syncStatus: 'failed',
          lastError: error instanceof Error ? error.message : 'Unknown error',
          emailCount: 0,
        }
      })

      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async saveEmail(messageData: MessageData, userId: string, organizationId: string) {
    const headers = messageData.payload?.headers || []
    const getHeader = (name: string) => 
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || ''

    const messageId = messageData.id || ''
    const threadId = messageData.threadId || ''
    const subject = getHeader('subject') || '(No Subject)'
    const from = getHeader('from')
    const to = getHeader('to').split(',').map((s: string) => s.trim())
    const cc = getHeader('cc') ? getHeader('cc').split(',').map((s: string) => s.trim()) : []
    const bcc = getHeader('bcc') ? getHeader('bcc').split(',').map((s: string) => s.trim()) : []
    const dateHeader = getHeader('date')
    const receivedAt = dateHeader ? new Date(dateHeader) : new Date()
    const labels = messageData.labelIds || []
    const snippet = messageData.snippet || ''

    // Extract body
    let bodyText = ''
    let bodyHtml = ''
    
    const extractBody = (parts: BodyPart[]): void => {
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          bodyText = Buffer.from(part.body.data, 'base64').toString('utf-8')
        } else if (part.mimeType === 'text/html' && part.body?.data) {
          bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8')
        } else if (part.parts) {
          extractBody(part.parts)
        }
      }
    }

    if (messageData.payload?.parts) {
      extractBody(messageData.payload.parts)
    } else if (messageData.payload?.body?.data) {
      const body = Buffer.from(messageData.payload.body.data, 'base64').toString('utf-8')
      if (messageData.payload.mimeType === 'text/html') {
        bodyHtml = body
      } else {
        bodyText = body
      }
    }

    // Check for attachments
    const hasAttachments = messageData.payload?.parts?.some((part: BodyPart) => 
      part.filename && part.filename.length > 0
    ) || false

    // Save to database
    await prisma.email.upsert({
      where: { messageId },
      update: {
        subject,
        from,
        to,
        cc,
        bcc,
        bodyText,
        bodyHtml,
        snippet,
        labels,
        hasAttachments,
        receivedAt,
        isStarred: labels.includes('STARRED'),
      },
      create: {
        messageId,
        threadId,
        subject,
        from,
        to,
        cc,
        bcc,
        bodyText,
        bodyHtml,
        snippet,
        labels,
        hasAttachments,
        receivedAt,
        isStarred: labels.includes('STARRED'),
        userId,
        organizationId,
      }
    })
  }

}
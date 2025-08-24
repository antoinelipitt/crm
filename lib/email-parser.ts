/**
 * Email parsing utilities for extracting contacts and companies from email addresses
 */

// Common personal email domains to exclude from company detection
const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'hotmail.fr',
  'hotmail.co.uk',
  'live.com',
  'live.fr',
  'msn.com',
  'yahoo.com',
  'yahoo.fr',
  'yahoo.co.uk',
  'ymail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'zoho.com',
  'mail.com',
  'gmx.com',
  'gmx.fr',
  'free.fr',
  'orange.fr',
  'wanadoo.fr',
  'sfr.fr',
  'laposte.net',
  'bbox.fr',
])

export interface ParsedEmail {
  email: string
  name?: string
  domain?: string
  isPersonal: boolean
}

/**
 * Parse an email string in format "Name <email@domain.com>" or "email@domain.com"
 */
export function parseEmailString(emailString: string): ParsedEmail | null {
  if (!emailString) return null

  // Remove any extra whitespace
  emailString = emailString.trim()

  let email: string
  let name: string | undefined

  // Check for "Name <email>" format
  const match = emailString.match(/^(.+?)\s*<(.+?)>$/)
  
  if (match) {
    name = match[1].trim()
    email = match[2].trim().toLowerCase()
    
    // Clean up name - remove quotes if present
    if (name) {
      name = name.replace(/^["']|["']$/g, '').trim()
      if (!name) name = undefined
    }
  } else {
    // Simple email format
    email = emailString.toLowerCase()
  }

  // Validate email format
  if (!email.includes('@')) return null

  // Extract domain
  const domain = extractDomain(email)
  if (!domain) return null

  // Check if it's a personal email
  const isPersonal = isPersonalEmailDomain(domain)

  return {
    email,
    name,
    domain,
    isPersonal
  }
}

/**
 * Extract domain from email address
 */
export function extractDomain(email: string): string | null {
  if (!email || !email.includes('@')) return null
  
  const parts = email.split('@')
  if (parts.length !== 2) return null
  
  const domain = parts[1].toLowerCase().trim()
  
  // Basic domain validation
  if (!domain || !domain.includes('.')) return null
  
  return domain
}

/**
 * Check if a domain is a personal email provider
 */
export function isPersonalEmailDomain(domain: string): boolean {
  if (!domain) return true
  return PERSONAL_EMAIL_DOMAINS.has(domain.toLowerCase())
}

/**
 * Parse multiple email addresses from a string or array
 * Used for to, cc, bcc fields
 */
export function parseMultipleEmails(emails: string | string[]): ParsedEmail[] {
  const emailList = Array.isArray(emails) ? emails : [emails]
  const parsed: ParsedEmail[] = []

  for (const emailStr of emailList) {
    if (!emailStr) continue
    
    // Split by comma in case multiple emails in one string
    const parts = emailStr.split(',')
    
    for (const part of parts) {
      const parsedEmail = parseEmailString(part)
      if (parsedEmail) {
        parsed.push(parsedEmail)
      }
    }
  }

  return parsed
}

/**
 * Extract unique domains from a list of parsed emails, excluding personal domains
 */
export function extractCompanyDomains(emails: ParsedEmail[]): string[] {
  const domains = new Set<string>()
  
  for (const email of emails) {
    if (email.domain && !email.isPersonal) {
      domains.add(email.domain)
    }
  }
  
  return Array.from(domains)
}

/**
 * Generate a company name from a domain
 * e.g., "apple.com" -> "Apple"
 */
export function generateCompanyName(domain: string): string {
  if (!domain) return domain
  
  // Remove common TLDs and subdomains
  let name = domain
    .replace(/\.(com|org|net|io|co|ai|app|dev|tech|biz|info|edu|gov)(\.[a-z]{2})?$/i, '')
    .replace(/^(www|mail|email|smtp|mx|webmail)\./, '')
  
  // Capitalize first letter
  name = name.charAt(0).toUpperCase() + name.slice(1)
  
  // Handle special cases
  if (name.includes('.')) {
    // For remaining dots, might be subdomain, take the last part
    const parts = name.split('.')
    name = parts[parts.length - 1]
    name = name.charAt(0).toUpperCase() + name.slice(1)
  }
  
  return name
}
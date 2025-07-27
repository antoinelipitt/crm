# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a CRM (Customer Relationship Management) application built with Next.js 15, React 19, and TypeScript. The application features a modern dashboard interface with sidebar navigation, data tables, charts, and various business management tools.

## Key Technologies

- **Framework**: Next.js 15 with App Router and Turbopack
- **Authentication**: NextAuth.js v5 (Auth.js) with Google OAuth
- **Database**: PostgreSQL with Prisma ORM
- **UI Components**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables
- **Icons**: Tabler Icons and Lucide React
- **Data Visualization**: Recharts
- **Tables**: TanStack Table v8
- **Notifications**: Sonner toast notifications
- **Drag & Drop**: @dnd-kit
- **Form Validation**: Zod

## Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint
```

## Architecture

### Directory Structure
- `app/` - Next.js App Router pages and layouts
  - `dashboard/` - Main dashboard application
  - `dashboard/settings/` - User settings pages (account, organization)
  - `api/` - API routes for authentication and organization management
- `components/` - React components (both business logic and UI)
- `components/ui/` - Reusable UI components from shadcn/ui
- `hooks/` - Custom React hooks
- `lib/` - Utility functions and shared code
  - `auth.ts` - NextAuth configuration
  - `prisma.ts` - Database connection
- `prisma/` - Database schema and migrations
- `public/` - Static assets

### Key Components
- `AppSidebar` - Main navigation sidebar with collapsible sections
- `SiteHeader` - Top navigation header with dynamic breadcrumbs
- `NavUser` - User dropdown menu with account/organization access
- `DataTable` - Reusable data table component using TanStack Table
- `ChartAreaInteractive` - Interactive chart component using Recharts
- `SectionCards` - Dashboard metric cards
- `Toaster` - Sonner toast notifications positioned bottom-right

### Navigation Structure
The sidebar contains:
- Main navigation (Dashboard, Lifecycle, Analytics, Projects, Team)
- Cloud tools (Capture, Proposal, Prompts) with sub-items
- Secondary navigation (Settings, Help, Search)
- Document tools (Data Library, Reports, Word Assistant)

### Styling System
- Uses Tailwind CSS v4 with CSS variables for theming
- Components follow shadcn/ui design patterns
- Responsive design with container queries (@container/main)
- Custom CSS variables for sidebar width and header height

## Component Patterns

### File Organization
- UI components are in `components/ui/`
- Business components are in `components/`
- Each component uses TypeScript with proper typing
- Components use "use client" directive when needed for client-side features

### Import Aliases
- `@/components` - Components directory
- `@/lib` - Library/utility functions
- `@/hooks` - Custom hooks
- `@/components/ui` - UI component library

## Configuration Files

- `components.json` - shadcn/ui configuration (New York style, RSC enabled)
- `eslint.config.mjs` - ESLint configuration extending Next.js rules
- `tsconfig.json` - TypeScript configuration
- `next.config.ts` - Next.js configuration
- `postcss.config.mjs` - PostCSS configuration for Tailwind

## Authentication & Database

### Authentication Flow
- NextAuth.js v5 with Google OAuth provider
- JWT-based session management
- Automatic organization assignment based on email domain
- Protected routes with middleware (`middleware.ts`)

### Database Schema (Prisma)
- **User**: Basic user information from OAuth
- **Account**: OAuth account linking
- **Organization**: Company/domain-based organizations
- **OrganizationMember**: User-organization relationships with roles (OWNER/MEMBER)

### Organization Management
- Automatic organization creation on first login
- Email domain-based assignment (@company.com → Company organization)
- Role-based access control (OWNER can manage members, MEMBER is read-only)
- Member role management (promote/demote) with business rules

## Pages Structure

### Public Pages
- `/` - Landing page
- `/login` - Authentication page

### Dashboard Pages (Protected)
- `/dashboard` - Main dashboard with charts and metrics
- `/dashboard/settings/account` - User account management
- `/dashboard/settings/organization` - Organization member management

### API Routes
- `/api/auth/[...nextauth]` - NextAuth authentication endpoints
- `/api/organization/members` - Get organization members
- `/api/organization/members/[id]/role` - Update member roles

## Notifications System

- **Sonner** toast notifications positioned bottom-right
- Notifications for all database actions (success/error)
- English-only messaging throughout application
- Real-time feedback for user actions

## Data Management

- Database: PostgreSQL with Prisma ORM
- Real-time member data fetching and updates
- Optimistic UI updates for role changes
- Session-based user state management

## Language and Localization

- Application is English-only
- All UI text, notifications, and error messages in English
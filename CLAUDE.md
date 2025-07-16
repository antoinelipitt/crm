# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a CRM (Customer Relationship Management) application built with Next.js 15, React 19, and TypeScript. The application features a modern dashboard interface with sidebar navigation, data tables, charts, and various business management tools.

## Key Technologies

- **Framework**: Next.js 15 with App Router and Turbopack
- **UI Components**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables
- **Icons**: Tabler Icons and Lucide React
- **Data Visualization**: Recharts
- **Tables**: TanStack Table v8
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
- `components/` - React components (both business logic and UI)
- `components/ui/` - Reusable UI components from shadcn/ui
- `hooks/` - Custom React hooks
- `lib/` - Utility functions and shared code
- `public/` - Static assets

### Key Components
- `AppSidebar` - Main navigation sidebar with collapsible sections
- `SiteHeader` - Top navigation header
- `DataTable` - Reusable data table component using TanStack Table
- `ChartAreaInteractive` - Interactive chart component using Recharts
- `SectionCards` - Dashboard metric cards

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

## Data Management

- Dashboard data is loaded from `app/dashboard/data.json`
- Static navigation data is defined in `app-sidebar.tsx`
- No external API integration currently implemented
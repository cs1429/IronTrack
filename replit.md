# IronTrack - Workout Tracking Application

## Overview

IronTrack is a full-stack workout tracking application that allows users to log workouts, track exercise progress over time, and manage workout splits (training programs). The application provides a dashboard with training statistics, workout logging functionality, progress charts with data visualization, and split/exercise management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theming (CSS variables for light/dark mode support)
- **Charts**: Recharts for data visualization (workout progress charts)
- **Date Handling**: date-fns for date formatting and manipulation
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ESM modules)
- **API Style**: RESTful JSON API with typed contracts using Zod schemas
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Validation**: drizzle-zod for generating Zod schemas from database tables

### Data Storage
- **Database**: PostgreSQL (required via DATABASE_URL environment variable)
- **Schema Location**: `shared/schema.ts` - contains all table definitions and relations
- **Migrations**: Drizzle Kit with migrations output to `./migrations` directory

### Core Data Models
1. **Exercises** - Individual exercises with name and description
2. **Splits** - Training programs with multiple days
3. **SplitExercises** - Junction table linking exercises to splits with sets/reps configuration
4. **Workouts** - Recorded workout sessions with date and optional notes
5. **Sets** - Individual set records with weight, reps, and exercise reference

### API Contract Pattern
The application uses a shared API contract in `shared/routes.ts` that defines:
- HTTP methods and paths
- Input validation schemas (Zod)
- Response type schemas
- Both frontend hooks and backend routes reference this contract for type safety

### Build System
- **Development**: tsx for running TypeScript directly
- **Production Build**: Custom build script using esbuild for server bundling and Vite for client
- **Output**: Server bundles to `dist/index.cjs`, client builds to `dist/public`

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **connect-pg-simple**: PostgreSQL session store (available but sessions not currently implemented)

### UI/Component Libraries
- **Radix UI**: Full suite of accessible UI primitives (dialog, dropdown, tabs, etc.)
- **shadcn/ui**: Pre-built component configurations in `client/src/components/ui/`
- **Lucide React**: Icon library
- **Embla Carousel**: Carousel component
- **cmdk**: Command palette component
- **Vaul**: Drawer component
- **react-day-picker**: Calendar date picker

### Development Tools
- **Replit Plugins**: vite-plugin-runtime-error-modal, vite-plugin-cartographer, vite-plugin-dev-banner for Replit-specific development features

### Fonts
- **Google Fonts**: Chakra Petch (display), Inter (body), DM Sans, Fira Code, Geist Mono, Architects Daughter
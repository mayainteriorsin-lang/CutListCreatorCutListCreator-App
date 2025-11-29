# Kitchen Cabinet Cutting List Generator

## Overview
This professional single-page React application, built with TypeScript, automates the generation of precise cutting lists for kitchen cabinets. It streamlines the production process for cabinet makers and woodworkers by automating panel calculations, laminate selection, and configuration for various cabinet types. Key capabilities include comprehensive laminate code management, metric/imperial unit support, PDF export of optimized cutting lists, GADDI panel marking, material-based sheet separation, and wood grain direction control. The project aims to maximize material utilization and provide an efficient tool for the industry.

## User Preferences
- Preferred communication style: Simple, everyday language.
- Testing: Keep tests short and focused to save time.
- UI changes: Always ask before making UI changes.
- GADDI SYSTEM UNBLOCKED: The GADDI panel marking system is now available for modifications and enhancements.

## Recent Updates

### November 29, 2025 - Wood Grain Rendering Fix Complete ✅
- **Issue Fixed**: 456SF panels displayed with incorrect (swapped) dimensions in cut sheet preview
  - Panels showed "800×450" instead of actual "450×800" (appeared rotated)
  - Misleading because optimizer correctly prevents rotation (`rotate: false`)
- **Root Cause**: Rendering was using mapped display dimensions instead of original nominal dimensions for wood grain panels
- **Solution Implemented**:
  - Panel summary now uses nominal dimensions (nomW, nomH) for wood grain panels (`grainDirection === true`)
  - Dimension labels render original sizes: 450×800mm (correct) instead of 800×450mm (incorrect)
  - Letter codes properly match with correct dimensions
  - Non-wood grain panels still use display dimensions as intended
- **Result**: 456SF panels now display accurate, non-rotated dimensions in all outputs
- **Code Changes**: Modified 3 sections in client/src/pages/home.tsx:
  - Panel summary generation (uses nomW/nomH for wood grain)
  - Dimension display (shows nomW/nomH for wood grain)
  - Letter code assignment (matches correct dimension keys)

### November 28, 2025 - Text Overlap Fix & Laminate Code Synchronization Complete
- **Shutter Text Overlap Fixed**: Moved dimension text (e.g., "120 × 200") from center to right side with 8px padding
  - GADDI label stays on left (top-left corner)
  - Dimensions now appear on right side with proper spacing
  - Applied to all panels: shutters, posts, shelves, and cabinet panels (TOP/BOTTOM/LEFT/RIGHT/BACK)
- **Quick Cabinet Laminate Synchronization**: Fixed issue where Quick Cabinet buttons created cabinets with empty laminate codes
  - Quick Cabinet creation now loads stored memory values (topPanelLaminateCode, backPanelLaminateCode, plywoodType)
  - All 4 panels (TOP/BOTTOM/LEFT/RIGHT) now automatically sync together with same laminate codes
  - Added missing inner laminate defaults (off white)
  - Result: Quick Cabinets now consolidate onto same sheets instead of creating separate sheets with "None" laminates
- **Verified**: All panel types render identically in preview with proper spacing and synchronized laminates ✅

### November 28, 2025 - Quick Shutter & Advanced Cabinet Unification Complete
- **Unlimited Quantity Support**: Removed maximum quantity limit - both Quick Shutter and Advanced Cabinet now support unlimited shutter quantities (tested with 30+)
- **Unified Preview System**: Verified that Quick Shutter and Advanced Cabinet shutters display identically in preview
  - Quick Shutter (Basic mode) with quantity 30 produces same preview as Advanced Cabinet with 30 shutters
  - Identical shutter layout, text rendering, and dimensions
  - Confirms unified code path is working correctly
- **Form Validation Fixed**: Basic mode now validates only shutter laminate codes, not Advanced panel codes
- **Preview Accumulation Fixed**: Preview dialog auto-closes after adding cabinet, preventing old panels from mixing with new ones
- **Verified Test Case**: Quick Shutter with 30 shutters = Advanced Cabinet with 30 shutters in preview ✅

### November 23, 2025 - Page Numbers & Laminate Counting Fix
- **Page Numbers Added**: All preview pages and PDF export pages now display page numbers
  - Summary page shows "Page 1 of X" in bottom right
  - Each cutting sheet shows "Page X of Y" in bottom right
  - PDF export includes page numbers on all pages (material list + cutting sheets)
- **CRITICAL Laminate Counting Fix**: Corrected fundamental error in laminate sheet calculation
  - **Understanding**: Laminate sheets are the SAME SIZE as plywood sheets (both 8×4 ft or 1210×2420mm)
  - **Manufacturing Reality**: Each plywood sheet needs laminate applied to front face + inner face
  - **Before**: Incorrectly counted PANELS (e.g., 72 panels = 72 laminate sheets) ❌
  - **After**: Correctly counts PLYWOOD SHEETS (e.g., 11 plywood sheets = 11 front + 11 inner laminate sheets) ✅
  - **Example**: 11 plywood sheets with "789xyz + off white" now correctly shows:
    - 789xyz: 11 sheets (front face of 11 plywood sheets)
    - off white: 11 sheets (inner face of 11 plywood sheets)
  - **Impact**: Reduced inflated counts from 180+ sheets to accurate 20-30 sheets for typical projects
- **Master Settings Persistence**: Sheet width, height, and kerf values now auto-save to database
  - Settings persist across logout/browser refresh
  - Auto-saves with 500ms debounce after changes
  - Loads last used values on page mount

### November 23, 2025 - Professional Material Summary Tables
- **Clean Table Design**: Redesigned material summary with professional table layout in both preview and PDF
- **Preview Material Card**: 
  - Numbered rows with alternating backgrounds
  - Color-coded headers (Amber for plywood, Blue for laminates)
  - Total count badges
  - Sorted laminate list (highest quantity first)
- **PDF Material Tables**:
  - Professional bordered tables with headers
  - Zebra-striped rows for readability
  - Color-coded section headers matching preview
  - Uppercase laminate codes for clarity
- **Improved User Experience**: Clear visual hierarchy makes material requirements instantly readable

### November 23, 2025 - Database & Production Readiness
- **PostgreSQL Database Provisioned**: Successfully set up PostgreSQL database with full schema deployment
- **Database Tables Active**:
  - `laminate_memory` - Persistent storage for all laminate codes
  - `plywood_brand_memory` - Stores plywood brands across sessions
  - `quick_shutter_memory` - Remembers last used shutter configuration
  - `laminate_wood_grains_preference` - Per-laminate wood grain direction settings
- **Object Storage Confirmed**: Google Cloud Storage configured for client PDFs and material lists
- **Material Calculation System**: Fully functional with multi-pass optimization and database-driven wood grain logic
- **Production Status**: ✅ Ready for deployment - all persistence layers operational

## Wood Grain Rules & Visual Layout

### Core Rule
**456SF panels NEVER rotate** - Wood grain direction is locked to maintain visual continuity

### Dimensional Mapping for Wood Grain Panels

#### TOP & BOTTOM PANELS
```
Original (Nominal):           Display (for packing):
┌─────────────────┐          ┌─────────────────┐
│  Width: 564mm   │          │  Height: 564mm  │
│  Height: 450mm  │    →     │  Width: 450mm   │
└─────────────────┘          └─────────────────┘
  (Vertical Grain)             (Horizontal in sheet)
```
- Dimensions SWAP: nomW×nomH becomes displayH×displayW
- Used for sheet packing efficiency
- Original dimensions displayed to user

#### LEFT & RIGHT PANELS
```
Original (Nominal):           Display (for packing):
┌─────────────────┐          ┌─────────────────┐
│  Width: 450mm   │          │  Width: 450mm   │
│  Height: 800mm  │    →     │  Height: 800mm  │
└─────────────────┘          └─────────────────┘
  (No swap needed)             (Same orientation)
```
- Dimensions stay the SAME
- Already in correct orientation

#### BACK PANELS
```
Original (Nominal):           Display (for packing):
┌─────────────────┐          ┌─────────────────┐
│  Width: 600mm   │          │  Width: 800mm   │
│  Height: 800mm  │    →     │  Height: 600mm  │
└─────────────────┘          └─────────────────┘
  (Horizontal Grain)           (Vertical in sheet)
```
- Dimensions SWAP for different grain orientation
- Height becomes width, width becomes height

### Sheet Layout Example: 456SF Cabinet
```
┌─────────────────────────────────────────────────────┐
│                 PLYWOOD SHEET                        │
│              1210mm × 2420mm                         │
│                                                      │
│  ┌──────────────────────┬──────────────────────┐    │
│  │   TOP (564×450)      │   BOTTOM (564×450)   │    │
│  │   ↑ Wood Grain ↑     │   ↑ Wood Grain ↑     │    │
│  │                      │                      │    │
│  └──────────────────────┴──────────────────────┘    │
│                                                      │
│  ┌──────────────────────┬──────────────────────┐    │
│  │   LEFT (450×800)     │   RIGHT (450×800)    │    │
│  │   ↕ Vertical Grain   │   ↕ Vertical Grain   │    │
│  │                      │                      │    │
│  │                      │                      │    │
│  └──────────────────────┴──────────────────────┘    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Key Points
- **456SF: rotate = FALSE** (LOCKED - cannot rotate)
- **Off White: rotate = TRUE** (CAN rotate for optimization)
- **Wood Grain Panels**: Show ORIGINAL nominal dimensions (nomW × nomH)
- **Non-Wood Grain**: Show mapped display dimensions (displayW × displayH)

## System Architecture

### Frontend Architecture
The frontend utilizes React 18 with TypeScript, Vite, shadcn/ui (Radix UI), and Tailwind CSS. React Hook Form with Zod handles form management, Wouter manages routing, and TanStack Query is used for global state. The design is responsive and mobile-first.

### Backend Architecture
The backend is an Express.js server in TypeScript, using Drizzle ORM for PostgreSQL integration with Neon Database. It follows a RESTful API design and uses `connect-pg-simple` for session management.

### Database Design
The application uses a PostgreSQL database, with schema managed through Drizzle ORM migrations, including user management and shared schema definitions.

### System Design Choices
- **Unified Cabinet with Shutter Section**: A single interface for shutters and cabinets with Basic/Advanced mode toggle.
- **Comprehensive Cabinet Configuration**: Supports various cabinet types with customizable dimensions and shutter configurations, exclusively using a laminate code system.
- **Automated Panel Calculations**: Accurately calculates panel dimensions based on user inputs and cabinet types.
- **100% Database-Driven Laminate Code System**: All laminate and wood grain logic is handled via direct database lookups using laminate codes, replacing a manual laminate type system.
- **Advanced PDF Export**: Generates multi-page A4 portrait PDFs with optimized cutting layouts, project details, panel lists, and cutting layouts, supporting deletable pages and separated sheets.
- **GADDI Panel Marking**: Individual toggle for panels requiring "GADDI" marking with visual indicators. TOP/BOTTOM panels always mark the WIDTH dimension, and LEFT/RIGHT panels always mark the HEIGHT dimension, regardless of panel rotation. Implemented as a self-contained module.
- **Material-Based Sheet Separation**: A universal grouping algorithm combines panels on the same sheet if they share matching plywood brand and base laminate code.
- **Wood Grain Direction**: A 100% database-driven system applies wood grain direction based on database lookups for laminates with `wood_grains_enabled = true`.
- **Manual Panel Addition**: Allows users to add custom panels directly to specific sheets within the preview, integrated into PDF exports.
- **Link Panels Toggle**: A unified control to automatically synchronize plywood brand and laminate code across all cabinet panels, with manual override.
- **Master Settings**: A global control panel to synchronize plywood brand and laminate code across all cabinets, with wood grain preferences managed through the database.
- **Quick Save to Client Folders**: Instantly saves PDF cutting lists and material lists to client-specific folders in object storage.
- **Apply to All Toggle Controls**: Three configuration toggles (Center Post, Shelves, Include Shutters) automatically apply their state to all existing cabinets for unified project control.
- **Multi-Pass Optimization**: Employs a multi-strategy optimization system (e.g., Best Area Fit, Best Short Side Fit, Best Long Side Fit, Bottom Left) to maximize material utilization, especially for non-wood grain laminates.
- **Code Separation**: Wood grain and standard optimization logic are separated into distinct modules for clarity and maintainability.
- **Accurate Dimension Display**: Wood grain panels display their original nominal dimensions to users while using mapped dimensions internally for packing calculations, ensuring accurate cutting instructions.

## External Dependencies

### UI and Design
- **Radix UI**: Accessible UI primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **Google Fonts (Inter)**: Typography.

### Form Management
- **React Hook Form**: Forms library.
- **Zod**: Schema validation.

### Database and Backend
- **Drizzle ORM**: Type-safe ORM for PostgreSQL.
- **@neondatabase/serverless**: Serverless PostgreSQL driver.
- **connect-pg-simple**: PostgreSQL session store.

### PDF Generation
- **jsPDF**: Client-side PDF generation.

### Utility Libraries
- **date-fns**: Date manipulation.
- **clsx** and **class-variance-authority**: Conditional CSS classes.
- **nanoid**: Unique ID generation.

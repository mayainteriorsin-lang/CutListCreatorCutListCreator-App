# Visual Quotation Module Architecture

## Overview

The Visual Quotation module is a canvas-based quotation builder for furniture/wardrobe pricing. Users draw units on a photo, configure materials, and generate professional PDF quotations.

## Module Structure

```
viual-quotation/
├── index.ts              # Module entry point (import from here)
├── constants.ts          # Shared constants (RATE_CARD_IDS, UNIT_TYPES, etc.)
│
├── store/                # State Management (Zustand)
│   ├── index.ts          # Store barrel exports
│   ├── v2/               # V2 Stores (Primary State)
│   │   ├── useDesignCanvasStore.ts   # Drawing, units, photos (Composed of slices)
│   │   ├── usePricingStore.ts        # Pricing rates, locks
│   │   ├── useQuotationMetaStore.ts  # Client info, metadata
│   │   └── useRoomStore.ts           # Multi-room management
│   ├── rateCardStore.ts              # Rate card CRUD
│   ├── customFolderStore.ts          # Custom folder CRUD
│   └── slices/           # Store Slices (Logic implementation for DesignCanvasStore)
│
├── services/             # Business Logic Layer
│   ├── index.ts          # Service barrel exports
│   ├── pricingService.ts # Pricing calculations
│   ├── roomService.ts    # Room CRUD operations
│   ├── quotationService.ts # Quotation lifecycle
│   ├── exportService.ts  # PDF/Excel/WhatsApp exports
│   └── rateCardService.ts # Rate card operations
│
├── engine/               # Pure Calculation Functions
│   ├── pricingEngine.ts  # Sqft → price calculations
│   ├── exportEngine.ts   # PDF/Excel generation
│   └── shutterEngine.ts  # Shutter geometry
│
├── hooks/                # React Hooks
│   ├── index.ts          # Hook barrel exports
│   └── useStoreInitialization.ts # Store hydration
│
├── pages/                # Page Components
│   └── quotation-2d/     # Main 2D quotation page
│       ├── Quotation2DPage.tsx
│       └── hooks/        # Page-specific hooks
│
├── components/           # UI Components
│   ├── Canvas/           # Drawing layer
│   ├── Wardrobe/         # Unit configuration
│   ├── Materials/        # Laminate selection
│   ├── Pricing/          # Price display
│   └── Export/           # Export UI
│
├── types/                # TypeScript Types
│   └── index.ts          # Type barrel exports
│
└── persistence/          # Storage Abstraction
    └── QuotationRepository.ts
```

## Data Flow

```
User Action
    ↓
Page Component (Quotation2DPage)
    ↓
Custom Hook (useQuotation2DState, useQuotation2DExport)
    ↓
Service Layer (pricingService, roomService, exportService)
    ↓
Store (V2 Zustand stores)
    ↓
Engine (Pure calculation functions)
    ↓
Persistence (Server API + localStorage fallback)
```

## Store Ownership

| Store | Owns | Persisted |
|-------|------|-----------|
| useDesignCanvasStore | Drawing state, units, photos | Yes |
| usePricingStore | Rates, pricing lock, material config | Yes |
| useQuotationMetaStore | Client info, quote metadata | Yes |
| useRoomStore | Room list, active room | Yes |
| useRateCardStore | Rate card templates | Yes |
| useCustomFolderStore | Custom folder organization | Yes |

## Key Patterns

### 1. Service Orchestration

UI → Services → Stores (never UI → Stores directly for complex operations)

```typescript
// Good
const handleRoomChange = () => {
  roomService.switchToRoom(index);
};

// Avoid for complex operations
const handleRoomChange = () => {
  useRoomStore.setState({ activeRoomIndex: index });
  useDesignCanvasStore.setState({ ... });
};
```

### 2. Pricing Lock

Once a quotation is finalized, pricing becomes read-only:

```typescript
const { pricingLocked, finalPrice, lockPricing } = usePricingStore();

if (pricingLocked) {
  // Use finalPrice snapshot - no recalculation
  return finalPrice.grandTotal;
}
```

### 3. Barrel Imports

Always import from barrel files, not individual files:

```typescript
// Good
import { usePricingStore, pricingService } from "@/modules/visual-quotation";

// Avoid
import { usePricingStore } from "@/modules/visual-quotation/store/v2/usePricingStore";
```

## Architecture Evolution

The module uses a **Decoupled Store Architecture (V2)** where state is split into semantic domain stores (`DesignCanvas`, `Pricing`, `Meta`, `Room`).

### Historical Context

Previously (V1), a monolithic `visualQuotationStore` managed all state. This was deprecated and removed in favor of the specialized V2 stores to improve maintainability and performance.

### Logic Reuse (Slices)

The `store/slices/` directory contains logic implementations (e.g., `drawingSlice`, `unitsSlice`) that are composed into the `useDesignCanvasStore`. This allows for code organization while keeping the store usage simple.

## Testing

```bash
# Run all tests
npm test

# Run specific module tests
npm test -- --grep "pricingEngine"
```

### Test Coverage Goals

- Pricing calculations: 100%
- Service layer: 80%
- UI components: 60%

## Adding New Features

1. **New Store State**: Add to existing V2 store or create new one
2. **New Business Logic**: Add to services layer
3. **Pure Calculations**: Add to engine layer
4. **New UI**: Add to components, use hooks for state

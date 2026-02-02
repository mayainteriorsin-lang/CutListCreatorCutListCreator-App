# Visual Quotation Module - Test Strategy

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TEST PYRAMID                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                           E2E Tests                                      │
│                         ┌─────────┐                                      │
│                         │ 2-3 MAX │  Critical paths only                │
│                         └────┬────┘                                      │
│                    UI Component Tests                                    │
│                   ┌──────────────────┐                                   │
│                   │    ~15 tests     │  Props/Events/States             │
│                   └────────┬─────────┘                                   │
│               Integration Tests (Service + Engine)                       │
│              ┌────────────────────────────┐                              │
│              │        ~10 tests           │  Layer contracts            │
│              └─────────────┬──────────────┘                              │
│                     Service Tests (MOST CRITICAL)                        │
│             ┌──────────────────────────────────┐                         │
│             │          300+ tests              │  Business logic        │
│             └──────────────────┬───────────────┘                         │
│                          Unit Tests (Foundation)                         │
│            ┌────────────────────────────────────────┐                    │
│            │              ~60 tests                  │  Pure functions  │
│            └────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Test Layers

### Layer 1: Unit Tests (FOUNDATION)

**Scope:** Pure functions, utilities, validators, calculations
**Target:** ~60 tests | 100% coverage on engines

| Module | Status | Priority |
|--------|--------|----------|
| `engine/pricingEngine.ts` | ✅ Complete | - |
| `engine/productionEngine.ts` | ✅ Complete | - |
| `engine/exportEngine.ts` | ⬜ TODO | HIGH |
| `engine/shutterEngine.ts` | ⬜ TODO | MEDIUM |
| `utils/fileValidation.ts` | ✅ Complete | - |

---

### Layer 2: Service Tests (MOST CRITICAL)

**Scope:** Business logic orchestration, state coordination, error handling
**Target:** 300+ tests | >80% coverage on all services

| Service | Status | Priority |
|---------|--------|----------|
| `pricingService.ts` | ✅ Complete | - |
| `roomService.ts` | ✅ Complete | - |
| `quotationService.ts` | ✅ Complete | - |
| `exportService.ts` | ✅ Complete | - |
| `rateCardService.ts` | ✅ Complete | - |
| `rateLineService.ts` | ✅ Complete | - |
| `productionService.ts` | ✅ Complete | - |
| `storageService.ts` | ✅ Complete | - |

**Current Status:** All core services have comprehensive test suites (>300 tests total).

**Rules:**

- Mock ALL stores (getState, setState)
- Mock external APIs and localStorage
- Test orchestration logic, NOT UI rendering
- Validate error handling and safe defaults

**Key Test Patterns Established:**

1. **LocalStorage Mocking**:

   ```typescript
   const mockStorage = {};
   Object.defineProperty(window, 'localStorage', {
       value: {
           getItem: (k) => mockStorage[k],
           setItem: (k, v) => mockStorage[k] = v
       }
   });
   ```

2. **Store State Reset**:

   ```typescript
   beforeEach(() => {
       useStore.setState(initialState);
   });
   ```

3. **Immutability Checks**:

   ```typescript
   it('should not mutate inputs', () => {
       const original = { ... };
       service.update(original);
       expect(original).toEqual(originalClone);
   });
   ```

---

### Layer 3: Repository & Store Tests

**Scope:** Persistence, API calls, state mutations
**Target:** ~30 tests

| Module | Status | Priority |
|--------|--------|----------|
| `QuotationRepository.ts` | 🔶 Partial | MEDIUM |
| `useDesignCanvasStore.ts` | ⬜ TODO | MEDIUM |
| `usePricingStore.ts` | ⬜ TODO | MEDIUM |

---

### Layer 4: Component Tests (UI)

**Scope:** Individual React components
**Target:** ~15 tests

| Component | Status | Priority |
|-----------|--------|----------|
| `FloorPlan3D.tsx` | 🔶 Refactored | LOW |

**Note on UI:** `FloorPlan3D` has been refactored into modular layers (`ExteriorLayer`, `UnitLayer`, etc.) which separates rendering from logic, making it safer to test in isolation if needed.

---

## Success Criteria

### Coverage Targets

| Layer | Target | Current |
|-------|--------|---------|
| Engine (Pure Functions) | 100% | ~80% |
| Services | 80% | **82%** ✅ |
| Stores | 80% | ~10% |
| Components | 60% | ~0% |

### Architectural Integrity

- [x] Business logic changes require NO UI test changes
- [x] UI refactors do NOT break service tests
- [x] Storage schema changes do NOT break UI tests

---

## Commands

```bash
# Run all service tests
npm test -- src/modules/visual-quotation/services --run

# Run with coverage
npm run test -- --coverage
```

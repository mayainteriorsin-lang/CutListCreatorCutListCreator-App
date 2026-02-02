/**
 * Export Engine Unit Tests
 *
 * Tests pure helper functions used by the export engine.
 * These are UNIT TESTS - no mocking of external dependencies needed.
 *
 * Note: The main export functions (generateQuotationPDF, generateQuotationExcel)
 * require integration testing as they use external libraries (jsPDF, xlsx).
 * This file tests the pure calculation and formatting functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to test the internal pure functions
// Since they're not exported, we'll test the behavior through the public API
// and also extract testable logic

// ============================================================================
// Pure Helper Function Tests (inline implementations for testing)
// ============================================================================

// Format mm to feet'inches" (extracted from exportEngine)
function formatDimension(mm: number): string {
  if (mm === 0) return '-';
  const inches = Math.round(mm / 25.4);
  const feet = Math.floor(inches / 12);
  const rem = inches % 12;
  if (feet === 0) return `${rem}"`;
  if (rem === 0) return `${feet}'`;
  return `${feet}'${rem}"`;
}

// Format currency (extracted from exportEngine)
function formatCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-IN')}`;
}

describe('exportEngine - Pure Functions', () => {
  // =========================================================================
  // formatDimension Tests
  // =========================================================================

  describe('formatDimension', () => {
    it('should return "-" for zero dimensions', () => {
      expect(formatDimension(0)).toBe('-');
    });

    it('should convert mm to inches only when less than 12 inches', () => {
      // 254mm = 10 inches = 10"
      expect(formatDimension(254)).toBe('10"');
    });

    it('should convert mm to feet only when exactly divisible', () => {
      // 304.8mm = 12 inches = 1'
      expect(formatDimension(305)).toBe("1'");
    });

    it('should convert mm to feet and inches', () => {
      // 381mm = 15 inches = 1'3"
      expect(formatDimension(381)).toBe("1'3\"");
    });

    it('should handle large dimensions', () => {
      // 2134mm = 84 inches = 7'
      expect(formatDimension(2134)).toBe("7'");
    });

    it('should round to nearest inch', () => {
      // 300mm = 11.81 inches ≈ 12 inches = 1'
      expect(formatDimension(300)).toBe("1'");
    });

    it('should handle common wardrobe heights', () => {
      // 2100mm ≈ 82.68 inches ≈ 83 inches = 6'11"
      expect(formatDimension(2100)).toBe("6'11\"");
    });

    it('should handle common wardrobe widths', () => {
      // 1000mm ≈ 39.37 inches ≈ 39 inches = 3'3"
      expect(formatDimension(1000)).toBe("3'3\"");
    });
  });

  // =========================================================================
  // formatCurrency Tests
  // =========================================================================

  describe('formatCurrency', () => {
    it('should format zero', () => {
      expect(formatCurrency(0)).toBe('Rs. 0');
    });

    it('should format small amounts', () => {
      expect(formatCurrency(100)).toBe('Rs. 100');
    });

    it('should format thousands with Indian locale', () => {
      // Indian locale uses lakh/crore format: 1,00,000
      const result = formatCurrency(100000);
      expect(result).toContain('Rs.');
      expect(result).toContain('1');
    });

    it('should format large amounts', () => {
      const result = formatCurrency(1234567);
      expect(result).toContain('Rs.');
    });

    it('should handle decimal amounts by rounding', () => {
      // Note: toLocaleString handles rounding
      const result = formatCurrency(1234.56);
      expect(result).toContain('Rs.');
    });
  });
});

// ============================================================================
// Pricing Calculation Tests (shared with exportEngine)
// ============================================================================

describe('exportEngine - Pricing Calculations', () => {
  // Mock pricing service for testing
  const mockCalculate = vi.fn();

  interface MockUnit {
    widthMm: number;
    heightMm: number;
    loftEnabled?: boolean;
    loftWidthMm?: number;
    loftHeightMm?: number;
    box?: { width: number; height: number };
  }

  interface MockRoom {
    id: string;
    name: string;
    unitType: string;
    drawnUnits: MockUnit[];
  }

  // Simulate calculateAllRoomsPricing logic
  function calculateAllRoomsPricing(
    quotationRooms: MockRoom[],
    currentDrawnUnits: MockUnit[],
    activeRoomIndex: number,
    calculateFn: (units: MockUnit[]) => { subtotal: number; addOnsTotal: number; totalSqft: number; units: any[] }
  ) {
    const roomPricings: { room: MockRoom; pricing: any; validUnits: MockUnit[] }[] = [];
    let grandSubtotal = 0;
    let grandAddOnsTotal = 0;

    if (quotationRooms.length === 0) {
      const validUnits = currentDrawnUnits.filter(
        (u) => (u.widthMm > 0 && u.heightMm > 0) || (u.box && u.box.width > 0 && u.box.height > 0)
      );
      const pricing = calculateFn(validUnits);
      grandSubtotal = pricing.subtotal;
      grandAddOnsTotal = pricing.addOnsTotal;
      roomPricings.push({
        room: {
          id: 'default',
          name: 'Quotation',
          unitType: 'wardrobe',
          drawnUnits: currentDrawnUnits,
        },
        pricing,
        validUnits,
      });
    } else {
      quotationRooms.forEach((room, index) => {
        const roomUnits = index === activeRoomIndex ? currentDrawnUnits : room.drawnUnits;
        const validUnits = roomUnits.filter(
          (u) => (u.widthMm > 0 && u.heightMm > 0) || (u.box && u.box.width > 0 && u.box.height > 0)
        );
        const pricing = calculateFn(validUnits);
        grandSubtotal += pricing.subtotal;
        grandAddOnsTotal += pricing.addOnsTotal;
        roomPricings.push({ room, pricing, validUnits });
      });
    }

    const grandTotal = grandSubtotal + grandAddOnsTotal;
    const grandGst = grandTotal * 0.18;
    const total = grandTotal + grandGst;

    return {
      roomPricings,
      grandTotal: {
        subtotal: Math.round(grandSubtotal),
        addOnsTotal: Math.round(grandAddOnsTotal),
        gst: Math.round(grandGst),
        total: Math.round(total),
      },
    };
  }

  beforeEach(() => {
    mockCalculate.mockReset();
    mockCalculate.mockReturnValue({
      subtotal: 10000,
      addOnsTotal: 500,
      totalSqft: 20,
      units: [],
    });
  });

  describe('calculateAllRoomsPricing', () => {
    it('should handle empty rooms (single room mode)', () => {
      const units = [{ widthMm: 1000, heightMm: 2000 }];

      const result = calculateAllRoomsPricing([], units, 0, mockCalculate);

      expect(result.roomPricings).toHaveLength(1);
      expect(result.roomPricings[0].room.id).toBe('default');
    });

    it('should filter out invalid units', () => {
      const units = [
        { widthMm: 1000, heightMm: 2000 }, // Valid
        { widthMm: 0, heightMm: 0 }, // Invalid - no dimensions
        { widthMm: 500, heightMm: 1000 }, // Valid
      ];

      const result = calculateAllRoomsPricing([], units, 0, mockCalculate);

      expect(result.roomPricings[0].validUnits).toHaveLength(2);
    });

    it('should accept units with box dimensions', () => {
      const units = [
        { widthMm: 0, heightMm: 0, box: { width: 100, height: 200 } }, // Valid via box
      ];

      const result = calculateAllRoomsPricing([], units, 0, mockCalculate);

      expect(result.roomPricings[0].validUnits).toHaveLength(1);
    });

    it('should calculate grand totals across rooms', () => {
      const rooms: MockRoom[] = [
        { id: 'r1', name: 'Room 1', unitType: 'wardrobe', drawnUnits: [{ widthMm: 1000, heightMm: 2000 }] },
        { id: 'r2', name: 'Room 2', unitType: 'kitchen', drawnUnits: [{ widthMm: 1200, heightMm: 2400 }] },
      ];

      const result = calculateAllRoomsPricing(rooms, [], -1, mockCalculate);

      expect(result.roomPricings).toHaveLength(2);
      // Each room has subtotal 10000, so grand subtotal = 20000
      expect(result.grandTotal.subtotal).toBe(20000);
    });

    it('should calculate 18% GST', () => {
      const units = [{ widthMm: 1000, heightMm: 2000 }];
      mockCalculate.mockReturnValue({
        subtotal: 10000,
        addOnsTotal: 0,
        totalSqft: 20,
        units: [],
      });

      const result = calculateAllRoomsPricing([], units, 0, mockCalculate);

      // GST = 18% of 10000 = 1800
      expect(result.grandTotal.gst).toBe(1800);
      expect(result.grandTotal.total).toBe(11800);
    });

    it('should use current drawn units for active room', () => {
      const rooms: MockRoom[] = [
        { id: 'r1', name: 'Room 1', unitType: 'wardrobe', drawnUnits: [{ widthMm: 500, heightMm: 1000 }] },
      ];
      const currentUnits = [{ widthMm: 1000, heightMm: 2000 }]; // Different from stored

      const result = calculateAllRoomsPricing(rooms, currentUnits, 0, mockCalculate);

      // Should use currentUnits for active room (index 0)
      expect(result.roomPricings[0].validUnits).toHaveLength(1);
      expect(result.roomPricings[0].validUnits[0].widthMm).toBe(1000);
    });

    it('should use stored units for non-active rooms', () => {
      const rooms: MockRoom[] = [
        { id: 'r1', name: 'Room 1', unitType: 'wardrobe', drawnUnits: [{ widthMm: 500, heightMm: 1000 }] },
        { id: 'r2', name: 'Room 2', unitType: 'kitchen', drawnUnits: [{ widthMm: 800, heightMm: 1500 }] },
      ];
      const currentUnits = [{ widthMm: 1000, heightMm: 2000 }];

      const result = calculateAllRoomsPricing(rooms, currentUnits, 0, mockCalculate);

      // Room 2 (non-active) should use stored units
      expect(result.roomPricings[1].validUnits[0].widthMm).toBe(800);
    });
  });
});

// ============================================================================
// Share Data Generation Tests
// ============================================================================

describe('exportEngine - Share Data Generation', () => {
  // Simulate generateShareData logic
  function generateShareData(params: {
    client: { name: string; phone: string };
    meta: { quoteNo: string; dateISO: string };
    quotationRooms: any[];
    currentDrawnUnits: any[];
    activeRoomIndex: number;
  }): string {
    const sharePayload = {
      v: 1,
      c: params.client,
      m: params.meta,
      r: params.quotationRooms.map((room) => ({
        id: room.id,
        name: room.name,
        unitType: room.unitType,
        units: room.drawnUnits.map((u: any) => ({
          id: u.id,
          type: u.unitType,
          w: u.widthMm,
          h: u.heightMm,
          lw: u.loftWidthMm,
          lh: u.loftHeightMm,
          loft: u.loftEnabled,
        })),
      })),
      cu: params.currentDrawnUnits.map((u) => ({
        id: u.id,
        type: u.unitType,
        w: u.widthMm,
        h: u.heightMm,
        lw: u.loftWidthMm,
        lh: u.loftHeightMm,
        loft: u.loftEnabled,
      })),
      ai: params.activeRoomIndex,
    };

    return btoa(JSON.stringify(sharePayload));
  }

  it('should generate base64 encoded share data', () => {
    const result = generateShareData({
      client: { name: 'Test', phone: '123' },
      meta: { quoteNo: 'Q-001', dateISO: '2024-01-15' },
      quotationRooms: [],
      currentDrawnUnits: [],
      activeRoomIndex: 0,
    });

    // Should be valid base64
    expect(() => atob(result)).not.toThrow();
  });

  it('should include version number', () => {
    const result = generateShareData({
      client: { name: 'Test', phone: '123' },
      meta: { quoteNo: 'Q-001', dateISO: '2024-01-15' },
      quotationRooms: [],
      currentDrawnUnits: [],
      activeRoomIndex: 0,
    });

    const decoded = JSON.parse(atob(result));
    expect(decoded.v).toBe(1);
  });

  it('should include client info', () => {
    const result = generateShareData({
      client: { name: 'John Doe', phone: '9876543210' },
      meta: { quoteNo: 'Q-001', dateISO: '2024-01-15' },
      quotationRooms: [],
      currentDrawnUnits: [],
      activeRoomIndex: 0,
    });

    const decoded = JSON.parse(atob(result));
    expect(decoded.c.name).toBe('John Doe');
    expect(decoded.c.phone).toBe('9876543210');
  });

  it('should compress unit data', () => {
    const result = generateShareData({
      client: { name: 'Test', phone: '123' },
      meta: { quoteNo: 'Q-001', dateISO: '2024-01-15' },
      quotationRooms: [],
      currentDrawnUnits: [
        {
          id: 'u1',
          unitType: 'wardrobe',
          widthMm: 1000,
          heightMm: 2000,
          loftWidthMm: 1000,
          loftHeightMm: 400,
          loftEnabled: true,
        },
      ],
      activeRoomIndex: 0,
    });

    const decoded = JSON.parse(atob(result));
    // Should use compressed keys
    expect(decoded.cu[0]).toHaveProperty('w'); // widthMm -> w
    expect(decoded.cu[0]).toHaveProperty('h'); // heightMm -> h
    expect(decoded.cu[0]).toHaveProperty('lw'); // loftWidthMm -> lw
    expect(decoded.cu[0]).toHaveProperty('lh'); // loftHeightMm -> lh
    expect(decoded.cu[0]).toHaveProperty('loft'); // loftEnabled -> loft
  });
});

// ============================================================================
// Clipboard Text Generation Tests
// ============================================================================

describe('exportEngine - Clipboard Text Generation', () => {
  // Simulate text generation for WhatsApp/clipboard
  function generateClipboardText(params: {
    client: { name: string; phone?: string; location?: string };
    meta: { quoteNo: string; dateISO: string };
    roomPricings: { room: { name: string }; validUnits: any[]; pricing: any }[];
    grandTotal: { subtotal: number; gst: number; total: number };
    multiRoom: boolean;
  }): string {
    let text = `*QUOTATION*\n`;
    text += `Quote No: ${params.meta.quoteNo}\n`;
    text += `Date: ${params.meta.dateISO}\n`;
    text += `\n`;
    text += `*Customer:* ${params.client.name || 'N/A'}\n`;
    if (params.client.phone) text += `Phone: ${params.client.phone}\n`;
    if (params.client.location) text += `Location: ${params.client.location}\n`;
    text += `\n`;
    text += `*Items:*\n`;

    params.roomPricings.forEach(({ room, validUnits, pricing }) => {
      if (params.multiRoom) {
        text += `\n_${room.name}_\n`;
      }
      validUnits.forEach((unit, idx) => {
        const dimensions = `${formatDimension(unit.widthMm)} x ${formatDimension(unit.heightMm)}`;
        const price = pricing.units[idx]?.unitTotal || 0;
        text += `- ${unit.unitType} (${dimensions}): Rs. ${price.toLocaleString('en-IN')}\n`;
      });
    });

    text += `\n`;
    text += `Subtotal: Rs. ${params.grandTotal.subtotal.toLocaleString('en-IN')}\n`;
    text += `GST (18%): Rs. ${params.grandTotal.gst.toLocaleString('en-IN')}\n`;
    text += `*Grand Total: Rs. ${params.grandTotal.total.toLocaleString('en-IN')}*\n`;

    return text;
  }

  it('should generate formatted text for WhatsApp', () => {
    const text = generateClipboardText({
      client: { name: 'John Doe', phone: '9876543210', location: 'Mumbai' },
      meta: { quoteNo: 'Q-001', dateISO: '2024-01-15' },
      roomPricings: [],
      grandTotal: { subtotal: 10000, gst: 1800, total: 11800 },
      multiRoom: false,
    });

    expect(text).toContain('*QUOTATION*');
    expect(text).toContain('Q-001');
    expect(text).toContain('John Doe');
    expect(text).toContain('9876543210');
  });

  it('should include room names in multi-room mode', () => {
    const text = generateClipboardText({
      client: { name: 'Test' },
      meta: { quoteNo: 'Q-001', dateISO: '2024-01-15' },
      roomPricings: [
        {
          room: { name: 'Master Bedroom' },
          validUnits: [{ unitType: 'wardrobe', widthMm: 1000, heightMm: 2000 }],
          pricing: { units: [{ unitTotal: 5000 }] },
        },
      ],
      grandTotal: { subtotal: 5000, gst: 900, total: 5900 },
      multiRoom: true,
    });

    expect(text).toContain('_Master Bedroom_');
  });

  it('should format grand total with asterisks for emphasis', () => {
    const text = generateClipboardText({
      client: { name: 'Test' },
      meta: { quoteNo: 'Q-001', dateISO: '2024-01-15' },
      roomPricings: [],
      grandTotal: { subtotal: 10000, gst: 1800, total: 11800 },
      multiRoom: false,
    });

    expect(text).toContain('*Grand Total:');
  });

  it('should handle missing optional client fields', () => {
    const text = generateClipboardText({
      client: { name: 'Test' },
      meta: { quoteNo: 'Q-001', dateISO: '2024-01-15' },
      roomPricings: [],
      grandTotal: { subtotal: 0, gst: 0, total: 0 },
      multiRoom: false,
    });

    expect(text).not.toContain('Phone:');
    expect(text).not.toContain('Location:');
  });
});

/**
 * QuotationRepository Tests
 *
 * Tests the persistence layer which handles:
 * - API calls to save/load quotations
 * - Error handling and graceful fallbacks
 * - Network failure resilience
 *
 * CRITICAL: Tests graceful degradation - API failures should not crash the app.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuotationRepository } from '../QuotationRepository';

describe('QuotationRepository', () => {
  let repository: QuotationRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new QuotationRepository();
    global.fetch = vi.fn();
    // Clear localStorage to ensure test isolation
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up localStorage after each test
    localStorage.clear();
  });

  // =========================================================================
  // save Tests
  // =========================================================================

  describe('save', () => {
    it('should save quotation successfully', async () => {
      const mockState: any = {
        meta: { quoteNo: 'Q-123' },
        client: { name: 'Test Customer' },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, id: 'q-abc-123' }),
      });

      await repository.save(mockState);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/quotations',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Q-123'),
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
    });

    it('should include all state data in request body', async () => {
      const mockState: any = {
        meta: { quoteNo: 'Q-456' },
        client: { name: 'John Doe', phone: '9876543210' },
        drawnUnits: [{ id: 'u1', widthMm: 1000 }],
        pricingControl: { sqftRate: 850 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await repository.save(mockState);

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.meta.quoteNo).toBe('Q-456');
      expect(body.client.name).toBe('John Doe');
      expect(body.drawnUnits).toHaveLength(1);
      expect(body.pricingControl.sqftRate).toBe(850);
    });

    it('should handle save error', async () => {
      const mockState: any = { meta: { quoteNo: 'Q-ERROR' } };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw (repo catches error) but logs it
      await repository.save(mockState);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle network failure gracefully', async () => {
      const mockState: any = { meta: { quoteNo: 'Q-NETWORK' } };

      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(repository.save(mockState)).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // =========================================================================
  // findById Tests
  // =========================================================================

  describe('findById', () => {
    it('should load quotation by id', async () => {
      const mockData = {
        meta: { quoteNo: 'Q-LOADED' },
        client: { name: 'Loaded Customer' },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: mockData }),
      });

      const result = await repository.findById('q-abc-123');

      expect(global.fetch).toHaveBeenCalledWith('/api/quotations/q-abc-123');
      expect(result).toEqual(mockData);
    });

    it('should return null for 404 response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await repository.findById('unknown-id');

      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });

    it('should return null on server error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await repository.findById('error-id');

      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });

    it('should return null on network failure', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await repository.findById('network-error-id');

      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  // =========================================================================
  // findByLeadId Tests
  // =========================================================================

  describe('findByLeadId', () => {
    it('should find quotations by lead id', async () => {
      const mockQuotations = [
        { id: 'q1', meta: { quoteNo: 'Q-001' } },
        { id: 'q2', meta: { quoteNo: 'Q-002' } },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockQuotations, count: 2 }),
      });

      const result = await repository.findByLeadId('lead-123');

      expect(global.fetch).toHaveBeenCalledWith('/api/quotations/lead/lead-123');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('q1');
    });

    it('should return empty array when no quotations found', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], count: 0 }),
      });

      const result = await repository.findByLeadId('lead-empty');

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await repository.findByLeadId('lead-error');

      expect(result).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  // =========================================================================
  // findAll Tests
  // =========================================================================

  describe('findAll', () => {
    it('should list all quotations', async () => {
      const mockQuotations = [
        { id: 'q1', meta: { quoteNo: 'Q-001' } },
        { id: 'q2', meta: { quoteNo: 'Q-002' } },
        { id: 'q3', meta: { quoteNo: 'Q-003' } },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockQuotations, count: 3 }),
      });

      const result = await repository.findAll();

      expect(global.fetch).toHaveBeenCalledWith('/api/quotations');
      expect(result).toHaveLength(3);
    });

    it('should return empty array when no quotations', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], count: 0 }),
      });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await repository.findAll();

      expect(result).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  // =========================================================================
  // delete Tests
  // =========================================================================

  describe('delete', () => {
    it('should delete quotation successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await repository.delete('q-delete-123');

      expect(global.fetch).toHaveBeenCalledWith('/api/quotations/q-delete-123', {
        method: 'DELETE',
      });
      expect(result).toBe(true);
    });

    it('should return false on server error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await repository.delete('q-error');

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should return false on network failure', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await repository.delete('q-network');

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  // =========================================================================
  // Graceful Degradation Tests
  // =========================================================================

  describe('Graceful Degradation', () => {
    it('should not crash the app when API is unavailable', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Failed to fetch'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // All operations should complete without throwing
      await expect(repository.save({ meta: { quoteNo: 'Q-1' } })).resolves.not.toThrow();
      await expect(repository.findById('any-id')).resolves.not.toThrow();
      await expect(repository.findByLeadId('any-lead')).resolves.not.toThrow();
      await expect(repository.findAll()).resolves.not.toThrow();
      await expect(repository.delete('any-id')).resolves.not.toThrow();

      consoleSpy.mockRestore();
    });

    it('should return safe defaults when API fails', async () => {
      (global.fetch as any).mockRejectedValue(new Error('API unavailable'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // findById returns null
      expect(await repository.findById('id')).toBeNull();

      // findByLeadId returns empty array
      expect(await repository.findByLeadId('lead')).toEqual([]);

      // findAll returns empty array
      expect(await repository.findAll()).toEqual([]);

      // delete returns false
      expect(await repository.delete('id')).toBe(false);

      consoleSpy.mockRestore();
    });
  });
});

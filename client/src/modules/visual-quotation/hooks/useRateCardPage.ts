/**
 * useRateCardPage Hook
 *
 * Page-level hook for Rate Card management.
 * Orchestrates service calls, local UI state, and provides
 * a clean interface for the page component.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRateCardStore, selectRateCards, selectDefaultCardId } from "../store/rateCardStore";
import {
  createRateCard,
  updateRateCard,
  deleteRateCard,
  duplicateRateCard,
  setDefaultRateCard,
  getFilteredRateCards,
  getRateCardPreview,
  exportRateCard,
  importRateCard,
} from "../services/rateCardService";
import type {
  RateCard,
  RateCardPreview,
  CreateRateCardParams,
  UpdateRateCardParams,
  RateCardFilterOptions,
  RateCardUnitType,
} from "../types/rateCard";
import type { ServiceResult } from "../services/types";

// ============================================================================
// Types
// ============================================================================

export interface RateCardPageState {
  // List state
  cards: RateCard[];
  filteredCards: RateCard[];
  defaultCardId: string | null;

  // Filter state
  searchQuery: string;
  filterUnitType: RateCardUnitType | null;
  sortBy: RateCardFilterOptions["sortBy"];
  sortOrder: RateCardFilterOptions["sortOrder"];

  // UI state
  selectedCardId: string | null;
  editingCardId: string | null;
  isCreating: boolean;
  isLoading: boolean;

  // Modal state
  showDeleteConfirm: boolean;
  deleteTargetId: string | null;
  showImportModal: boolean;
}

export interface RateCardPageActions {
  // Filter actions
  setSearchQuery: (query: string) => void;
  setFilterUnitType: (unitType: RateCardUnitType | null) => void;
  setSortBy: (sortBy: RateCardFilterOptions["sortBy"]) => void;
  setSortOrder: (order: RateCardFilterOptions["sortOrder"]) => void;
  clearFilters: () => void;

  // Selection actions
  selectCard: (id: string | null) => void;

  // CRUD actions
  startCreate: () => void;
  cancelCreate: () => void;
  saveNewCard: (params: CreateRateCardParams) => ServiceResult<RateCard>;
  startEdit: (id: string) => void;
  cancelEdit: () => void;
  saveEdit: (id: string, updates: UpdateRateCardParams) => ServiceResult<RateCard>;
  confirmDelete: (id: string) => void;
  cancelDelete: () => void;
  executeDelete: () => ServiceResult<void>;
  duplicate: (id: string) => ServiceResult<RateCard>;
  setAsDefault: (id: string) => ServiceResult<void>;

  // Import/Export actions
  openImportModal: () => void;
  closeImportModal: () => void;
  importCard: (json: string) => ServiceResult<RateCard>;
  exportCard: (id: string) => ServiceResult<string>;

  // Preview
  getPreview: (card: RateCard) => RateCardPreview;
}

export interface UseRateCardPageReturn extends RateCardPageState, RateCardPageActions {
  // Computed values
  selectedCard: RateCard | null;
  editingCard: RateCard | null;
  hasCards: boolean;
  cardCount: number;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useRateCardPage(): UseRateCardPageReturn {
  // Store subscriptions
  const cards = useRateCardStore(selectRateCards);
  const defaultCardId = useRateCardStore(selectDefaultCardId);
  const isLoaded = useRateCardStore((s) => s.isLoaded);
  const loadFromStorage = useRateCardStore((s) => s.loadFromStorage);

  // Local UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUnitType, setFilterUnitType] = useState<RateCardUnitType | null>(null);
  const [sortBy, setSortBy] = useState<RateCardFilterOptions["sortBy"]>("updatedAt");
  const [sortOrder, setSortOrder] = useState<RateCardFilterOptions["sortOrder"]>("desc");

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Ensure store is loaded
  useEffect(() => {
    if (!isLoaded) {
      loadFromStorage();
    }
  }, [isLoaded, loadFromStorage]);

  // ========================================================================
  // Computed Values
  // ========================================================================

  const filteredCards = useMemo(() => {
    return getFilteredRateCards({
      searchQuery,
      unitType: filterUnitType,
      sortBy,
      sortOrder,
    });
  }, [cards, searchQuery, filterUnitType, sortBy, sortOrder]);

  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    return cards.find((c) => c.id === selectedCardId) || null;
  }, [cards, selectedCardId]);

  const editingCard = useMemo(() => {
    if (!editingCardId) return null;
    return cards.find((c) => c.id === editingCardId) || null;
  }, [cards, editingCardId]);

  // ========================================================================
  // Filter Actions
  // ========================================================================

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setFilterUnitType(null);
    setSortBy("updatedAt");
    setSortOrder("desc");
  }, []);

  // ========================================================================
  // Selection Actions
  // ========================================================================

  const selectCard = useCallback((id: string | null) => {
    setSelectedCardId(id);
    // Clear editing state when selecting a different card
    if (id !== editingCardId) {
      setEditingCardId(null);
    }
  }, [editingCardId]);

  // ========================================================================
  // CRUD Actions
  // ========================================================================

  const startCreate = useCallback(() => {
    setIsCreating(true);
    setEditingCardId(null);
    setSelectedCardId(null);
  }, []);

  const cancelCreate = useCallback(() => {
    setIsCreating(false);
  }, []);

  const saveNewCard = useCallback((params: CreateRateCardParams): ServiceResult<RateCard> => {
    const result = createRateCard(params);
    if (result.success) {
      setIsCreating(false);
      setSelectedCardId(result.data!.id);
    }
    return result;
  }, []);

  const startEdit = useCallback((id: string) => {
    setEditingCardId(id);
    setSelectedCardId(id);
    setIsCreating(false);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingCardId(null);
  }, []);

  const saveEdit = useCallback((id: string, updates: UpdateRateCardParams): ServiceResult<RateCard> => {
    const result = updateRateCard(id, updates);
    if (result.success) {
      setEditingCardId(null);
    }
    return result;
  }, []);

  const confirmDelete = useCallback((id: string) => {
    setDeleteTargetId(id);
    setShowDeleteConfirm(true);
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteTargetId(null);
    setShowDeleteConfirm(false);
  }, []);

  const executeDelete = useCallback((): ServiceResult<void> => {
    if (!deleteTargetId) {
      return { success: false, error: "No card selected for deletion" };
    }

    const result = deleteRateCard(deleteTargetId);
    if (result.success) {
      // Clear selection if deleted card was selected
      if (selectedCardId === deleteTargetId) {
        setSelectedCardId(null);
      }
      if (editingCardId === deleteTargetId) {
        setEditingCardId(null);
      }
      setDeleteTargetId(null);
      setShowDeleteConfirm(false);
    }
    return result;
  }, [deleteTargetId, selectedCardId, editingCardId]);

  const duplicate = useCallback((id: string): ServiceResult<RateCard> => {
    const result = duplicateRateCard(id);
    if (result.success) {
      setSelectedCardId(result.data!.id);
    }
    return result;
  }, []);

  const setAsDefault = useCallback((id: string): ServiceResult<void> => {
    return setDefaultRateCard(id);
  }, []);

  // ========================================================================
  // Import/Export Actions
  // ========================================================================

  const openImportModal = useCallback(() => {
    setShowImportModal(true);
  }, []);

  const closeImportModal = useCallback(() => {
    setShowImportModal(false);
  }, []);

  const importCard = useCallback((json: string): ServiceResult<RateCard> => {
    const result = importRateCard(json);
    if (result.success) {
      setShowImportModal(false);
      setSelectedCardId(result.data!.id);
    }
    return result;
  }, []);

  const exportCard = useCallback((id: string): ServiceResult<string> => {
    return exportRateCard(id);
  }, []);

  // ========================================================================
  // Preview
  // ========================================================================

  const getPreview = useCallback((card: RateCard): RateCardPreview => {
    return getRateCardPreview(card);
  }, []);

  // ========================================================================
  // Return
  // ========================================================================

  return {
    // State
    cards,
    filteredCards,
    defaultCardId,
    searchQuery,
    filterUnitType,
    sortBy,
    sortOrder,
    selectedCardId,
    editingCardId,
    isCreating,
    isLoading: !isLoaded,
    showDeleteConfirm,
    deleteTargetId,
    showImportModal,

    // Computed
    selectedCard,
    editingCard,
    hasCards: cards.length > 0,
    cardCount: cards.length,

    // Filter actions
    setSearchQuery,
    setFilterUnitType,
    setSortBy,
    setSortOrder,
    clearFilters,

    // Selection actions
    selectCard,

    // CRUD actions
    startCreate,
    cancelCreate,
    saveNewCard,
    startEdit,
    cancelEdit,
    saveEdit,
    confirmDelete,
    cancelDelete,
    executeDelete,
    duplicate,
    setAsDefault,

    // Import/Export actions
    openImportModal,
    closeImportModal,
    importCard,
    exportCard,

    // Preview
    getPreview,
  };
}

export default useRateCardPage;

/**
 * RateCardPage
 *
 * Standalone CRM-style page for managing Rate Cards.
 * Provides full CRUD operations, search/filter, and import/export.
 */

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  Download,
  Layers,
  Star,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRateCardPage } from "../../hooks/useRateCardPage";
import {
  RateCardListItem,
  RateCardEditor,
  RateCardToolbar,
  RateCardDeleteConfirm,
  RateCardImportModal,
} from "../../components/rate-card";
import { exportAllRateCards } from "../../services/rateCardService";
import type { CreateRateCardParams, UpdateRateCardParams } from "../../types/rateCard";

const RateCardPage: React.FC = () => {
  const navigate = useNavigate();

  const {
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
    isLoading,
    showDeleteConfirm,
    deleteTargetId,
    showImportModal,

    // Computed
    selectedCard,
    editingCard,
    hasCards,
    cardCount,

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
  } = useRateCardPage();

  // Check if there are active filters
  const hasFilters = Boolean(searchQuery || filterUnitType);

  // Handle save from editor
  const handleSave = (params: CreateRateCardParams | UpdateRateCardParams) => {
    if (isCreating) {
      const result = saveNewCard(params as CreateRateCardParams);
      if (!result.success) {
        alert(result.error);
      }
    } else if (editingCardId) {
      const result = saveEdit(editingCardId, params as UpdateRateCardParams);
      if (!result.success) {
        alert(result.error);
      }
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    const result = executeDelete();
    if (!result.success) {
      alert(result.error);
    }
  };

  // Handle export all
  const handleExportAll = () => {
    const json = exportAllRateCards();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rate-cards-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle single card export
  const handleExportCard = (id: string) => {
    const result = exportCard(id);
    if (result.success && result.data) {
      const card = cards.find((c) => c.id === id);
      const blob = new Blob([result.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rate-card-${card?.name.toLowerCase().replace(/\s+/g, "-") || id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Get delete target card
  const deleteTargetCard = deleteTargetId
    ? cards.find((c) => c.id === deleteTargetId) || null
    : null;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="flex-shrink-0 h-14 bg-white border-b border-gray-300">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2 text-black"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-black">Rate Cards</h1>
                <p className="text-[10px] text-gray-500">
                  Manage pricing configurations
                </p>
              </div>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAll}
              disabled={!hasCards}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export All
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            Loading rate cards...
          </div>
        ) : (
          <div className="h-full flex">
            {/* Left Panel - List */}
            <div className="w-[400px] flex-shrink-0 border-r border-gray-300 bg-white flex flex-col">
              {/* Toolbar */}
              <div className="p-4 border-b border-gray-200">
                <RateCardToolbar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  filterUnitType={filterUnitType}
                  onFilterUnitTypeChange={setFilterUnitType}
                  sortBy={sortBy}
                  onSortByChange={setSortBy}
                  sortOrder={sortOrder}
                  onSortOrderChange={setSortOrder}
                  onClearFilters={clearFilters}
                  onCreateNew={startCreate}
                  onImport={openImportModal}
                  cardCount={filteredCards.length}
                  hasFilters={hasFilters}
                />
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredCards.length === 0 ? (
                  <div className="text-center py-12">
                    {hasFilters ? (
                      <>
                        <AlertCircle className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-500">No rate cards match your filters</p>
                        <button
                          onClick={clearFilters}
                          className="mt-2 text-sm text-blue-600 hover:underline"
                        >
                          Clear filters
                        </button>
                      </>
                    ) : (
                      <>
                        <Layers className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-500">No rate cards yet</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Create your first rate card to get started
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={startCreate}
                        >
                          Create Rate Card
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  filteredCards.map((card) => (
                    <RateCardListItem
                      key={card.id}
                      card={card}
                      preview={getPreview(card)}
                      isSelected={selectedCardId === card.id}
                      isDefault={card.id === defaultCardId}
                      onSelect={() => selectCard(card.id)}
                      onEdit={() => startEdit(card.id)}
                      onDuplicate={() => {
                        const result = duplicate(card.id);
                        if (!result.success) alert(result.error);
                      }}
                      onDelete={() => confirmDelete(card.id)}
                      onSetDefault={() => {
                        const result = setAsDefault(card.id);
                        if (!result.success) alert(result.error);
                      }}
                    />
                  ))
                )}
              </div>

              {/* Stats footer */}
              {hasCards && (
                <div className="p-3 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{cardCount} rate card{cardCount !== 1 ? "s" : ""}</span>
                    {defaultCardId && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        Default set
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel - Editor / Details */}
            <div className="flex-1 overflow-y-auto p-6">
              {isCreating || editingCardId ? (
                <RateCardEditor
                  card={editingCard}
                  isCreating={isCreating}
                  onSave={handleSave}
                  onCancel={isCreating ? cancelCreate : cancelEdit}
                />
              ) : selectedCard ? (
                <div className="max-w-2xl mx-auto">
                  {/* Card Details View */}
                  <RateCardEditor
                    card={selectedCard}
                    isCreating={false}
                    onSave={(params) => saveEdit(selectedCard.id, params as UpdateRateCardParams)}
                    onCancel={() => selectCard(null)}
                  />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <CreditCard className="h-16 w-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium">Select a rate card</p>
                  <p className="text-sm mt-1">
                    Choose a rate card from the list or create a new one
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <RateCardDeleteConfirm
        isOpen={showDeleteConfirm}
        card={deleteTargetCard}
        onConfirm={handleDeleteConfirm}
        onCancel={cancelDelete}
      />

      <RateCardImportModal
        isOpen={showImportModal}
        onImport={importCard}
        onClose={closeImportModal}
      />
    </div>
  );
};

export default RateCardPage;

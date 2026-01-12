import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Download,
  Upload,
  Clipboard,
  RotateCcw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Search,
  MoreHorizontal,
  ArrowUpDown,
  Eye,
  EyeOff,
  Columns,
  X,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PapaParseResult = {
  data: any[];
  errors: any[];
  meta: any;
};

type Column = {
  id: string;
  name: string;
  width?: number;
  type?: "text" | "number" | "select";
  options?: string[];
  hidden?: boolean;
};

type Row = {
  id: string;
  _selected?: boolean;
  [key: string]: string | boolean | undefined;
};

type CellPosition = {
  rowId: string;
  colId: string;
};

const LOCAL_KEY = "cutlist_spreadsheet_v1";
const COLUMNS_KEY = "cutlist_spreadsheet_columns_v1";

const defaultColumns: Column[] = [
  { id: "height", name: "H", width: 50, type: "number" },
  { id: "width", name: "W", width: 50, type: "number" },
  { id: "qty", name: "Q", width: 32, type: "number" },
  { id: "plywoodBrand", name: "Plywood", width: 70, type: "text" },
  { id: "frontLaminate", name: "Front", width: 80, type: "text" },
  { id: "innerLaminate", name: "Inner", width: 70, type: "text" },
  { id: "panelType", name: "Type", width: 55, type: "select", options: ["TOP", "BOTTOM", "LEFT", "RIGHT", "BACK", "SHELF", "SHUTTER", "DRAWER"] },
  { id: "roomName", name: "Room", width: 55, type: "text" },
  { id: "cabinetName", name: "Cabinet", width: 70, type: "text" },
];

const defaultRows = (): Row[] => [
  {
    id: "r1",
    height: "450",
    width: "564",
    qty: "1",
    plywoodBrand: "Plywood A",
    frontLaminate: "456SF Terra Wood",
    innerLaminate: "off white",
    panelType: "TOP",
    roomName: "Kitchen",
    cabinetName: "Main Cabinet",
  },
  {
    id: "r2",
    height: "450",
    width: "564",
    qty: "1",
    plywoodBrand: "Plywood A",
    frontLaminate: "456SF Terra Wood",
    innerLaminate: "off white",
    panelType: "BOTTOM",
    roomName: "Kitchen",
    cabinetName: "Main Cabinet",
  },
  {
    id: "r3",
    height: "800",
    width: "450",
    qty: "1",
    plywoodBrand: "Plywood A",
    frontLaminate: "456SF Terra Wood",
    innerLaminate: "off white",
    panelType: "RIGHT",
    roomName: "Kitchen",
    cabinetName: "Main Cabinet",
  },
];

type SpreadsheetProProps = {
  onAddToCabinet?: (rowData: Row) => void;
  onRowCountChange?: (count: number) => void;
};

export default function SpreadsheetPro({ onAddToCabinet, onRowCountChange }: SpreadsheetProProps) {
  const [columns, setColumns] = useState<Column[]>(() => {
    try {
      const raw = localStorage.getItem(COLUMNS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Column[];
        return parsed.map(col => {
          const defaultCol = defaultColumns.find(d => d.id === col.id);
          return { ...defaultCol, ...col };
        });
      }
    } catch (e) {
      /* ignore */
    }
    return defaultColumns;
  });

  const [rows, setRows] = useState<Row[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) return JSON.parse(raw) as Row[];
    } catch (e) {
      /* ignore */
    }
    return defaultRows();
  });

  const [activeCell, setActiveCell] = useState<CellPosition | null>(null);
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const [editValue, setEditValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [copiedRows, setCopiedRows] = useState<Row[]>([]);
  const [undoStack, setUndoStack] = useState<Row[][]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const tableRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist data
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
      onRowCountChange?.(rows.length);
    } catch (e) {
      /* ignore */
    }
  }, [rows, onRowCountChange]);

  useEffect(() => {
    try {
      localStorage.setItem(COLUMNS_KEY, JSON.stringify(columns));
    } catch (e) {
      /* ignore */
    }
  }, [columns]);

  // Focus input when editing
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Push to undo stack before changes
  const pushUndo = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-19), rows]);
  }, [rows]);

  // Undo action
  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const prev = undoStack[undoStack.length - 1];
      setUndoStack(stack => stack.slice(0, -1));
      setRows(prev);
    }
  }, [undoStack]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
          e.preventDefault();
          handleUndo();
          return;
        }
        if (e.key === "f") {
          e.preventDefault();
          setShowSearch(true);
          return;
        }
        if (e.key === "c" && selectedRows.size > 0) {
          e.preventDefault();
          const selected = rows.filter(r => selectedRows.has(r.id));
          setCopiedRows(selected);
          return;
        }
        if (e.key === "v" && copiedRows.length > 0) {
          e.preventDefault();
          pushUndo();
          const newRows = copiedRows.map((r, i) => ({
            ...r,
            id: `paste-${Date.now()}-${i}`,
            _selected: false,
          }));
          setRows(prev => [...prev, ...newRows]);
          return;
        }
      }

      if (!activeCell || editingCell) return;

      const rowIdx = rows.findIndex(r => r.id === activeCell.rowId);
      const colIdx = columns.findIndex(c => c.id === activeCell.colId && !c.hidden);
      const visibleCols = columns.filter(c => !c.hidden);

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          if (rowIdx > 0) {
            setActiveCell({ rowId: rows[rowIdx - 1].id, colId: activeCell.colId });
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (rowIdx < rows.length - 1) {
            setActiveCell({ rowId: rows[rowIdx + 1].id, colId: activeCell.colId });
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (colIdx > 0) {
            setActiveCell({ rowId: activeCell.rowId, colId: visibleCols[colIdx - 1].id });
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (colIdx < visibleCols.length - 1) {
            setActiveCell({ rowId: activeCell.rowId, colId: visibleCols[colIdx + 1].id });
          }
          break;
        case "Tab":
          e.preventDefault();
          if (e.shiftKey) {
            if (colIdx > 0) {
              setActiveCell({ rowId: activeCell.rowId, colId: visibleCols[colIdx - 1].id });
            } else if (rowIdx > 0) {
              setActiveCell({ rowId: rows[rowIdx - 1].id, colId: visibleCols[visibleCols.length - 1].id });
            }
          } else {
            if (colIdx < visibleCols.length - 1) {
              setActiveCell({ rowId: activeCell.rowId, colId: visibleCols[colIdx + 1].id });
            } else if (rowIdx < rows.length - 1) {
              setActiveCell({ rowId: rows[rowIdx + 1].id, colId: visibleCols[0].id });
            }
          }
          break;
        case "Enter":
          e.preventDefault();
          if (e.shiftKey) {
            if (rowIdx > 0) {
              setActiveCell({ rowId: rows[rowIdx - 1].id, colId: activeCell.colId });
            }
          } else {
            const row = rows.find(r => r.id === activeCell.rowId);
            if (row) {
              setEditValue(String(row[activeCell.colId] || ""));
              setEditingCell(activeCell);
            }
          }
          break;
        case "Delete":
        case "Backspace":
          if (!editingCell) {
            e.preventDefault();
            pushUndo();
            setRows(prev => prev.map(r =>
              r.id === activeCell.rowId ? { ...r, [activeCell.colId]: "" } : r
            ));
          }
          break;
        case "Escape":
          setActiveCell(null);
          setEditingCell(null);
          break;
        default:
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            setEditValue(e.key);
            setEditingCell(activeCell);
          }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCell, editingCell, rows, columns, selectedRows, copiedRows, pushUndo, handleUndo]);

  const handleCellClick = (rowId: string, colId: string, e: React.MouseEvent) => {
    if (e.shiftKey && activeCell) {
      const startRowIdx = rows.findIndex(r => r.id === activeCell.rowId);
      const endRowIdx = rows.findIndex(r => r.id === rowId);
      const [minIdx, maxIdx] = [Math.min(startRowIdx, endRowIdx), Math.max(startRowIdx, endRowIdx)];
      const newSelected = new Set(selectedRows);
      for (let i = minIdx; i <= maxIdx; i++) {
        newSelected.add(rows[i].id);
      }
      setSelectedRows(newSelected);
    } else if (e.ctrlKey || e.metaKey) {
      const newSelected = new Set(selectedRows);
      if (newSelected.has(rowId)) {
        newSelected.delete(rowId);
      } else {
        newSelected.add(rowId);
      }
      setSelectedRows(newSelected);
    } else {
      setSelectedRows(new Set());
    }
    setActiveCell({ rowId, colId });
    setEditingCell(null);
  };

  const handleCellDoubleClick = (rowId: string, colId: string) => {
    const row = rows.find(r => r.id === rowId);
    if (row) {
      setEditValue(String(row[colId] || ""));
      setEditingCell({ rowId, colId });
    }
  };

  const commitEdit = () => {
    if (editingCell) {
      pushUndo();
      setRows(prev => prev.map(r =>
        r.id === editingCell.rowId ? { ...r, [editingCell.colId]: editValue } : r
      ));

      const rowIdx = rows.findIndex(r => r.id === editingCell.rowId);
      const visibleCols = columns.filter(c => !c.hidden);
      const colIdx = visibleCols.findIndex(c => c.id === editingCell.colId);

      if (colIdx < visibleCols.length - 1) {
        setActiveCell({ rowId: editingCell.rowId, colId: visibleCols[colIdx + 1].id });
      } else if (rowIdx < rows.length - 1) {
        setActiveCell({ rowId: rows[rowIdx + 1].id, colId: visibleCols[0].id });
      }

      setEditingCell(null);
      setEditValue("");
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const addRow = () => {
    pushUndo();
    const id = `r${Date.now()}`;
    const newRow: Row = { id };
    columns.forEach(col => {
      newRow[col.id] = "";
    });
    setRows(prev => [...prev, newRow]);
    const visibleCols = columns.filter(c => !c.hidden);
    if (visibleCols.length > 0) {
      setActiveCell({ rowId: id, colId: visibleCols[0].id });
    }
  };

  const deleteSelectedRows = () => {
    if (selectedRows.size === 0 && activeCell) {
      pushUndo();
      setRows(prev => prev.filter(r => r.id !== activeCell.rowId));
      setActiveCell(null);
    } else if (selectedRows.size > 0) {
      pushUndo();
      setRows(prev => prev.filter(r => !selectedRows.has(r.id)));
      setSelectedRows(new Set());
      setActiveCell(null);
    }
  };

  const addColumn = () => {
    if (!newColName.trim()) return;
    const id = `col-${Date.now()}`;
    const newCol: Column = { id, name: newColName, width: 80, type: "text" };
    setColumns(prev => [...prev, newCol]);
    setRows(prev => prev.map(row => ({ ...row, [id]: "" })));
    setNewColName("");
    setShowAddColumn(false);
  };

  const removeColumn = (colId: string) => {
    if (columns.filter(c => !c.hidden).length <= 1) return;
    setColumns(prev => prev.filter(c => c.id !== colId));
    setRows(prev => prev.map(row => {
      const newRow = { ...row };
      delete newRow[colId];
      return newRow;
    }));
  };

  const toggleColumnVisibility = (colId: string) => {
    setColumns(prev => prev.map(c =>
      c.id === colId ? { ...c, hidden: !c.hidden } : c
    ));
  };

  const moveColumn = (colId: string, direction: "left" | "right") => {
    const idx = columns.findIndex(c => c.id === colId);
    if (idx === -1) return;
    const newIdx = direction === "left" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= columns.length) return;
    const newCols = [...columns];
    [newCols[idx], newCols[newIdx]] = [newCols[newIdx], newCols[idx]];
    setColumns(newCols);
  };

  const handleSort = (colId: string) => {
    if (sortColumn === colId) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(colId);
      setSortDirection("asc");
    }
  };

  const filteredRows = useMemo(() => {
    let result = [...rows];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(row =>
        columns.some(col => String(row[col.id] || "").toLowerCase().includes(query))
      );
    }

    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = String(a[sortColumn] || "");
        const bVal = String(b[sortColumn] || "");
        const col = columns.find(c => c.id === sortColumn);

        if (col?.type === "number") {
          const aNum = parseFloat(aVal) || 0;
          const bNum = parseFloat(bVal) || 0;
          return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
        }

        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      });
    }

    return result;
  }, [rows, searchQuery, sortColumn, sortDirection, columns]);

  const exportCSV = () => {
    const data = rows.map(r => {
      const row: any = {};
      columns.filter(c => !c.hidden).forEach(col => {
        row[col.name] = r[col.id] || "";
      });
      return row;
    });
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `cutlist_panels_${new Date().toISOString().split("T")[0]}.csv`);
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    pushUndo();
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res: PapaParseResult) => {
        const parsed = res.data as any[];
        if (parsed.length === 0) return;

        const headerNames = Object.keys(parsed[0]);
        const headerMapping: { [key: string]: string } = {
          "height": "height", "Height": "height", "HEIGHT": "height", "Height (mm)": "height",
          "width": "width", "Width": "width", "WIDTH": "width", "Width (mm)": "width",
          "qty": "qty", "Qty": "qty", "QTY": "qty", "quantity": "qty",
          "plywood brand": "plywoodBrand", "Plywood Brand": "plywoodBrand", "plywoodBrand": "plywoodBrand",
          "front laminate": "frontLaminate", "Front Laminate": "frontLaminate", "frontLaminate": "frontLaminate",
          "inner laminate": "innerLaminate", "Inner Laminate": "innerLaminate", "innerLaminate": "innerLaminate",
          "panel type": "panelType", "Panel Type": "panelType", "panelType": "panelType", "Type": "panelType",
          "room name": "roomName", "Room Name": "roomName", "roomName": "roomName", "Room": "roomName",
          "cabinet name": "cabinetName", "Cabinet Name": "cabinetName", "cabinetName": "cabinetName", "Name": "cabinetName",
        };

        const newCols: Column[] = [];
        const colIdMap: { [key: string]: string } = {};

        headerNames.forEach(originalHeader => {
          const standardId = headerMapping[originalHeader] || originalHeader;
          colIdMap[originalHeader] = standardId;
          if (!newCols.find(c => c.id === standardId)) {
            const defaultCol = defaultColumns.find(dc => dc.id === standardId);
            newCols.push({
              id: standardId,
              name: defaultCol?.name || originalHeader,
              width: defaultCol?.width || 80,
              type: defaultCol?.type || "text",
            });
          }
        });

        setColumns(newCols);
        const mapped: Row[] = parsed.map((r, i) => {
          const row: Row = { id: `imp-${Date.now()}-${i}` };
          headerNames.forEach(originalHeader => {
            const colId = colIdMap[originalHeader];
            row[colId] = r[originalHeader] ?? "";
          });
          return row;
        });
        setRows(mapped);
      },
    });
  };

  const pasteCSV = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      pushUndo();

      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
      }) as PapaParseResult;

      const data = parsed.data as any[];
      if (data.length === 0) return;

      const headerNames = Object.keys(data[0]);
      const headerMapping: { [key: string]: string } = {
        "height": "height", "Height": "height", "HEIGHT": "height", "Height (mm)": "height",
        "width": "width", "Width": "width", "WIDTH": "width", "Width (mm)": "width",
        "qty": "qty", "Qty": "qty", "QTY": "qty", "quantity": "qty",
        "plywood brand": "plywoodBrand", "Plywood Brand": "plywoodBrand", "plywoodBrand": "plywoodBrand",
        "front laminate": "frontLaminate", "Front Laminate": "frontLaminate", "frontLaminate": "frontLaminate",
        "inner laminate": "innerLaminate", "Inner Laminate": "innerLaminate", "innerLaminate": "innerLaminate",
        "panel type": "panelType", "Panel Type": "panelType", "panelType": "panelType", "Type": "panelType",
        "room name": "roomName", "Room Name": "roomName", "roomName": "roomName", "Room": "roomName",
        "cabinet name": "cabinetName", "Cabinet Name": "cabinetName", "cabinetName": "cabinetName", "Name": "cabinetName",
      };

      const newCols: Column[] = [];
      const colIdMap: { [key: string]: string } = {};

      headerNames.forEach(originalHeader => {
        const standardId = headerMapping[originalHeader] || originalHeader;
        colIdMap[originalHeader] = standardId;
        if (!newCols.find(c => c.id === standardId)) {
          const defaultCol = defaultColumns.find(dc => dc.id === standardId);
          newCols.push({
            id: standardId,
            name: defaultCol?.name || originalHeader,
            width: defaultCol?.width || 80,
            type: defaultCol?.type || "text",
          });
        }
      });

      setColumns(newCols);
      const mapped: Row[] = data.map((r, i) => {
        const row: Row = { id: `paste-${Date.now()}-${i}` };
        headerNames.forEach(originalHeader => {
          const colId = colIdMap[originalHeader];
          row[colId] = r[originalHeader] ?? "";
        });
        return row;
      });
      setRows(mapped);
    } catch (err) {
      console.error("Clipboard paste failed:", err);
    }
  };

  const resetSample = () => {
    if (confirm("Reset spreadsheet to sample data? This will clear all current data.")) {
      pushUndo();
      setColumns(defaultColumns);
      setRows(defaultRows());
      setSelectedRows(new Set());
      setActiveCell(null);
    }
  };

  const selectAll = () => {
    if (selectedRows.size === filteredRows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredRows.map(r => r.id)));
    }
  };

  const visibleColumns = columns.filter(c => !c.hidden);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Compact Toolbar */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-300 bg-gray-50">
        <div className="flex items-center gap-1">
          <button
            onClick={addRow}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 rounded"
            title="Add Row"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add</span>
          </button>

          <div className="w-px h-4 bg-gray-300 mx-1" />

          <button onClick={exportCSV} className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="Export CSV">
            <Download className="w-3.5 h-3.5" />
          </button>

          <label className="cursor-pointer">
            <button className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="Import CSV">
              <Upload className="w-3.5 h-3.5" />
            </button>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
          </label>

          <button onClick={pasteCSV} className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="Paste from clipboard">
            <Clipboard className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-gray-300 mx-1" />

          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="p-1.5 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={deleteSelectedRows}
            disabled={selectedRows.size === 0 && !activeCell}
            className="p-1.5 text-gray-600 hover:bg-red-100 hover:text-red-600 rounded disabled:opacity-30"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-gray-300 mx-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded">
                <Columns className="w-3.5 h-3.5" />
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 text-xs">
              {columns.map(col => (
                <DropdownMenuItem
                  key={col.id}
                  onClick={() => toggleColumnVisibility(col.id)}
                  className="justify-between text-xs py-1"
                >
                  <span>{col.name}</span>
                  {col.hidden ? <EyeOff className="w-3 h-3 text-gray-400" /> : <Eye className="w-3 h-3 text-green-600" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowAddColumn(true)} className="text-xs py-1">
                <Plus className="w-3 h-3 mr-1" />
                Add Column
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1">
          {showSearch ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-32 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="p-1 text-gray-500 hover:bg-gray-200 rounded">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowSearch(true)} className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="Search (Ctrl+F)">
              <Search className="w-3.5 h-3.5" />
            </button>
          )}

          <button onClick={resetSample} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded" title="Reset">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Add Column Modal */}
      {showAddColumn && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded shadow-lg p-4 w-64">
            <h3 className="text-sm font-medium mb-3">Add Column</h3>
            <input
              type="text"
              placeholder="Column name"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addColumn()}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button onClick={addColumn} className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700">
                Add
              </button>
              <button onClick={() => setShowAddColumn(false)} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel-style Table */}
      <div ref={tableRef} className="flex-1 overflow-auto">
        <table className="w-full border-collapse" style={{ fontSize: '12px' }}>
          {/* Header */}
          <thead className="sticky top-0 z-10">
            <tr>
              {/* Checkbox column */}
              <th className="w-7 bg-gray-100 border border-gray-300 p-0">
                <div className="flex items-center justify-center h-6">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === filteredRows.length && filteredRows.length > 0}
                    onChange={selectAll}
                    className="w-3 h-3"
                  />
                </div>
              </th>
              {/* Row number column */}
              <th className="w-8 bg-gray-100 border border-gray-300 text-center text-gray-600 font-normal p-0">
                <div className="h-6 flex items-center justify-center">#</div>
              </th>
              {/* Data columns */}
              {visibleColumns.map((col, idx) => (
                <th
                  key={col.id}
                  className="bg-gray-100 border border-gray-300 font-medium text-gray-700 p-0 text-left"
                  style={{ minWidth: col.width || 70 }}
                >
                  <div className="flex items-center justify-between h-6 px-1">
                    <button
                      onClick={() => handleSort(col.id)}
                      className="flex items-center gap-0.5 hover:text-blue-600 truncate"
                    >
                      <span className="truncate">{col.name}</span>
                      {sortColumn === col.id && (
                        <ArrowUpDown className={cn("w-3 h-3 flex-shrink-0", sortDirection === "desc" && "rotate-180")} />
                      )}
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-0.5 hover:bg-gray-200 rounded opacity-0 hover:opacity-100 focus:opacity-100">
                          <MoreHorizontal className="w-3 h-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        <DropdownMenuItem onClick={() => handleSort(col.id)} className="text-xs py-1">
                          <ArrowUpDown className="w-3 h-3 mr-1" />Sort
                        </DropdownMenuItem>
                        {idx > 0 && (
                          <DropdownMenuItem onClick={() => moveColumn(col.id, "left")} className="text-xs py-1">
                            <ChevronLeft className="w-3 h-3 mr-1" />Move Left
                          </DropdownMenuItem>
                        )}
                        {idx < visibleColumns.length - 1 && (
                          <DropdownMenuItem onClick={() => moveColumn(col.id, "right")} className="text-xs py-1">
                            <ChevronRight className="w-3 h-3 mr-1" />Move Right
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toggleColumnVisibility(col.id)} className="text-xs py-1">
                          <EyeOff className="w-3 h-3 mr-1" />Hide
                        </DropdownMenuItem>
                        {visibleColumns.length > 1 && (
                          <DropdownMenuItem onClick={() => removeColumn(col.id)} className="text-xs py-1 text-red-600">
                            <Trash2 className="w-3 h-3 mr-1" />Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {filteredRows.map((row, rowIdx) => (
              <tr
                key={row.id}
                className={cn(
                  selectedRows.has(row.id) && "bg-blue-50"
                )}
              >
                {/* Checkbox */}
                <td className="border border-gray-300 bg-gray-50 p-0">
                  <div className="flex items-center justify-center h-6">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row.id)}
                      onChange={() => {
                        const newSelected = new Set(selectedRows);
                        if (newSelected.has(row.id)) {
                          newSelected.delete(row.id);
                        } else {
                          newSelected.add(row.id);
                        }
                        setSelectedRows(newSelected);
                      }}
                      className="w-3 h-3"
                    />
                  </div>
                </td>
                {/* Row number */}
                <td className="border border-gray-300 bg-gray-50 text-center text-gray-500 p-0">
                  <div className="h-6 flex items-center justify-center">{rowIdx + 1}</div>
                </td>
                {/* Data cells */}
                {visibleColumns.map((col) => {
                  const isActive = activeCell?.rowId === row.id && activeCell?.colId === col.id;
                  const isEditing = editingCell?.rowId === row.id && editingCell?.colId === col.id;

                  return (
                    <td
                      key={`${row.id}-${col.id}`}
                      className={cn(
                        "border border-gray-300 p-0",
                        isActive && !isEditing && "outline outline-2 outline-blue-500 outline-offset-[-2px] bg-blue-50"
                      )}
                      onClick={(e) => handleCellClick(row.id, col.id, e)}
                      onDoubleClick={() => handleCellDoubleClick(row.id, col.id)}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          type={col.type === "number" ? "number" : "text"}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitEdit();
                            } else if (e.key === "Escape") {
                              cancelEdit();
                            } else if (e.key === "Tab") {
                              e.preventDefault();
                              commitEdit();
                            }
                          }}
                          className="w-full h-6 px-1 border-none outline-none bg-white text-xs"
                          style={{ minWidth: col.width || 70 }}
                        />
                      ) : (
                        <div
                          className={cn(
                            "h-6 px-1 flex items-center truncate",
                            col.type === "number" && "justify-end font-mono"
                          )}
                        >
                          {String(row[col.id] || "")}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Empty state */}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                  <p className="text-sm">No panels. Click "Add" to create one.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Compact Status Bar */}
      <div className="flex items-center justify-between px-2 py-1 border-t border-gray-300 bg-gray-50 text-xs text-gray-600">
        <div className="flex items-center gap-3">
          <span><strong>{filteredRows.length}</strong> rows</span>
          {selectedRows.size > 0 && <span className="text-blue-600"><strong>{selectedRows.size}</strong> selected</span>}
          {copiedRows.length > 0 && <span className="text-green-600"><strong>{copiedRows.length}</strong> copied</span>}
        </div>
        <div className="flex items-center gap-3">
          {undoStack.length > 0 && <span className="text-amber-600">{undoStack.length} undo</span>}
          <span className="text-gray-400">{visibleColumns.length}/{columns.length} cols</span>
        </div>
      </div>
    </div>
  );
}

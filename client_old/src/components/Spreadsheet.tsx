import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import { saveAs } from "file-saver";

type PapaParseResult = {
  data: any[];
  errors: any[];
  meta: any;
};

type Column = {
  id: string;
  name: string;
};

type Row = {
  id: string;
  [key: string]: string;
};

const LOCAL_KEY = "cutlist_spreadsheet_v1";
const COLUMNS_KEY = "cutlist_spreadsheet_columns_v1";

const defaultColumns: Column[] = [
  { id: "height", name: "Height (mm)" },
  { id: "width", name: "Width (mm)" },
  { id: "qty", name: "Qty" },
  { id: "plywoodBrand", name: "Plywood Brand" },
  { id: "frontLaminate", name: "Front Laminate" },
  { id: "innerLaminate", name: "Inner Laminate" },
  { id: "panelType", name: "Panel Type" },
  { id: "roomName", name: "Room Name" },
  { id: "cabinetName", name: "Cabinet Name" },
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

type SpreadsheetProps = {
  onAddToCabinet?: (rowData: Row) => void;
};

export default function Spreadsheet({ onAddToCabinet }: SpreadsheetProps) {
  const [columns, setColumns] = useState<Column[]>(() => {
    try {
      const raw = localStorage.getItem(COLUMNS_KEY);
      if (raw) return JSON.parse(raw) as Column[];
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

  const [newColName, setNewColName] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
    } catch (e) {
      /* ignore */
    }
  }, [rows]);

  useEffect(() => {
    try {
      localStorage.setItem(COLUMNS_KEY, JSON.stringify(columns));
    } catch (e) {
      /* ignore */
    }
  }, [columns]);

  const addColumn = () => {
    if (!newColName.trim()) {
      alert("Please enter a column name");
      return;
    }
    const id = `col-${Date.now()}`;
    const newCol: Column = { id, name: newColName };
    setColumns((prev) => [...prev, newCol]);
    setRows((prev) =>
      prev.map((row): Row => ({
        ...row,
        [id]: "",
      }))
    );
    setNewColName("");
  };

  const removeColumn = (colId: string) => {
    // Prevent deleting all columns
    if (columns.length <= 1) {
      alert("You must keep at least one column");
      return;
    }
    setColumns((prev) => prev.filter((c) => c.id !== colId));
    setRows((prev) =>
      prev.map((row) => {
        const newRow = { ...row };
        delete newRow[colId];
        return newRow;
      })
    );
  };

  const swapColumns = (colId: string, direction: "left" | "right") => {
    const idx = columns.findIndex((c) => c.id === colId);
    if (idx === -1) return;

    const newIdx = direction === "left" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= columns.length) return;

    const newCols = [...columns];
    [newCols[idx], newCols[newIdx]] = [newCols[newIdx], newCols[idx]];
    setColumns(newCols);
  };

  const handleCellChange = (rowId: string, colId: string, value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, [colId]: value } : row
      )
    );
  };

  const addRow = () => {
    const id = `r${Date.now()}`;
    const newRow: Row = { id };
    columns.forEach((col) => {
      newRow[col.id] = "";
    });
    setRows((prev) => [...prev, newRow]);
  };

  const deleteRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const exportCSV = () => {
    const data = rows.map((r) => {
      const row: any = {};
      columns.forEach((col) => {
        row[col.name] = r[col.id] || "";
      });
      return row;
    });
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "cutlist_export.csv");
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res: PapaParseResult) => {
        const parsed = res.data as any[];
        // Extract column names from first row
        if (parsed.length === 0) return;
        const headerNames = Object.keys(parsed[0]);

        // Map import headers to standard column IDs
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
          "laminate code": "frontLaminate", // Backward compatibility
        };

        const newCols: Column[] = [];
        const colIdMap: { [key: string]: string } = {}; // Maps original header to standardized ID

        headerNames.forEach((originalHeader) => {
          const standardId = headerMapping[originalHeader] || originalHeader;
          colIdMap[originalHeader] = standardId;

          // Only add column if not already added
          if (!newCols.find(c => c.id === standardId)) {
            const displayName = defaultColumns.find(dc => dc.id === standardId)?.name || originalHeader;
            newCols.push({ id: standardId, name: displayName });
          }
        });

        setColumns(newCols);

        // Map data to new column IDs
        const mapped: Row[] = parsed.map((r, i) => {
          const row: Row = { id: `imp-${Date.now()}-${i}` };
          headerNames.forEach((originalHeader) => {
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
      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
      }) as PapaParseResult;
      const data = parsed.data as any[];
      if (data.length === 0) return;

      const headerNames = Object.keys(data[0]);

      // Map import headers to standard column IDs
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
        "laminate code": "frontLaminate", // Backward compatibility
      };

      const newCols: Column[] = [];
      const colIdMap: { [key: string]: string } = {}; // Maps original header to standardized ID

      headerNames.forEach((originalHeader) => {
        const standardId = headerMapping[originalHeader] || originalHeader;
        colIdMap[originalHeader] = standardId;

        // Only add column if not already added
        if (!newCols.find(c => c.id === standardId)) {
          const displayName = defaultColumns.find(dc => dc.id === standardId)?.name || originalHeader;
          newCols.push({ id: standardId, name: displayName });
        }
      });

      setColumns(newCols);

      const mapped: Row[] = data.map((r, i) => {
        const row: Row = { id: `paste-${Date.now()}-${i}` };
        headerNames.forEach((originalHeader) => {
          const colId = colIdMap[originalHeader];
          row[colId] = r[originalHeader] ?? "";
        });
        return row;
      });
      setRows(mapped);
    } catch (err) {
      alert("Clipboard paste not available — try CSV file import instead.");
    }
  };

  return (
    <div style={{ padding: 12 }}>
      <div
        style={{
          marginBottom: 8,
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button onClick={addRow}>➕ Add row</button>
        <button onClick={() => setRows(defaultRows())}>Reset sample</button>
        <button onClick={exportCSV}>⬇ Export CSV</button>
        <label
          style={{
            display: "inline-block",
            padding: "6px 10px",
            border: "1px solid #ddd",
            cursor: "pointer",
            borderRadius: "4px",
          }}
        >
          ⬆ Import CSV
          <input
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={(e) =>
              handleFile(e.target.files ? e.target.files[0] : null)
            }
          />
        </label>
        <button onClick={pasteCSV}>📋 Paste CSV</button>
      </div>

      <div
        style={{
          marginBottom: 8,
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            type="text"
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") addColumn();
            }}
            placeholder="New column name"
            style={{
              padding: "6px 10px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "13px",
            }}
          />
          <button onClick={addColumn}>➕ Add column</button>
        </div>
      </div>

      <div
        style={{
          overflowX: "auto",
          border: "1px solid #ddd",
          borderRadius: "4px",
          marginBottom: 12,
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5" }}>
              <th
                style={{
                  padding: "8px",
                  textAlign: "left",
                  borderBottom: "1px solid #ddd",
                  width: "60px",
                }}
              ></th>
              {columns.map((col, idx) => (
                <th
                  key={col.id}
                  style={{
                    padding: "8px",
                    textAlign: "left",
                    borderBottom: "1px solid #ddd",
                    minWidth: "120px",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "2px",
                    }}
                  >
                    <span>{col.name}</span>
                    <div style={{ display: "flex", gap: "2px" }}>
                      {idx > 0 && (
                        <button
                          onClick={() => swapColumns(col.id, "left")}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#0066cc",
                            fontSize: "12px",
                            padding: "0 2px",
                          }}
                          title="Move column left"
                        >
                          ←
                        </button>
                      )}
                      {idx < columns.length - 1 && (
                        <button
                          onClick={() => swapColumns(col.id, "right")}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#0066cc",
                            fontSize: "12px",
                            padding: "0 2px",
                          }}
                          title="Move column right"
                        >
                          →
                        </button>
                      )}
                      {columns.length > 1 && (
                        <button
                          onClick={() => removeColumn(col.id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#d32f2f",
                            fontSize: "12px",
                            padding: "0 2px",
                          }}
                          title="Delete column"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.id}
                style={{
                  backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fafafa",
                }}
              >
                <td
                  style={{
                    padding: "4px",
                    borderBottom: "1px solid #eee",
                    textAlign: "center",
                    display: "flex",
                    gap: "4px",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {onAddToCabinet && (
                    <button
                      onClick={() => onAddToCabinet(row)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#008000",
                        fontSize: "14px",
                        padding: "0 2px",
                      }}
                      title="Add to Cabinet"
                    >
                      ➕
                    </button>
                  )}
                  <button
                    onClick={() => deleteRow(row.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#d32f2f",
                      fontSize: "14px",
                      padding: "0 2px",
                    }}
                    title="Delete row"
                  >
                    ✕
                  </button>
                </td>
                {columns.map((col) => (
                  <td
                    key={`${row.id}-${col.id}`}
                    style={{ padding: "4px", borderBottom: "1px solid #eee" }}
                  >
                    <input
                      type="text"
                      value={row[col.id] || ""}
                      onChange={(e) =>
                        handleCellChange(row.id, col.id, e.target.value)
                      }
                      style={{
                        width: "100%",
                        border: "1px solid #ccc",
                        padding: "4px",
                        borderRadius: "2px",
                        fontFamily: "monospace",
                      }}
                      placeholder={col.name}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => {
            console.log("Spreadsheet rows:", rows);
            console.log("Columns:", columns);
            alert("Saved to localStorage (auto). Check console for JSON.");
          }}
        >
          💾 Save (force)
        </button>
      </div>

      <div style={{ color: "#666", fontSize: "12px" }}>
        <p>
          <strong>Columns ({columns.length}):</strong>{" "}
          {columns.map((c) => c.name).join(", ")}
        </p>
        <p>
          Data auto-saves to localStorage (<code>{LOCAL_KEY}</code>)
        </p>
      </div>
    </div>
  );
}

import React, { ChangeEvent, useRef, useState } from "react";
import { UnitType, useVisualQuotationStore } from "../../store/visualQuotationStore";

/**
 * RoomInputPanel
 * ----------------
 * Handles:
 * - Photo upload / capture
 * - Manual room dimensions
 * - Input mode switching
 *
 * This is SAFE, SIMPLE, and production-ready.
 */

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

const RoomInputPanel: React.FC = () => {
  const {
    room,
    roomPhoto,
    wardrobeBox,
    shutterCount,
    loftEnabled,
    scale,
    roomType,
    unitType,
    setRoomInputType,
    setRoomPhoto,
    clearRoomPhoto,
    clearWardrobeBox,
    setDrawMode,
    setShutterCount,
    setLoftEnabled,
    wardrobeSpec,
    setDepthMm,
    computeAreas,
    setRoomType,
    setUnitType,
    setManualRoom,
    status,
  } = useVisualQuotationStore();

  const locked = status === "APPROVED";
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const unitLabel =
    unitType === "tv_unit"
      ? "TV Unit"
      : unitType === "wardrobe"
      ? "Wardrobe"
      : unitType === "kitchen"
      ? "Kitchen"
      : unitType === "dresser"
      ? "Dresser"
      : "Unit";

  const handleFileSelection = (e: ChangeEvent<HTMLInputElement>) => {
    if (locked) return;
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image size must be under 10MB.");
      return;
    }

    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setRoomPhoto(reader.result as string, img.naturalWidth, img.naturalHeight);
      };
      img.onerror = () => setError("Could not load the selected image.");
      img.src = reader.result as string;
    };
    reader.onerror = () => setError("Could not read the selected file.");
    reader.readAsDataURL(file);
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>Room</h3>

      {/* Mode Selection */}
      <div style={styles.row}>
        <button
          style={room.inputType === "PHOTO" ? styles.activeBtn : styles.btn}
          onClick={() => setRoomInputType("PHOTO")}
          disabled={locked}
        >
          Photo
        </button>
        <button
          style={room.inputType === "MANUAL" ? styles.activeBtn : styles.btn}
          onClick={() => setRoomInputType("MANUAL")}
          disabled={locked}
        >
          Manual
        </button>
      </div>

      {/* PHOTO MODE */}
      {room.inputType === "PHOTO" && (
        <div style={styles.section}>
          <div style={styles.layoutCard}>
            <h4 style={styles.subtitle}>Unit Type</h4>
            <select
              value={unitType}
              onChange={(e) => setUnitType(e.target.value as UnitType)}
              disabled={locked}
              style={styles.select}
            >
              <option value="wardrobe">Wardrobe</option>
              <option value="kitchen">Kitchen</option>
              <option value="tv_unit">TV Unit</option>
              <option value="dresser">Dresser</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div style={styles.layoutCard}>
            <h4 style={styles.subtitle}>Room Type</h4>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              disabled={locked}
              style={styles.select}
            >
              <option>Bedroom – Wardrobe</option>
              <option>Kitchen</option>
              <option>Living Room</option>
              <option>Office</option>
              <option>Other</option>
            </select>
          </div>

          <h4 style={styles.subtitle}>Room Photo</h4>

          <div style={styles.row}>
            <button
              type="button"
              style={styles.btn}
              onClick={() => uploadInputRef.current?.click()}
              disabled={locked}
            >
              Upload Photo
            </button>
            <button
              type="button"
              style={styles.btn}
              onClick={() => cameraInputRef.current?.click()}
              disabled={locked}
            >
              Use Camera
            </button>
            <button
              type="button"
              style={styles.outlineBtn}
              onClick={() => {
                clearRoomPhoto();
                setError(null);
              }}
              disabled={locked || !roomPhoto}
            >
              Remove Photo
            </button>
          </div>

          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            style={styles.hiddenInput}
            onChange={handleFileSelection}
            disabled={locked}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={styles.hiddenInput}
            onChange={handleFileSelection}
            disabled={locked}
          />

          {error && <p style={styles.error}>{error}</p>}

          {roomPhoto && (
            <p style={styles.info}>
              Photo loaded: {roomPhoto.width} px A- {roomPhoto.height} px
            </p>
          )}
          {roomPhoto && unitType === "wardrobe" && (
            <p style={styles.info}>Set wardrobe boundary. Layout will be generated by rules.</p>
          )}

          <div style={styles.row}>
            <button
              type="button"
              style={styles.primaryBtn}
              onClick={() => setDrawMode(true)}
              disabled={locked || !roomPhoto || Boolean(wardrobeBox)}
            >
              Draw {unitLabel} Area
            </button>
            {wardrobeBox && (
              <button
                type="button"
                style={styles.outlineBtn}
                onClick={() => clearWardrobeBox()}
                disabled={locked}
              >
                Remove {unitLabel} Area
              </button>
            )}
          </div>

          {unitType === "wardrobe" && (
            <div style={styles.row}>
              <span style={styles.inlineLabel}>Shutters:</span>
              {[2, 3, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  style={shutterCount === count ? styles.activeBtn : styles.btn}
                  onClick={() => setShutterCount(count)}
                  disabled={locked || !wardrobeBox}
                >
                  {count}
                </button>
              ))}
            </div>
          )}

          {unitType === "wardrobe" && (
            <div style={styles.row}>
              <span style={styles.inlineLabel}>Loft:</span>
              <button
                type="button"
                style={loftEnabled ? styles.activeBtn : styles.btn}
                onClick={() => setLoftEnabled(true)}
                disabled={locked || !wardrobeBox}
              >
                ON
              </button>
              <button
                type="button"
                style={!loftEnabled ? styles.activeBtn : styles.btn}
                onClick={() => setLoftEnabled(false)}
                disabled={locked || !wardrobeBox}
              >
                OFF
              </button>
            </div>
          )}

          {wardrobeBox && scale && unitType === "wardrobe" && (
            <div style={styles.layoutCard}>
              <h4 style={styles.subtitle}>Wardrobe Specification</h4>
              <label style={styles.label}>
                Depth (mm)
                <input
                  type="number"
                  min={300}
                  max={900}
                  defaultValue={wardrobeSpec?.depthMm ?? 600}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setDepthMm(val);
                    computeAreas();
                  }}
                  disabled={locked}
                  style={styles.input}
                  data-testid="input-wardrobe-depth"
                />
              </label>
              {wardrobeSpec && (
                <p style={styles.info}>
                  Carcass: {wardrobeSpec.carcassAreaSqft} sqft A- Shutter: {wardrobeSpec.shutterAreaSqft} sqft
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* MANUAL MODE */}
      {room.inputType === "MANUAL" && (
        <div style={styles.section}>
          <label>
            Length (mm):
            <input
              type="number"
              disabled={locked}
              onChange={(e) =>
                setManualRoom({
                  lengthMm: Number(e.target.value),
                  widthMm: room.manualRoom?.widthMm || 0,
                  heightMm: room.manualRoom?.heightMm || 0,
                })
              }
            />
          </label>

          <label>
            Width (mm):
            <input
              type="number"
              disabled={locked}
              onChange={(e) =>
                setManualRoom({
                  lengthMm: room.manualRoom?.lengthMm || 0,
                  widthMm: Number(e.target.value),
                  heightMm: room.manualRoom?.heightMm || 0,
                })
              }
            />
          </label>

          <label>
            Height (mm):
            <input
              type="number"
              disabled={locked}
              onChange={(e) =>
                setManualRoom({
                  lengthMm: room.manualRoom?.lengthMm || 0,
                  widthMm: room.manualRoom?.widthMm || 0,
                  heightMm: Number(e.target.value),
                })
              }
            />
          </label>
        </div>
      )}

      {locked && (
        <p style={styles.hint}>Approved quotes cannot be edited. Duplicate to make changes.</p>
      )}
    </div>
  );
};

export default RoomInputPanel;

/* ---------------- Styles ---------------- */

const styles: { [k: string]: React.CSSProperties } = {
  card: {
    background: "#fff",
    padding: 16,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
  },
  title: {
    margin: 0,
    marginBottom: 12,
    fontSize: 16,
    fontWeight: 600,
  },
  subtitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
  },
  row: {
    display: "flex",
    gap: 8,
    marginBottom: 12,
  },
  btn: {
    padding: "6px 12px",
    border: "1px solid #d1d5db",
    background: "#f9fafb",
    cursor: "pointer",
  },
  activeBtn: {
    padding: "6px 12px",
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
  },
  outlineBtn: {
    padding: "6px 12px",
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    cursor: "pointer",
  },
  primaryBtn: {
    padding: "6px 12px",
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  info: {
    fontSize: 12,
    color: "#374151",
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: "#6b7280",
  },
  hiddenInput: {
    display: "none",
  },
  error: {
    color: "#b91c1c",
    fontSize: 12,
    margin: 0,
  },
  layoutCard: {
    marginTop: 8,
    padding: 8,
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    background: "#f9fafb",
  },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700, color: "#374151" },
  inlineLabel: { fontSize: 12, fontWeight: 600, color: "#374151", alignSelf: "center" },
  input: { padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db" },
  banner: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  bannerSub: { fontSize: 12, color: "#1e3a8a" },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontSize: 14,
  },
};

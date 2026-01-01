/**
 * Simple DXF Parser for AutoCAD Files
 * Converts DXF LINE and LWPOLYLINE entities to our shape format
 */

export interface DXFLine {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
}

export interface ParsedDXFData {
  lines: DXFLine[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export function parseDXF(fileContent: string): ParsedDXFData {
  const lines: DXFLine[] = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  // Split into sections
  const sections = fileContent.split(/SECTION|ENDSEC/).filter(s => s.trim());
  const entitiesSection = sections.find(s => s.includes('ENTITIES'));

  if (!entitiesSection) {
    return { lines, bounds: { minX: 0, minY: 0, maxX: 1000, maxY: 1000 } };
  }

  // Parse ENTITIES section
  const entities = entitiesSection.split(/^\s*0\s*$/m).filter(e => e.trim());

  for (const entity of entities) {
    const lines_raw = entity.split('\n').map(l => l.trim()).filter(l => l);

    // Parse LINE entity
    if (entity.includes('LINE')) {
      let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
      for (let i = 0; i < lines_raw.length; i++) {
        if (lines_raw[i] === '10') x1 = parseFloat(lines_raw[i + 1] || '0');
        if (lines_raw[i] === '20') y1 = parseFloat(lines_raw[i + 1] || '0');
        if (lines_raw[i] === '11') x2 = parseFloat(lines_raw[i + 1] || '0');
        if (lines_raw[i] === '21') y2 = parseFloat(lines_raw[i + 1] || '0');
      }
      
      const line: DXFLine = { type: 'line', x1, y1, x2, y2, color: '#000000' };
      lines.push(line);

      minX = Math.min(minX, x1, x2);
      minY = Math.min(minY, y1, y2);
      maxX = Math.max(maxX, x1, x2);
      maxY = Math.max(maxY, y1, y2);
    }

    // Parse LWPOLYLINE (lightweight polyline) as series of lines
    if (entity.includes('LWPOLYLINE')) {
      const coords: [number, number][] = [];
      for (let i = 0; i < lines_raw.length; i++) {
        if (lines_raw[i] === '10') {
          const x = parseFloat(lines_raw[i + 1] || '0');
          const y = parseFloat(lines_raw[i + 2] || '0');
          coords.push([x, y]);
        }
      }

      // Create lines between consecutive points
      for (let i = 0; i < coords.length - 1; i++) {
        const [x1, y1] = coords[i];
        const [x2, y2] = coords[i + 1];
        lines.push({ type: 'line', x1, y1, x2, y2, color: '#000000' });

        minX = Math.min(minX, x1, x2);
        minY = Math.min(minY, y1, y2);
        maxX = Math.max(maxX, x1, x2);
        maxY = Math.max(maxY, y1, y2);
      }
    }
  }

  // Normalize bounds if no entities found
  if (minX === Infinity) {
    minX = 0;
    minY = 0;
    maxX = 1000;
    maxY = 1000;
  }

  return {
    lines,
    bounds: { minX, minY, maxX, maxY },
  };
}

export function composeLaminateCode(front: any, inner: any): string {
  const f = (front || "").trim();
  const i = (inner || "").trim();

  const hasFront = !!f;
  const hasInner = !!i;

  // Both present
  if (hasFront && hasInner) {
    if (/^backer$/i.test(f)) {
      return `Backer + ${i}`;
    }
    return `${f} + ${i}`;
  }

  // Only front
  if (hasFront && !hasInner) return f;

  // Only inner → treat as backer + inner
  if (!hasFront && hasInner) return `Backer + ${i}`;

  return "";
}

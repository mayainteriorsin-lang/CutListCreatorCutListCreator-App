/**
 * PATCH 39: Safe Toast Error Helper
 *
 * Prevents toast spam by deduping identical errors within 3 seconds.
 */

import { toast } from "@/hooks/use-toast";
import { normalizeError } from "./normalizeError";

let lastToast = "";
let lastTime = 0;

export function toastError(err: unknown) {
  const { title, description } = normalizeError(err);

  const now = Date.now();
  const key = `${title}:${description}`;

  // Prevent same error spam within 3 seconds
  if (key === lastToast && now - lastTime < 3000) return;

  lastToast = key;
  lastTime = now;

  toast({
    variant: "destructive",
    title,
    description,
  });
}

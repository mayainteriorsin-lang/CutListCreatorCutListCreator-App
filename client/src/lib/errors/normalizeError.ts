/**
 * PATCH 39: Error Normalizer
 *
 * Converts any error type into a consistent format for display.
 */

export type NormalizedError = {
  title: string;
  description: string;
  code?: string;
};

export function normalizeError(err: unknown): NormalizedError {
  if (!err) {
    return {
      title: "Unknown error",
      description: "Something went wrong.",
    };
  }

  if (typeof err === "string") {
    return {
      title: "Error",
      description: err,
    };
  }

  if (err instanceof Error) {
    return {
      title: "Error",
      description: err.message || "Unexpected error occurred.",
    };
  }

  if (typeof err === "object" && "error" in err) {
    return {
      title: "Error",
      description: String((err as any).error),
    };
  }

  return {
    title: "Error",
    description: "Unexpected error occurred.",
  };
}

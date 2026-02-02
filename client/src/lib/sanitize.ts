import DOMPurify from "dompurify";

/**
 * Sanitizes user input to prevent XSS attacks
 * Removes all HTML tags and scripts
 */
export function sanitizeInput(input: string): string {
    if (!input) return "";
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}

/**
 * Sanitizes HTML content while preserving safe formatting tags
 * Allows: bold, italic, emphasis, strong, links
 */
export function sanitizeHTML(html: string): string {
    if (!html) return "";
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "br", "p"],
        ALLOWED_ATTR: ["href", "target", "rel"],
    });
}

/**
 * Validates and sanitizes a URL
 * Returns "about:blank" for dangerous protocols
 * Allows relative URLs and safe absolute URLs
 */
export function sanitizeURL(url: string): string {
    if (!url) return "";

    const trimmed = url.trim();

    // Allow relative URLs
    if (trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../")) {
        return DOMPurify.sanitize(trimmed);
    }

    // Check for dangerous protocols
    const lowerUrl = trimmed.toLowerCase();
    if (lowerUrl.startsWith("javascript:") || lowerUrl.startsWith("data:") || lowerUrl.startsWith("vbscript:")) {
        return "about:blank";
    }

    // Try to parse as absolute URL
    try {
        const parsed = new URL(trimmed);
        // Only allow http and https protocols
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return "about:blank";
        }
        return DOMPurify.sanitize(trimmed);
    } catch {
        // If it's not a valid URL and not relative, return sanitized version
        return DOMPurify.sanitize(trimmed);
    }
}

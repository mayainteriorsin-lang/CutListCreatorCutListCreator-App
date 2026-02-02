import { sanitizeInput, sanitizeHTML, sanitizeURL } from "@/lib/sanitize";

describe("Sanitization Utils", () => {
    describe("sanitizeInput", () => {
        it("should strip all HTML tags", () => {
            expect(sanitizeInput("<script>alert('xss')</script>")).toBe("");
            expect(sanitizeInput("<b>Bold</b> text")).toBe("Bold text");
            expect(sanitizeInput("<div>Test</div>")).toBe("Test");
        });

        it("should preserve plain text", () => {
            expect(sanitizeInput("Plain text")).toBe("Plain text");
            expect(sanitizeInput("Text with symbols: !@#$%")).toBe("Text with symbols: !@#$%");
        });

        it("should handle empty strings", () => {
            expect(sanitizeInput("")).toBe("");
        });

        it("should handle special characters", () => {
            expect(sanitizeInput("Test & test")).toBe("Test & test");
            expect(sanitizeInput("Price: $100")).toBe("Price: $100");
        });

        it("should remove XSS attempts", () => {
            expect(sanitizeInput("<img src=x onerror=alert(1)>")).not.toContain("onerror");
            // javascript: in plain text is not dangerous - only when used in URLs
            expect(sanitizeInput("<a href='javascript:alert(1)'>click</a>")).not.toContain("javascript:");
        });
    });

    describe("sanitizeHTML", () => {
        it("should allow safe formatting tags", () => {
            expect(sanitizeHTML("<b>Bold</b>")).toContain("<b>Bold</b>");
            expect(sanitizeHTML("<i>Italic</i>")).toContain("<i>Italic</i>");
            expect(sanitizeHTML("<strong>Strong</strong>")).toContain("<strong>Strong</strong>");
            expect(sanitizeHTML("<em>Emphasis</em>")).toContain("<em>Emphasis</em>");
        });

        it("should allow safe links", () => {
            const result = sanitizeHTML('<a href="https://example.com">Link</a>');
            expect(result).toContain("href");
            expect(result).toContain("example.com");
        });

        it("should strip dangerous tags", () => {
            expect(sanitizeHTML("<script>alert('xss')</script>")).not.toContain("script");
            expect(sanitizeHTML("<iframe></iframe>")).not.toContain("iframe");
        });

        it("should strip event handlers", () => {
            const result = sanitizeHTML('<div onclick="alert(1)">Click</div>');
            expect(result).not.toContain("onclick");
        });

        it("should handle empty strings", () => {
            expect(sanitizeHTML("")).toBe("");
        });
    });

    describe("sanitizeURL", () => {
        it("should allow safe URLs", () => {
            expect(sanitizeURL("https://example.com")).toBe("https://example.com");
            expect(sanitizeURL("http://example.com")).toBe("http://example.com");
            expect(sanitizeURL("https://example.com/path?query=1")).toBe("https://example.com/path?query=1");
        });

        it("should block javascript URLs", () => {
            expect(sanitizeURL("javascript:alert(1)")).toBe("about:blank");
            expect(sanitizeURL("javascript:void(0)")).toBe("about:blank");
        });

        it("should block data URLs", () => {
            expect(sanitizeURL("data:text/html,<script>alert(1)</script>")).toBe("about:blank");
        });

        it("should handle empty strings", () => {
            expect(sanitizeURL("")).toBe("");
        });

        it("should handle relative URLs", () => {
            expect(sanitizeURL("/relative/path")).toBe("/relative/path");
            expect(sanitizeURL("./relative/path")).toBe("./relative/path");
        });

        it("should preserve query parameters", () => {
            const url = "https://example.com?param1=value1&param2=value2";
            expect(sanitizeURL(url)).toBe(url);
        });
    });
});

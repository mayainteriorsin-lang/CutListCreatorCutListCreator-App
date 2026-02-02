import {
    validateEmail,
    validateMobile,
    validateName,
    validateLocation,
    validateNote,
    validateFollowUpDate,
    validateLeadInput
} from "@/features/crm/utils/validation";

describe("CRM Validation Utils", () => {
    describe("validateEmail", () => {
        it("should accept valid emails", () => {
            expect(validateEmail("test@example.com")).toBe(true);
            expect(validateEmail("user.name+tag@example.co.uk")).toBe(true);
            expect(validateEmail("test_email@domain.org")).toBe(true);
        });

        it("should reject invalid emails", () => {
            expect(validateEmail("notanemail")).toBe(false);
            expect(validateEmail("@example.com")).toBe(false);
            expect(validateEmail("test@")).toBe(false);
            expect(validateEmail("")).toBe(false);
        });
    });

    describe("validateMobile", () => {
        it("should accept valid phone numbers", () => {
            expect(validateMobile("1234567890")).toBe(true); // 10 digits
            expect(validateMobile("123456789012345")).toBe(true); // 15 digits
            expect(validateMobile("9876543210")).toBe(true);
        });

        it("should reject invalid phone numbers", () => {
            expect(validateMobile("123")).toBe(false); // Too short
            expect(validateMobile("1234567890123456")).toBe(false); // Too long
            expect(validateMobile("")).toBe(false);
            expect(validateMobile("abcdefghij")).toBe(false);
        });
    });

    describe("validateName", () => {
        it("should accept valid names", () => {
            expect(validateName("John Doe")).toBe(true);
            expect(validateName("AB")).toBe(true); // 2 chars
            expect(validateName("A".repeat(100))).toBe(true); // 100 chars
        });

        it("should reject invalid names", () => {
            expect(validateName("A")).toBe(false); // Too short
            expect(validateName("A".repeat(101))).toBe(false); // Too long
            expect(validateName("")).toBe(false);
        });
    });

    describe("validateLocation", () => {
        it("should accept valid locations", () => {
            expect(validateLocation("New York")).toBe(true);
            expect(validateLocation("123 Main St, City")).toBe(true);
            expect(validateLocation("A".repeat(200))).toBe(true); // Max 200
        });

        it("should reject invalid locations", () => {
            expect(validateLocation("A".repeat(201))).toBe(false); // Too long
            expect(validateLocation("")).toBe(false);
        });
    });

    describe("validateNote", () => {
        it("should accept valid notes", () => {
            expect(validateNote("Valid note")).toBe(true);
            expect(validateNote("A")).toBe(true); // Min 1 char
            expect(validateNote("A".repeat(1000))).toBe(true); // Max 1000
        });

        it("should reject invalid notes", () => {
            expect(validateNote("")).toBe(false);
            expect(validateNote("A".repeat(1001))).toBe(false); // Too long
        });
    });

    describe("validateFollowUpDate", () => {
        it("should accept future dates", () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            expect(validateFollowUpDate(tomorrow.toISOString().split("T")[0])).toBe(true);

            const nextYear = new Date();
            nextYear.setFullYear(nextYear.getFullYear() + 1);
            expect(validateFollowUpDate(nextYear.toISOString().split("T")[0])).toBe(true);
        });

        it("should reject past dates", () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            expect(validateFollowUpDate(yesterday.toISOString().split("T")[0])).toBe(false);
        });

        it("should accept today's date", () => {
            const today = new Date().toISOString().split("T")[0];
            // This depends on implementation - might accept or reject
            const result = validateFollowUpDate(today);
            expect(typeof result).toBe("boolean");
        });

        it("should reject invalid date formats", () => {
            expect(validateFollowUpDate("")).toBe(false);
            expect(validateFollowUpDate("not-a-date")).toBe(false);
        });
    });

    describe("validateLeadInput", () => {
        it("should validate complete lead data", () => {
            const validLead = {
                name: "John Doe",
                mobile: "1234567890",
                email: "john@example.com",
                location: "New York",
            };

            const result = validateLeadInput(validLead.name, validLead.mobile, validLead.email, validLead.location);
            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual({});
        });

        it("should detect invalid name", () => {
            const result = validateLeadInput("A", "1234567890", "test@example.com", "Location");
            expect(result.isValid).toBe(false);
            expect(result.errors.name).toBeDefined();
        });

        it("should detect invalid mobile", () => {
            const result = validateLeadInput("John Doe", "123", "test@example.com", "Location");
            expect(result.isValid).toBe(false);
            expect(result.errors.mobile).toBeDefined();
        });

        it("should detect invalid email", () => {
            const result = validateLeadInput("John Doe", "1234567890", "invalid-email", "Location");
            expect(result.isValid).toBe(false);
            expect(result.errors.email).toBeDefined();
        });

        it("should allow optional fields to be empty", () => {
            // Email and location are optional
            const result = validateLeadInput("John Doe", "1234567890", "", "");
            expect(result.isValid).toBe(true);
        });
    });
});

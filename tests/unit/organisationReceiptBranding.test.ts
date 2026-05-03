import { describe, it, expect } from "vitest";
import {
    receiptBrandingFromOrganisation,
    formatMpesaLinesForReceipt,
} from "@backend/utils/organisationReceiptBranding";

describe("organisationReceiptBranding", () => {
    it("uses legacy header when organisation name empty", () => {
        const b = receiptBrandingFromOrganisation({ name: "", tagline: "", mpesa_methods: [] });
        expect(b.title).toBe("JKPOSMAN");
        expect(b.tagline).toBe("World Leader of Restaurant Software");
        expect(b.footerLines).toEqual([]);
    });

    it("omits tagline when name set and tagline blank", () => {
        const b = receiptBrandingFromOrganisation({
            name: "Acme Cafe",
            tagline: "",
            mpesa_methods: [],
        });
        expect(b.title).toBe("Acme Cafe");
        expect(b.tagline).toBeNull();
    });

    it("formats default till for footer", () => {
        const b = receiptBrandingFromOrganisation({
            name: "X",
            mpesa_methods: [
                { id: "1", type: "till", till_number: "820916", is_default: true },
                { id: "2", type: "paybill", paybill: "123", paybill_account: "abc", is_default: false },
            ],
        });
        expect(b.footerLines).toEqual(["M-PESA TILL NO: 820916"]);
    });

    it("formatMpesaLinesForReceipt paybill", () => {
        const lines = formatMpesaLinesForReceipt({
            id: "1",
            type: "paybill",
            paybill: "522522",
            paybill_account: "123456",
        });
        expect(lines[0]).toContain("522522");
        expect(lines[0]).toContain("123456");
    });
});

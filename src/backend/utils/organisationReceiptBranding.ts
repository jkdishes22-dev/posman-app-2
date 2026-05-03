/**
 * Organisation / M-Pesa fields for receipts (stored in system_settings.organisation_settings).
 */

export type MpesaMethodType = "till" | "pochi_la_biashara" | "paybill";

export interface OrganisationMpesaMethod {
    id: string;
    type: MpesaMethodType;
    till_number?: string;
    pochi_la_biashara?: string;
    paybill?: string;
    paybill_account?: string;
    is_default?: boolean;
}

export interface OrganisationSettingsValue {
    name?: string;
    tagline?: string;
    mpesa_methods?: OrganisationMpesaMethod[];
}

export interface ReceiptBrandingDto {
    /** Primary receipt header (centered) */
    title: string;
    /** Second line under title; omitted when null */
    tagline: string | null;
    /** Extra lines above thank-you footer (e.g. M-PESA) */
    footerLines: string[];
}

const LEGACY_TITLE = "JKPOSMAN";
const LEGACY_TAGLINE = "World Leader of Restaurant Software";

export function formatMpesaLinesForReceipt(method: OrganisationMpesaMethod): string[] {
    switch (method.type) {
        case "till": {
            const n = (method.till_number ?? "").trim();
            return n ? [`M-PESA TILL NO: ${n}`] : [];
        }
        case "pochi_la_biashara": {
            const n = (method.pochi_la_biashara ?? "").trim();
            return n ? [`M-PESA POCHI LA BIASHARA: ${n}`] : [];
        }
        case "paybill": {
            const p = (method.paybill ?? "").trim();
            const a = (method.paybill_account ?? "").trim();
            if (!p && !a) return [];
            return [`M-PESA PAYBILL: ${p}  ACC: ${a}`.trim()];
        }
        default:
            return [];
    }
}

function pickDefaultMethod(methods: OrganisationMpesaMethod[]): OrganisationMpesaMethod | undefined {
    if (!methods.length) return undefined;
    const d = methods.find((m) => m.is_default);
    return d ?? methods[0];
}

export function receiptBrandingFromOrganisation(
    org: OrganisationSettingsValue | null | undefined,
): ReceiptBrandingDto {
    const name = (org?.name ?? "").trim();
    const taglineRaw = (org?.tagline ?? "").trim();
    const methods = Array.isArray(org?.mpesa_methods) ? org!.mpesa_methods! : [];
    const def = pickDefaultMethod(methods);
    const footerLines = def ? formatMpesaLinesForReceipt(def) : [];

    const title = name || LEGACY_TITLE;
    let tagline: string | null;
    if (taglineRaw) {
        tagline = taglineRaw;
    } else if (!name) {
        tagline = LEGACY_TAGLINE;
    } else {
        tagline = null;
    }

    return { title, tagline, footerLines };
}

export function parseOrganisationSettingsRow(valueJson: string | null | undefined): ReceiptBrandingDto {
    if (!valueJson) {
        return receiptBrandingFromOrganisation(null);
    }
    try {
        const parsed = JSON.parse(valueJson) as OrganisationSettingsValue;
        return receiptBrandingFromOrganisation(parsed);
    } catch {
        return receiptBrandingFromOrganisation(null);
    }
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import { Card, Button, Alert, Spinner, Form, Badge, Row, Col, Table, Modal } from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";
import type { ApiErrorResponse } from "../../utils/errorUtils";
import ErrorDisplay from "../../components/ErrorDisplay";
import PageHeaderStrip from "../../components/PageHeaderStrip";
import HelpPopover from "../../components/HelpPopover";
import { normalizePrinterSettings, toPrinterSettingsPayload } from "../../shared/printerSettings";
import type {
    OrganisationSettingsValue,
    OrganisationMpesaMethod,
    MpesaMethodType,
} from "@backend/utils/organisationReceiptBranding";

interface PrinterInfo {
    name: string;
    displayName?: string;
    isDefault?: boolean;
}

interface PrinterSettings {
    print_after_create_bill: boolean;
    printer_name: string;
    auto_print_copy_mode: "customer" | "business" | "both";
}

interface BillSettings {
    show_tax_on_receipt: boolean;
    show_payment_on_receipt: boolean;
    top_n_billing_items: number;
    top_n_lookback_days: number;
}

interface DbBackupSettings {
    frequency: "daily" | "weekly" | "manual";
}

interface BusinessShift {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
}

interface BackupListEntry {
    filename: string;
    size: number;
    mtimeMs: number;
}

type RestoreConfirm =
    | null
    | "latest"
    | { kind: "upload"; file: File }
    | { kind: "list"; filename: string };

interface LicenseStatus {
    state: "ready" | "license_required" | "license_expired" | "license_invalid";
    message?: string;
    expiresAt?: string | null;
    planType?: string | null;
}

interface LicenseWarningSettings {
    months: number;
    days: number;
}

function newMpesaMethodId(): string {
    return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeOrganisationForSave(v: OrganisationSettingsValue): OrganisationSettingsValue {
    const methods: OrganisationMpesaMethod[] = (v.mpesa_methods ?? []).map((m) => ({
        ...m,
        id: m.id ? String(m.id) : newMpesaMethodId(),
        type: (m.type as MpesaMethodType) || "till",
        is_default: !!m.is_default,
    }));
    if (methods.length === 0) {
        return { name: (v.name ?? "").trim(), tagline: (v.tagline ?? "").trim(), mpesa_methods: [] };
    }
    const defaults = methods.filter((m) => m.is_default);
    if (defaults.length !== 1) {
        methods.forEach((m) => { m.is_default = false; });
        methods[0].is_default = true;
    }
    return {
        name: (v.name ?? "").trim(),
        tagline: (v.tagline ?? "").trim(),
        mpesa_methods: methods,
    };
}

function emptyOrganisation(): OrganisationSettingsValue {
    return { name: "", tagline: "", mpesa_methods: [] };
}

function newShiftId(): string {
    return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyShift(): BusinessShift {
    return {
        id: newShiftId(),
        name: "",
        start_time: "",
        end_time: "",
    };
}

export default function AdminSettingsPage() {
    const getLicenseExpiryWarning = (
        expiresAt: string | null | undefined,
        warning: LicenseWarningSettings
    ): { variant: "warning" | "danger"; message: string } | null => {
        if (!expiresAt) return null;
        const expiryDate = new Date(expiresAt);
        if (Number.isNaN(expiryDate.getTime())) return null;

        const warningStart = new Date(expiryDate);
        warningStart.setMonth(warningStart.getMonth() - Math.max(0, warning.months || 0));
        warningStart.setDate(warningStart.getDate() - Math.max(0, warning.days || 0));

        const now = new Date();
        const msInDay = 1000 * 60 * 60 * 24;
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / msInDay);
        if (daysUntilExpiry < 0) {
            return { variant: "danger", message: "License has expired. Please renew to avoid disruption." };
        }
        if (now >= warningStart) {
            const dayLabel = daysUntilExpiry === 1 ? "day" : "days";
            return { variant: "warning", message: `License expires in ${daysUntilExpiry} ${dayLabel}. Please renew soon.` };
        }
        return null;
    };

    const apiCall = useApiCall();

    // Printer settings
    const [printerSettings, setPrinterSettings] = useState<PrinterSettings>({
        print_after_create_bill: false,
        printer_name: "",
        auto_print_copy_mode: "both",
    });
    const [printers, setPrinters] = useState<PrinterInfo[]>([]);
    const [printerSaving, setPrinterSaving] = useState(false);
    const [printerResult, setPrinterResult] = useState<{ success: boolean; error?: string } | null>(null);
    const [printTestMessage, setPrintTestMessage] = useState<string | null>(null);
    const [printTestBusy, setPrintTestBusy] = useState(false);

    // Bill settings
    const [billSettings, setBillSettings] = useState<BillSettings>({ show_tax_on_receipt: true, show_payment_on_receipt: true, top_n_billing_items: 10, top_n_lookback_days: 30 });
    const [billSettingsSaving, setBillSettingsSaving] = useState(false);
    const [billSettingsResult, setBillSettingsResult] = useState<{ success: boolean; error?: string } | null>(null);

    // Shift settings
    const [businessShifts, setBusinessShifts] = useState<BusinessShift[]>([]);
    const [shiftSettingsSaving, setShiftSettingsSaving] = useState(false);
    const [shiftSettingsResult, setShiftSettingsResult] = useState<{ success: boolean; error?: string } | null>(null);

    // DB backup settings
    const [dbBackup, setDbBackup] = useState<DbBackupSettings>({ frequency: "daily" });
    const [backupLoading, setBackupLoading] = useState(false);
    const [backupResult, setBackupResult] = useState<{ success: boolean; path?: string; error?: string } | null>(null);
    const [dbBackupSaving, setDbBackupSaving] = useState(false);
    const [dbBackupResult, setDbBackupResult] = useState<{ success: boolean; error?: string } | null>(null);

    const [backups, setBackups] = useState<BackupListEntry[]>([]);
    const [sqliteRestoreAvailable, setSqliteRestoreAvailable] = useState<boolean | null>(null);
    const [backupsLoading, setBackupsLoading] = useState(false);
    const [restoreConfirm, setRestoreConfirm] = useState<RestoreConfirm>(null);
    const [restoreBusy, setRestoreBusy] = useState(false);
    const [restoreError, setRestoreError] = useState<string | null>(null);
    const [restoreErrorDetails, setRestoreErrorDetails] = useState<ApiErrorResponse | null>(null);
    const [restoreSuccessMessage, setRestoreSuccessMessage] = useState<string | null>(null);
    const [selectedBackupFilename, setSelectedBackupFilename] = useState("");
    const fileRestoreInputRef = useRef<HTMLInputElement>(null);

    const clearRestoreErrors = () => {
        setRestoreError(null);
        setRestoreErrorDetails(null);
    };

    const loadBackups = async () => {
        setBackupsLoading(true);
        clearRestoreErrors();
        try {
            const res = await apiCall("/api/system/restore?limit=5");
            if (res.status === 200 && Array.isArray(res.data?.backups)) {
                setSqliteRestoreAvailable(true);
                setBackups(res.data.backups);
            } else {
                setSqliteRestoreAvailable(false);
                setBackups([]);
            }
        } catch {
            setSqliteRestoreAvailable(false);
            setBackups([]);
            setRestoreError("Network error occurred");
            setRestoreErrorDetails({ networkError: true, status: 0, message: "Network error occurred" });
        } finally {
            setBackupsLoading(false);
        }
    };

    // Log settings
    const [logRetentionDays, setLogRetentionDays] = useState(14);
    const [logRetentionInput, setLogRetentionInput] = useState("14");
    const [logRetentionLoading, setLogRetentionLoading] = useState(false);
    const [logRetentionResult, setLogRetentionResult] = useState<{ success: boolean; message?: string } | null>(null);

    const [organisation, setOrganisation] = useState<OrganisationSettingsValue>(() => emptyOrganisation());
    const [organisationSaving, setOrganisationSaving] = useState(false);
    const [organisationResult, setOrganisationResult] = useState<{ success: boolean; error?: string } | null>(null);

    // License
    const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
    const [licenseLoading, setLicenseLoading] = useState(true);
    const [licenseCode, setLicenseCode] = useState("");
    const [licenseActivating, setLicenseActivating] = useState(false);
    const [licenseResult, setLicenseResult] = useState<{ success: boolean; error?: string } | null>(null);
    const [licenseWarning, setLicenseWarning] = useState<LicenseWarningSettings>({ months: 0, days: 7 });
    const [licenseWarningSaving, setLicenseWarningSaving] = useState(false);
    const [licenseWarningResult, setLicenseWarningResult] = useState<{ success: boolean; error?: string } | null>(null);
    const licenseExpiryWarning = getLicenseExpiryWarning(licenseStatus?.expiresAt, licenseWarning);

    useEffect(() => {
        // Load consolidated system_settings — each sub-property is a separate API call using ?sub=
        apiCall("/api/system/settings?key=system_settings&sub=printer_settings").then((res) => {
            if (res.status === 200 && res.data?.value) setPrinterSettings(normalizePrinterSettings(res.data.value));
        });
        apiCall("/api/system/settings?key=system_settings&sub=db_backup").then((res) => {
            if (res.status === 200 && res.data?.value) setDbBackup(res.data.value);
        });
        apiCall("/api/system/settings?key=system_settings&sub=log_settings").then((res) => {
            if (res.status === 200 && res.data?.value) {
                const days = res.data.value.retention_days;
                if (days) { setLogRetentionDays(Number(days)); setLogRetentionInput(String(days)); }
            }
        });
        // bill_settings is its own top-level key (product settings)
        apiCall("/api/system/settings?key=bill_settings").then((res) => {
            if (res.status === 200 && res.data?.value) setBillSettings((prev) => ({ ...prev, ...res.data.value }));
        });
        apiCall("/api/system/settings?key=system_settings&sub=business_shifts").then((res) => {
            if (res.status === 200 && Array.isArray(res.data?.value)) {
                const normalized = res.data.value
                    .filter((shift: any) => shift && typeof shift === "object")
                    .map((shift: any) => ({
                        id: shift.id ? String(shift.id) : newShiftId(),
                        name: typeof shift.name === "string" ? shift.name : "",
                        start_time: typeof shift.start_time === "string" ? shift.start_time : "",
                        end_time: typeof shift.end_time === "string" ? shift.end_time : "",
                    }));
                setBusinessShifts(normalized);
            }
        });
        apiCall("/api/system/settings?key=organisation_settings").then((res) => {
            if (res.status === 200 && res.data?.value != null) {
                const val = res.data.value as OrganisationSettingsValue;
                setOrganisation({
                    name: val.name ?? "",
                    tagline: val.tagline ?? "",
                    mpesa_methods: Array.isArray(val.mpesa_methods) ? val.mpesa_methods : [],
                });
            }
        }).catch(() => {});
        apiCall("/api/system/license-status").then((res) => {
            if (res.status === 200) setLicenseStatus(res.data);
            else setLicenseStatus({ state: "license_invalid", message: "Unable to load license status" });
        }).catch(() => {
            setLicenseStatus({ state: "license_invalid", message: "Unable to load license status" });
        }).finally(() => setLicenseLoading(false));
        apiCall("/api/system/settings?key=system_settings&sub=license_warning").then((res) => {
            if (res.status === 200 && res.data?.value && typeof res.data.value === "object") {
                setLicenseWarning({
                    months: Math.max(0, Number(res.data.value.months || 0)),
                    days: Math.max(0, Number(res.data.value.days || 0)),
                });
            }
        }).catch(() => {});

        const electronAPI = (window as any).electron;
        if (electronAPI?.getPrinters) {
            electronAPI.getPrinters().then((list: PrinterInfo[]) => setPrinters(list || []));
        }

        void loadBackups();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- initial settings + backup list load
    }, []);

    const handleSavePrinterSettings = async () => {
        setPrinterSaving(true);
        setPrinterResult(null);
        try {
            const result = await apiCall("/api/system/settings?key=system_settings&sub=printer_settings", {
                method: "PUT",
                body: JSON.stringify(toPrinterSettingsPayload(printerSettings)),
            });
            setPrinterResult(result.status === 200 ? { success: true } : { success: false, error: result.error || "Failed to save" });
        } catch {
            setPrinterResult({ success: false, error: "Network error occurred" });
        } finally {
            setPrinterSaving(false);
        }
    };

    const handleTestPrint = async () => {
        const electronAPI = (window as any).electron;
        if (!electronAPI?.printReceipt) {
            setPrintTestMessage("Silent print is only available in the desktop app (Electron). On web, use Print from a bill screen.");
            return;
        }
        setPrintTestBusy(true);
        setPrintTestMessage(null);
        try {
            const html = `<div style="padding:12px;font-family:monospace"><strong>JK PosMan — test print</strong><br/>${new Date().toLocaleString()}<br/>Printer: ${printerSettings.printer_name || "Default"}</div>`;
            const outcome = await electronAPI.printReceipt(html, printerSettings.printer_name || "");
            if (outcome?.success === false) {
                setPrintTestMessage(`Print failed: ${outcome.failureReason || "Unknown reason"}. Check Electron log (JK PosMan logs) or printer drivers.`);
            } else {
                setPrintTestMessage("Print job sent. Check your receipt printer for output.");
            }
        } catch (e: any) {
            setPrintTestMessage(`Print error: ${e?.message || String(e)}`);
        } finally {
            setPrintTestBusy(false);
        }
    };

    const handleSaveBillSettings = async () => {
        setBillSettingsSaving(true);
        setBillSettingsResult(null);
        try {
            const result = await apiCall("/api/system/settings?key=bill_settings", {
                method: "PUT",
                body: JSON.stringify(billSettings),
            });
            setBillSettingsResult(result.status === 200 ? { success: true } : { success: false, error: result.error || "Failed to save" });
        } catch {
            setBillSettingsResult({ success: false, error: "Network error occurred" });
        } finally {
            setBillSettingsSaving(false);
        }
    };

    const addBusinessShift = () => {
        setBusinessShifts((prev) => [...prev, emptyShift()]);
    };

    const removeBusinessShift = (id: string) => {
        setBusinessShifts((prev) => prev.filter((s) => s.id !== id));
    };

    const patchBusinessShift = (id: string, patch: Partial<BusinessShift>) => {
        setBusinessShifts((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    };

    const handleSaveShiftSettings = async () => {
        setShiftSettingsResult(null);

        for (const shift of businessShifts) {
            if (!shift.start_time || !shift.end_time) {
                setShiftSettingsResult({ success: false, error: "Each shift must have both start and end time." });
                return;
            }
            if (shift.start_time >= shift.end_time) {
                setShiftSettingsResult({
                    success: false,
                    error: `Shift${shift.name ? ` "${shift.name}"` : ""} must have an end time after start time.`,
                });
                return;
            }
        }

        setShiftSettingsSaving(true);
        try {
            const payload = businessShifts.map((shift) => ({
                id: shift.id,
                name: shift.name.trim(),
                start_time: shift.start_time,
                end_time: shift.end_time,
            }));
            const result = await apiCall("/api/system/settings?key=system_settings&sub=business_shifts", {
                method: "PUT",
                body: JSON.stringify(payload),
            });
            setShiftSettingsResult(
                result.status === 200
                    ? { success: true }
                    : { success: false, error: result.error || "Failed to save shifts" }
            );
        } catch {
            setShiftSettingsResult({ success: false, error: "Network error occurred" });
        } finally {
            setShiftSettingsSaving(false);
        }
    };

    const handleSaveDbBackup = async () => {
        setDbBackupSaving(true);
        setDbBackupResult(null);
        try {
            const result = await apiCall("/api/system/settings?key=system_settings&sub=db_backup", {
                method: "PUT",
                body: JSON.stringify(dbBackup),
            });
            setDbBackupResult(result.status === 200 ? { success: true } : { success: false, error: result.error || "Failed to save" });
        } catch {
            setDbBackupResult({ success: false, error: "Network error occurred" });
        } finally {
            setDbBackupSaving(false);
        }
    };

    const handleBackupNow = async () => {
        setBackupLoading(true);
        setBackupResult(null);
        try {
            const result = await apiCall("/api/system/backup", { method: "POST" });
            if (result.status === 200 && result.data?.success) {
                setBackupResult({ success: true, path: result.data.path });
                await loadBackups();
            } else {
                setBackupResult({ success: false, error: result.error || "Backup failed" });
            }
        } catch {
            setBackupResult({ success: false, error: "Network error occurred" });
        } finally {
            setBackupLoading(false);
        }
    };

    const executeRestoreLatest = async () => {
        setRestoreBusy(true);
        clearRestoreErrors();
        setRestoreSuccessMessage(null);
        try {
            const result = await apiCall("/api/system/restore", {
                method: "POST",
                body: JSON.stringify({ mode: "latest" }),
            });
            if (result.status === 200 && result.data?.success) {
                setRestoreConfirm(null);
                setRestoreSuccessMessage(result.data.message || "Database restored.");
                window.setTimeout(() => {
                    window.location.reload();
                }, 800);
            } else {
                setRestoreError(result.error || "Restore failed");
                setRestoreErrorDetails(result.errorDetails ?? { status: result.status, message: result.error || "" });
            }
        } catch {
            setRestoreError("Network error occurred");
            setRestoreErrorDetails({ networkError: true, status: 0, message: "Network error occurred" });
        } finally {
            setRestoreBusy(false);
        }
    };

    const executeRestoreFromBackup = async (filename: string) => {
        setRestoreBusy(true);
        clearRestoreErrors();
        setRestoreSuccessMessage(null);
        try {
            const result = await apiCall("/api/system/restore", {
                method: "POST",
                body: JSON.stringify({ mode: "from_backup", filename }),
            });
            if (result.status === 200 && result.data?.success) {
                setRestoreConfirm(null);
                setRestoreSuccessMessage(result.data.message || "Database restored.");
                window.setTimeout(() => {
                    window.location.reload();
                }, 800);
            } else {
                setRestoreError(result.error || "Restore failed");
                setRestoreErrorDetails(result.errorDetails ?? { status: result.status, message: result.error || "" });
            }
        } catch {
            setRestoreError("Network error occurred");
            setRestoreErrorDetails({ networkError: true, status: 0, message: "Network error occurred" });
        } finally {
            setRestoreBusy(false);
        }
    };

    const executeRestoreUpload = async (file: File) => {
        setRestoreBusy(true);
        clearRestoreErrors();
        setRestoreSuccessMessage(null);
        const fd = new FormData();
        fd.append("file", file);
        try {
            const result = await apiCall("/api/system/restore-upload", {
                method: "POST",
                body: fd,
            });
            if (result.status === 200 && result.data?.success) {
                setRestoreConfirm(null);
                setRestoreSuccessMessage(result.data.message || "Database restored.");
                window.setTimeout(() => {
                    window.location.reload();
                }, 800);
            } else {
                setRestoreError(result.error || "Restore failed");
                setRestoreErrorDetails(result.errorDetails ?? { status: result.status, message: result.error || "" });
            }
        } catch {
            setRestoreError("Network error occurred");
            setRestoreErrorDetails({ networkError: true, status: 0, message: "Network error occurred" });
        } finally {
            setRestoreBusy(false);
        }
    };

    const handleLogRetentionSave = async () => {
        const days = Number(logRetentionInput);
        if (!Number.isFinite(days) || days < 1 || days > 365) {
            setLogRetentionResult({ success: false, message: "Enter a number between 1 and 365." });
            return;
        }
        setLogRetentionLoading(true);
        setLogRetentionResult(null);
        const result = await apiCall("/api/system/settings?key=system_settings&sub=log_settings", {
            method: "PUT",
            body: JSON.stringify({ retention_days: days }),
        });
        setLogRetentionLoading(false);
        if (result.status === 200) {
            setLogRetentionDays(days);
            setLogRetentionResult({ success: true, message: `Log files will be kept for ${days} day${days !== 1 ? "s" : ""}. Older files are removed automatically.` });
        } else {
            setLogRetentionResult({ success: false, message: result.error || "Failed to save setting." });
        }
    };

    const handleSaveOrganisation = async () => {
        setOrganisationSaving(true);
        setOrganisationResult(null);
        const payload = normalizeOrganisationForSave(organisation);
        try {
            const result = await apiCall("/api/system/settings?key=organisation_settings", {
                method: "PUT",
                body: JSON.stringify(payload),
            });
            if (result.status === 200) {
                setOrganisation(payload);
                setOrganisationResult({ success: true });
            } else {
                setOrganisationResult({ success: false, error: result.error || "Failed to save" });
            }
        } catch {
            setOrganisationResult({ success: false, error: "Network error occurred" });
        } finally {
            setOrganisationSaving(false);
        }
    };

    const addMpesaMethod = () => {
        setOrganisation((org) => {
            const methods = [...(org.mpesa_methods ?? [])];
            const isFirst = methods.length === 0;
            methods.push({
                id: newMpesaMethodId(),
                type: "till",
                till_number: "",
                is_default: isFirst,
            });
            return { ...org, mpesa_methods: methods };
        });
    };

    const removeMpesaMethod = (id: string) => {
        setOrganisation((org) => {
            let methods = (org.mpesa_methods ?? []).filter((m) => m.id !== id);
            if (methods.length && !methods.some((m) => m.is_default)) {
                methods = methods.map((m, i) => ({ ...m, is_default: i === 0 }));
            }
            return { ...org, mpesa_methods: methods };
        });
    };

    const patchMpesaMethod = (id: string, patch: Partial<OrganisationMpesaMethod>) => {
        setOrganisation((org) => ({
            ...org,
            mpesa_methods: (org.mpesa_methods ?? []).map((m) => (m.id === id ? { ...m, ...patch } : m)),
        }));
    };

    const setDefaultMpesaMethod = (id: string) => {
        setOrganisation((org) => ({
            ...org,
            mpesa_methods: (org.mpesa_methods ?? []).map((m) => ({ ...m, is_default: m.id === id })),
        }));
    };

    const handleActivateLicense = async () => {
        if (!licenseCode.trim()) return;
        setLicenseActivating(true);
        setLicenseResult(null);
        try {
            const result = await apiCall("/api/system/license-activate", {
                method: "POST",
                body: JSON.stringify({ licenseCode: licenseCode.trim() }),
            });
            if (result.status === 200) {
                setLicenseResult({ success: true });
                setLicenseCode("");
                const statusRes = await apiCall("/api/system/license-status");
                if (statusRes.status === 200) setLicenseStatus(statusRes.data);
            } else {
                setLicenseResult({ success: false, error: result.data?.message || result.error || "Activation failed" });
            }
        } catch {
            setLicenseResult({ success: false, error: "Network error occurred" });
        } finally {
            setLicenseActivating(false);
        }
    };

    const handleSaveLicenseWarning = async () => {
        const months = Number(licenseWarning.months);
        const days = Number(licenseWarning.days);
        if (!Number.isFinite(months) || !Number.isFinite(days) || months < 0 || days < 0) {
            setLicenseWarningResult({ success: false, error: "Months and days must be zero or positive numbers." });
            return;
        }
        setLicenseWarningSaving(true);
        setLicenseWarningResult(null);
        try {
            const result = await apiCall("/api/system/settings?key=system_settings&sub=license_warning", {
                method: "PUT",
                body: JSON.stringify({ months, days }),
            });
            if (result.status === 200) {
                setLicenseWarningResult({ success: true });
            } else {
                setLicenseWarningResult({ success: false, error: result.error || "Failed to save warning settings." });
            }
        } catch {
            setLicenseWarningResult({ success: false, error: "Network error occurred" });
        } finally {
            setLicenseWarningSaving(false);
        }
    };

    const getLicenseBadge = (state: string) => {
        switch (state) {
            case "ready": return <Badge bg="success">Active</Badge>;
            case "license_expired": return <Badge bg="warning" text="dark">Expired</Badge>;
            case "license_required": return <Badge bg="secondary">Not Licensed</Badge>;
            default: return <Badge bg="danger">Invalid</Badge>;
        }
    };

    return (
        <RoleAwareLayout>
            <div className="container-fluid">
                <PageHeaderStrip>
                    <div className="d-flex align-items-center flex-wrap gap-2">
                        <h1 className="h4 mb-0 fw-bold">System Settings</h1>
                        <HelpPopover id="system-settings-overview" title="System settings" className="text-white">
                            License activation, bill presentation, organisation branding on receipts, printers, database backups, logs, and other maintenance tasks for administrators.
                        </HelpPopover>
                    </div>
                </PageHeaderStrip>

                {/* Top row: License + Business Shifts */}
                <Row className="mb-4">
                    <Col md={6} className="mb-4 mb-md-0">
                        <Card className="shadow-sm h-100">
                            <Card.Header className="bg-light fw-bold">License</Card.Header>
                            <Card.Body>
                                {licenseLoading ? <Spinner animation="border" size="sm" /> : (
                                    <>
                                        {licenseExpiryWarning && (
                                            <Alert variant={licenseExpiryWarning.variant} className="mb-3">
                                                {licenseExpiryWarning.message}
                                            </Alert>
                                        )}
                                        <div className="mb-3 d-flex align-items-center gap-2">
                                            <span className="text-muted">Status:</span>
                                            {licenseStatus && getLicenseBadge(licenseStatus.state)}
                                            {licenseStatus?.message && <span className="text-muted small">{licenseStatus.message}</span>}
                                        </div>
                                        {licenseResult && (
                                            <Alert variant={licenseResult.success ? "success" : "danger"} dismissible onClose={() => setLicenseResult(null)} className="mb-3">
                                                {licenseResult.success ? "License activated successfully." : licenseResult.error}
                                            </Alert>
                                        )}
                                        {licenseWarningResult && (
                                            <Alert
                                                variant={licenseWarningResult.success ? "success" : "danger"}
                                                dismissible
                                                onClose={() => setLicenseWarningResult(null)}
                                                className="mb-3"
                                            >
                                                {licenseWarningResult.success ? "License warning settings saved." : licenseWarningResult.error}
                                            </Alert>
                                        )}
                                        <Form.Group className="mb-3">
                                            <Form.Label className="fw-medium">License Key</Form.Label>
                                            <Form.Control type="text" placeholder="Enter license key" value={licenseCode} onChange={(e) => setLicenseCode(e.target.value)} />
                                        </Form.Group>
                                        <div className="border rounded p-3 mb-3 bg-light">
                                            <div className="fw-medium mb-2">Expiry warning lead time</div>
                                            <Row className="g-2">
                                                <Col xs={6}>
                                                    <Form.Label className="small mb-1">Months</Form.Label>
                                                    <Form.Control
                                                        type="number"
                                                        min={0}
                                                        value={licenseWarning.months}
                                                        onChange={(e) =>
                                                            setLicenseWarning((prev) => ({ ...prev, months: Number(e.target.value) || 0 }))
                                                        }
                                                    />
                                                </Col>
                                                <Col xs={6}>
                                                    <Form.Label className="small mb-1">Days</Form.Label>
                                                    <Form.Control
                                                        type="number"
                                                        min={0}
                                                        value={licenseWarning.days}
                                                        onChange={(e) =>
                                                            setLicenseWarning((prev) => ({ ...prev, days: Number(e.target.value) || 0 }))
                                                        }
                                                    />
                                                </Col>
                                            </Row>
                                            <small className="text-muted d-block mt-2">
                                                Example: 0 months + 7 days shows warnings in the final week.
                                            </small>
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                className="mt-2"
                                                onClick={handleSaveLicenseWarning}
                                                disabled={licenseWarningSaving}
                                            >
                                                {licenseWarningSaving ? <><Spinner animation="border" size="sm" className="me-2" />Saving…</> : "Save warning settings"}
                                            </Button>
                                        </div>
                                        <Button variant="primary" onClick={handleActivateLicense} disabled={licenseActivating || !licenseCode.trim()}>
                                            {licenseActivating ? <><Spinner animation="border" size="sm" className="me-2" />Activating…</> : "Activate License"}
                                        </Button>
                                    </>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col md={6}>
                        <Card className="shadow-sm h-100">
                            <Card.Header className="bg-light fw-bold d-flex align-items-center gap-1 flex-wrap">
                                <span>Business shifts</span>
                                <HelpPopover id="business-shifts-help" title="Business shift windows">
                                    Define unlimited shift windows for operational tracking (for example 07:00-12:00 and 15:00-22:00).
                                    These shifts will be used later in shift-based sales and cashier reporting.
                                </HelpPopover>
                            </Card.Header>
                            <Card.Body>
                                {shiftSettingsResult && (
                                    <Alert
                                        variant={shiftSettingsResult.success ? "success" : "danger"}
                                        dismissible
                                        onClose={() => setShiftSettingsResult(null)}
                                        className="mb-3"
                                    >
                                        {shiftSettingsResult.success ? "Shift settings saved." : shiftSettingsResult.error}
                                    </Alert>
                                )}
                                <p className="text-muted mb-3 small">
                                    Add one or more business shifts. Leave none if your business does not use shift segmentation yet.
                                </p>
                                <Button variant="primary" className="mb-3" onClick={addBusinessShift}>
                                    <i className="bi bi-plus-lg me-1"></i>
                                    Add shift
                                </Button>
                                {businessShifts.length === 0 ? (
                                    <p className="text-muted small fst-italic mb-0">No shifts configured.</p>
                                ) : (
                                    <Table responsive bordered size="sm" className="mb-0 align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th style={{ width: "36%" }}>Shift name (optional)</th>
                                                <th style={{ width: "24%" }}>Start time</th>
                                                <th style={{ width: "24%" }}>End time</th>
                                                <th style={{ width: "16%" }} />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {businessShifts.map((shift, index) => (
                                                <tr key={shift.id}>
                                                    <td>
                                                        <Form.Control
                                                            size="sm"
                                                            placeholder={`Shift ${index + 1} (e.g. Morning)`}
                                                            value={shift.name}
                                                            onChange={(e) => patchBusinessShift(shift.id, { name: e.target.value })}
                                                        />
                                                    </td>
                                                    <td>
                                                        <Form.Control
                                                            size="sm"
                                                            type="time"
                                                            value={shift.start_time}
                                                            onChange={(e) => patchBusinessShift(shift.id, { start_time: e.target.value })}
                                                            required
                                                        />
                                                    </td>
                                                    <td>
                                                        <Form.Control
                                                            size="sm"
                                                            type="time"
                                                            value={shift.end_time}
                                                            onChange={(e) => patchBusinessShift(shift.id, { end_time: e.target.value })}
                                                            required
                                                        />
                                                    </td>
                                                    <td className="text-end">
                                                        <Button variant="outline-danger" size="sm" onClick={() => removeBusinessShift(shift.id)}>
                                                            Remove
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                                <Button className="mt-3" variant="primary" onClick={handleSaveShiftSettings} disabled={shiftSettingsSaving}>
                                    {shiftSettingsSaving ? <><Spinner animation="border" size="sm" className="me-2" />Saving…</> : "Save shifts"}
                                </Button>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Organisation & Receipts — consolidated: branding, display options, printer */}
                <Card className="shadow-sm mb-4">
                    <Card.Header className="bg-light fw-bold d-flex align-items-center gap-1 flex-wrap">
                        <span>Organisation &amp; receipts</span>
                        <HelpPopover id="org-receipts" title="Organisation &amp; receipts">
                            <p className="mb-2">
                                Business name and tagline appear on printed and downloaded receipts. The M-PESA method marked{" "}
                                <strong>Default</strong> is printed above the thank-you footer.
                            </p>
                            <p className="mb-0">
                                Receipt display and printer settings are also managed here.
                            </p>
                        </HelpPopover>
                    </Card.Header>
                    <Card.Body>

                        {/* ── Organisation branding ───────────────────────────────── */}
                        <h6 className="fw-bold mb-3">Organisation branding</h6>
                        {organisationResult && (
                            <Alert variant={organisationResult.success ? "success" : "danger"} dismissible onClose={() => setOrganisationResult(null)} className="mb-3">
                                {organisationResult.success ? "Organisation settings saved." : organisationResult.error}
                            </Alert>
                        )}
                        <Row className="g-3 mb-3">
                            <Col md={6}>
                                <Form.Label className="fw-medium">Organisation name (receipt header)</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={organisation.name ?? ""}
                                    onChange={(e) => setOrganisation((o) => ({ ...o, name: e.target.value }))}
                                    placeholder="e.g. Emirates Restaurant & Bar"
                                />
                            </Col>
                            <Col md={6}>
                                <Form.Label className="fw-medium">Tagline <span className="text-muted fw-normal">(optional)</span></Form.Label>
                                <Form.Control
                                    type="text"
                                    value={organisation.tagline ?? ""}
                                    onChange={(e) => setOrganisation((o) => ({ ...o, tagline: e.target.value }))}
                                    placeholder="Shown under the name; leave blank for none"
                                />
                            </Col>
                        </Row>
                        <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                            <div className="d-flex align-items-center gap-1">
                                <h6 className="fw-bold mb-0">M-PESA payment options</h6>
                                <HelpPopover id="mpesa-lines" title="M-PESA on receipts">
                                    Without at least one method, no M-PESA lines appear on the receipt. Add a method to show Till, Pochi la biashara,
                                    or Paybill details.
                                </HelpPopover>
                            </div>
                            <Button variant="outline-primary" size="sm" onClick={addMpesaMethod}>
                                Add method
                            </Button>
                        </div>
                        {(organisation.mpesa_methods ?? []).length === 0 ? (
                            <p className="text-muted small fst-italic mb-0">No payment methods yet.</p>
                        ) : (
                            <Table responsive bordered size="sm" className="mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: "9rem" }}>Default</th>
                                        <th style={{ width: "11rem" }}>Type</th>
                                        <th>Details</th>
                                        <th style={{ width: "4rem" }} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {(organisation.mpesa_methods ?? []).map((m) => (
                                        <tr key={m.id}>
                                            <td>
                                                <Form.Check
                                                    type="radio"
                                                    name="org-mpesa-default"
                                                    checked={!!m.is_default}
                                                    onChange={() => setDefaultMpesaMethod(m.id)}
                                                    label="Use on receipt"
                                                />
                                            </td>
                                            <td>
                                                <Form.Select
                                                    value={m.type}
                                                    onChange={(e) =>
                                                        patchMpesaMethod(m.id, {
                                                            type: e.target.value as MpesaMethodType,
                                                        })
                                                    }
                                                >
                                                    <option value="till">Till number</option>
                                                    <option value="pochi_la_biashara">Pochi la biashara</option>
                                                    <option value="paybill">Paybill + account</option>
                                                </Form.Select>
                                            </td>
                                            <td>
                                                {m.type === "till" && (
                                                    <Form.Control
                                                        size="sm"
                                                        placeholder="Till number"
                                                        value={m.till_number ?? ""}
                                                        onChange={(e) => patchMpesaMethod(m.id, { till_number: e.target.value })}
                                                    />
                                                )}
                                                {m.type === "pochi_la_biashara" && (
                                                    <Form.Control
                                                        size="sm"
                                                        placeholder="Pochi number"
                                                        value={m.pochi_la_biashara ?? ""}
                                                        onChange={(e) => patchMpesaMethod(m.id, { pochi_la_biashara: e.target.value })}
                                                    />
                                                )}
                                                {m.type === "paybill" && (
                                                    <div className="d-flex flex-wrap gap-2">
                                                        <Form.Control
                                                            size="sm"
                                                            placeholder="Paybill"
                                                            value={m.paybill ?? ""}
                                                            onChange={(e) => patchMpesaMethod(m.id, { paybill: e.target.value })}
                                                            style={{ maxWidth: "10rem" }}
                                                        />
                                                        <Form.Control
                                                            size="sm"
                                                            placeholder="Account no."
                                                            value={m.paybill_account ?? ""}
                                                            onChange={(e) => patchMpesaMethod(m.id, { paybill_account: e.target.value })}
                                                            style={{ maxWidth: "10rem" }}
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-end">
                                                <Button variant="outline-danger" size="sm" onClick={() => removeMpesaMethod(m.id)}>
                                                    Remove
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                        <Button className="mt-3" variant="primary" onClick={handleSaveOrganisation} disabled={organisationSaving}>
                            {organisationSaving ? <><Spinner animation="border" size="sm" className="me-2" />Saving…</> : "Save organisation"}
                        </Button>

                        <hr className="my-4" />

                        {/* ── Receipt display + Printer side by side ─────────────── */}
                        <Row className="g-4">
                            <Col md={6}>
                                <h6 className="fw-bold mb-3">Receipt display</h6>
                                {billSettingsResult && (
                                    <Alert variant={billSettingsResult.success ? "success" : "danger"} dismissible onClose={() => setBillSettingsResult(null)} className="mb-3">
                                        {billSettingsResult.success ? "Display settings saved." : billSettingsResult.error}
                                    </Alert>
                                )}
                                <Form.Check
                                    type="switch"
                                    id="show-tax-switch"
                                    label="Show tax on receipt"
                                    checked={billSettings.show_tax_on_receipt}
                                    onChange={(e) => setBillSettings((s) => ({ ...s, show_tax_on_receipt: e.target.checked }))}
                                    className="mb-2"
                                />
                                <Form.Check
                                    type="switch"
                                    id="show-payment-switch"
                                    label="Show payment mode on receipt"
                                    checked={billSettings.show_payment_on_receipt !== false}
                                    onChange={(e) => setBillSettings((s) => ({ ...s, show_payment_on_receipt: e.target.checked }))}
                                    className="mb-3"
                                />
                                <h6 className="fw-bold mb-2 mt-3">Billing page defaults</h6>
                                <Form.Group className="mb-2">
                                    <Form.Label className="small mb-1">Top items to show on billing page load</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min={1}
                                        max={50}
                                        value={billSettings.top_n_billing_items}
                                        onChange={(e) => setBillSettings((s) => ({ ...s, top_n_billing_items: Math.max(1, Number(e.target.value)) }))}
                                        style={{ width: "100px" }}
                                    />
                                    <Form.Text className="text-muted">Items shown before a category is selected (1–50).</Form.Text>
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small mb-1">Lookback window for top items (days)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min={1}
                                        max={365}
                                        value={billSettings.top_n_lookback_days}
                                        onChange={(e) => setBillSettings((s) => ({ ...s, top_n_lookback_days: Math.max(1, Number(e.target.value)) }))}
                                        style={{ width: "100px" }}
                                    />
                                    <Form.Text className="text-muted">How many past days of sales to consider when ranking items.</Form.Text>
                                </Form.Group>
                                <Button variant="primary" onClick={handleSaveBillSettings} disabled={billSettingsSaving}>
                                    {billSettingsSaving ? <><Spinner animation="border" size="sm" className="me-2" />Saving…</> : "Save display settings"}
                                </Button>
                            </Col>

                            <Col md={6} className="border-start">
                                <div className="d-flex align-items-center gap-1 mb-3">
                                    <h6 className="fw-bold mb-0">Printer settings</h6>
                                    <HelpPopover id="printer-settings-intro" title="Printer settings">
                                        Configure thermal/receipt printing for the desktop app. Use <strong>Test Print</strong> after choosing a device.
                                    </HelpPopover>
                                </div>
                                {printerResult && (
                                    <Alert variant={printerResult.success ? "success" : "danger"} dismissible onClose={() => setPrinterResult(null)} className="mb-3">
                                        {printerResult.success ? "Printer settings saved." : printerResult.error}
                                    </Alert>
                                )}
                                <div className="d-flex align-items-start gap-1 mb-2">
                                    <Form.Check
                                        type="switch"
                                        id="auto-print-switch"
                                        label="Auto-print when creating a new bill"
                                        checked={printerSettings.print_after_create_bill}
                                        onChange={(e) => setPrinterSettings((s) => ({ ...s, print_after_create_bill: e.target.checked }))}
                                        className="flex-grow-1 mb-0"
                                    />
                                    <HelpPopover id="auto-print-detail" title="Auto-print behaviour" wide>
                                        <p className="mb-2">
                                            When on, saving a new bill from billing prints two jobs (customer copy with totals first, then business copy).
                                            Closing a bill never prints automatically.
                                        </p>
                                        <p className="mb-0">
                                            My Sales → Print: one customer copy with totals. Billing → Print on a pending bill: the same pair as auto-print.
                                        </p>
                                    </HelpPopover>
                                </div>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-medium small mb-1">Auto-print copy mode</Form.Label>
                                    <Form.Select
                                        value={printerSettings.auto_print_copy_mode}
                                        onChange={(e) =>
                                            setPrinterSettings((s) => ({
                                                ...s,
                                                auto_print_copy_mode: e.target.value as PrinterSettings["auto_print_copy_mode"],
                                            }))
                                        }
                                    >
                                        <option value="customer">Print customer copy only</option>
                                        <option value="business">Print business copy only</option>
                                        <option value="both">Print both (customer and business copy)</option>
                                    </Form.Select>
                                    <Form.Text className="text-muted">
                                        Default behavior is <strong>both copies</strong> when not explicitly configured.
                                    </Form.Text>
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <div className="d-flex align-items-center gap-1 mb-1">
                                        <Form.Label className="fw-medium small mb-0">Printer</Form.Label>
                                        <HelpPopover id="printer-desktop-list" title="Printer list">
                                            The selectable printer list is only available in the desktop app (Electron). In the browser, enter a printer name
                                            or leave blank for the OS default.
                                        </HelpPopover>
                                    </div>
                                    {printers.length > 0 ? (
                                        <Form.Select value={printerSettings.printer_name} onChange={(e) => setPrinterSettings((s) => ({ ...s, printer_name: e.target.value }))}>
                                            <option value="">Default printer</option>
                                            {printers.map((p) => (
                                                <option key={p.name} value={p.name}>{p.displayName || p.name}{p.isDefault ? " (default)" : ""}</option>
                                            ))}
                                        </Form.Select>
                                    ) : (
                                        <Form.Control
                                            type="text"
                                            placeholder="Leave blank to use default printer"
                                            value={printerSettings.printer_name}
                                            onChange={(e) => setPrinterSettings((s) => ({ ...s, printer_name: e.target.value }))}
                                        />
                                    )}
                                </Form.Group>
                                {printTestMessage && (
                                    <Alert variant={printTestMessage.startsWith("Print job sent") ? "success" : "warning"} className="mb-3" dismissible onClose={() => setPrintTestMessage(null)}>
                                        {printTestMessage}
                                    </Alert>
                                )}
                                <div className="d-flex gap-2">
                                    <Button variant="outline-secondary" onClick={handleTestPrint} disabled={printTestBusy}>
                                        {printTestBusy ? <><Spinner animation="border" size="sm" className="me-1" />Sending…</> : "Test Print"}
                                    </Button>
                                    <Button variant="primary" onClick={handleSavePrinterSettings} disabled={printerSaving}>
                                        {printerSaving ? <><Spinner animation="border" size="sm" className="me-1" />Saving…</> : "Save printer"}
                                    </Button>
                                </div>
                            </Col>
                        </Row>

                    </Card.Body>
                </Card>

                {/* System Configuration card — DB Backup + Logs */}
                <Card className="shadow-sm mb-4">
                    <Card.Header className="bg-light fw-bold">System Configuration</Card.Header>
                    <Card.Body className="p-0">

                        {/* Database Backup */}
                        <div className="p-4">
                                <div className="d-flex align-items-center gap-1 mb-3">
                                    <h6 className="fw-bold mb-0">Database Backup</h6>
                                    <HelpPopover id="db-backup-overview" title="Database backup" wide>
                                        <p className="mb-2">
                                            Backups are stored alongside the database file. A backup can also be created automatically on the first launch of the day,
                                            depending on frequency below.
                                        </p>
                                        <p className="mb-0">
                                            <Link href="/help/admin">Admin Help</Link> explains restore options and manual recovery.
                                        </p>
                                    </HelpPopover>
                                </div>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-medium small">Automatic backup frequency</Form.Label>
                                    <Form.Select
                                        value={dbBackup.frequency}
                                        onChange={(e) => setDbBackup((s) => ({ ...s, frequency: e.target.value as DbBackupSettings["frequency"] }))}
                                    >
                                        <option value="daily">Daily (on first launch of the day)</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="manual">Manual only</option>
                                    </Form.Select>
                                </Form.Group>
                                {dbBackupResult && (
                                    <Alert variant={dbBackupResult.success ? "success" : "danger"} dismissible onClose={() => setDbBackupResult(null)} className="mb-3">
                                        {dbBackupResult.success ? "Backup settings saved." : dbBackupResult.error}
                                    </Alert>
                                )}
                                {backupResult && (
                                    <Alert variant={backupResult.success ? "success" : "danger"} dismissible onClose={() => setBackupResult(null)} className="mb-3">
                                        {backupResult.success ? (
                                            <><strong>Backup created.</strong>{backupResult.path && <div className="small mt-1 font-monospace">{backupResult.path}</div>}</>
                                        ) : backupResult.error}
                                    </Alert>
                                )}
                                {restoreSuccessMessage && (
                                    <Alert variant="success" className="mb-3">{restoreSuccessMessage}</Alert>
                                )}
                                <ErrorDisplay
                                    error={restoreError}
                                    errorDetails={restoreErrorDetails}
                                    onDismiss={clearRestoreErrors}
                                />
                                {sqliteRestoreAvailable === true && (
                                    <div className="mb-3 p-3 border rounded bg-light">
                                        <div className="fw-medium small mb-2">Restore (SQLite desktop)</div>
                                        <p className="text-muted small mb-2">
                                            Restoring replaces the live database. Create a backup first. You may need to sign in again afterward.
                                        </p>
                                        <input
                                            ref={fileRestoreInputRef}
                                            type="file"
                                            accept=".db,application/octet-stream"
                                            className="d-none"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                e.target.value = "";
                                                if (f) setRestoreConfirm({ kind: "upload", file: f });
                                            }}
                                        />
                                        <div className="d-flex flex-wrap gap-2 mb-2">
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                disabled={restoreBusy || backupsLoading}
                                                onClick={() => setRestoreConfirm("latest")}
                                            >
                                                Restore latest backup
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                disabled={restoreBusy}
                                                onClick={() => fileRestoreInputRef.current?.click()}
                                            >
                                                Restore from file…
                                            </Button>
                                            <Button variant="outline-secondary" size="sm" disabled={backupsLoading} onClick={() => loadBackups()}>
                                                {backupsLoading ? <Spinner animation="border" size="sm" /> : "Refresh backup list"}
                                            </Button>
                                        </div>
                                        <Form.Group className="mb-2">
                                            <Form.Label className="small text-muted mb-1">Or choose a backup on this computer (latest 5 shown)</Form.Label>
                                            <div className="d-flex gap-2 flex-wrap align-items-center">
                                                <Form.Select
                                                    size="sm"
                                                    style={{ maxWidth: "16rem" }}
                                                    value={selectedBackupFilename}
                                                    onChange={(e) => setSelectedBackupFilename(e.target.value)}
                                                >
                                                    <option value="">Select backup…</option>
                                                    {backups.map((b) => (
                                                        <option key={b.filename} value={b.filename}>
                                                            {b.filename} ({(b.size / 1024).toFixed(0)} KB)
                                                        </option>
                                                    ))}
                                                </Form.Select>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    disabled={restoreBusy || !selectedBackupFilename}
                                                    onClick={() =>
                                                        setRestoreConfirm({ kind: "list", filename: selectedBackupFilename })
                                                    }
                                                >
                                                    Restore selected
                                                </Button>
                                            </div>
                                        </Form.Group>
                                    </div>
                                )}
                                {sqliteRestoreAvailable === false && (
                                    <div className="d-flex align-items-start gap-1 mb-3">
                                        <span className="text-muted small">Restore from this screen isn&apos;t available in this environment.</span>
                                        <HelpPopover id="sqlite-restore-env" title="Database restore">
                                            Database restore from this screen is only available when the app runs in SQLite mode (typically the desktop app).
                                            Server or browser deployments use their own backup/restore procedures.
                                        </HelpPopover>
                                    </div>
                                )}
                                <div className="d-flex gap-2">
                                    <Button variant="outline-secondary" onClick={handleBackupNow} disabled={backupLoading}>
                                        {backupLoading ? <><Spinner animation="border" size="sm" className="me-1" />Backing up…</> : <><i className="bi bi-database-fill-down me-1" />Backup Now</>}
                                    </Button>
                                    <Button variant="primary" onClick={handleSaveDbBackup} disabled={dbBackupSaving}>
                                        {dbBackupSaving ? <><Spinner animation="border" size="sm" className="me-1" />Saving…</> : "Save"}
                                    </Button>
                                </div>
                        </div>

                        <hr className="m-0" />

                        {/* Log Settings (full width) */}
                        <div className="p-4">
                            <div className="d-flex align-items-center gap-1 mb-3">
                                <h6 className="fw-bold mb-0">Log Settings</h6>
                                <HelpPopover id="log-retention" title="Log retention &amp; viewer" wide>
                                    <p className="mb-2">
                                        Controls how long application log files are kept on disk. Files older than the retention window are deleted automatically
                                        when the log viewer is opened.
                                    </p>
                                    <p className="mb-0">
                                        Admins can open the{" "}
                                        <Link href="/admin/logs">application log viewer</Link>
                                        {" "}to diagnose desktop (Electron) issues. Access requires the <code>can_view_logs</code> permission (assigned to admin by default).
                                    </p>
                                </HelpPopover>
                            </div>
                            <Row className="g-2 align-items-end" style={{ maxWidth: 340 }}>
                                <Col>
                                    <Form.Label className="small mb-1">Retention period (days)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min={1}
                                        max={365}
                                        value={logRetentionInput}
                                        onChange={(e) => setLogRetentionInput(e.target.value)}
                                    />
                                </Col>
                                <Col xs="auto">
                                    <Button
                                        variant="primary"
                                        onClick={handleLogRetentionSave}
                                        disabled={logRetentionLoading || Number(logRetentionInput) === logRetentionDays}
                                    >
                                        {logRetentionLoading ? <Spinner animation="border" size="sm" /> : "Save"}
                                    </Button>
                                </Col>
                            </Row>
                            {logRetentionResult && (
                                <Alert variant={logRetentionResult.success ? "success" : "danger"} dismissible onClose={() => setLogRetentionResult(null)} className="mt-3 mb-0">
                                    {logRetentionResult.message}
                                </Alert>
                            )}
                        </div>

                    </Card.Body>
                </Card>

                <Modal show={restoreConfirm !== null} onHide={() => !restoreBusy && setRestoreConfirm(null)} centered>
                    <Modal.Header closeButton={!restoreBusy}>
                        <Modal.Title>Confirm database restore</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {restoreConfirm === "latest" && (
                            <p className="mb-0">
                                Replace the live database with the <strong>newest</strong> automatic backup in the backups folder.
                                This cannot be undone except by restoring another backup. Active users may need to sign in again.
                            </p>
                        )}
                        {restoreConfirm && typeof restoreConfirm === "object" && restoreConfirm.kind === "upload" && (
                            <p className="mb-0">
                                Replace the live database with <strong className="font-monospace">{restoreConfirm.file.name}</strong>.
                                Only use a SQLite file you trust (for example from this application&apos;s backup). You may need to sign in again.
                            </p>
                        )}
                        {restoreConfirm && typeof restoreConfirm === "object" && restoreConfirm.kind === "list" && (
                            <p className="mb-0">
                                Replace the live database with <strong className="font-monospace">{restoreConfirm.filename}</strong>.
                                You may need to sign in again.
                            </p>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" disabled={restoreBusy} onClick={() => setRestoreConfirm(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            disabled={restoreBusy}
                            onClick={() => {
                                if (restoreConfirm === "latest") void executeRestoreLatest();
                                else if (restoreConfirm && typeof restoreConfirm === "object" && restoreConfirm.kind === "upload") {
                                    void executeRestoreUpload(restoreConfirm.file);
                                } else if (restoreConfirm && typeof restoreConfirm === "object" && restoreConfirm.kind === "list") {
                                    void executeRestoreFromBackup(restoreConfirm.filename);
                                }
                            }}
                        >
                            {restoreBusy ? <><Spinner animation="border" size="sm" className="me-1" />Restoring…</> : "Restore now"}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </div>
        </RoleAwareLayout>
    );
}
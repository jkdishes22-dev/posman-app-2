"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import { Card, Button, Alert, Spinner, Form, Badge, Row, Col, Table, Modal } from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";
import type { ApiErrorResponse } from "../../utils/errorUtils";
import ErrorDisplay from "../../components/ErrorDisplay";
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
}

interface BillSettings {
    show_tax_on_receipt: boolean;
}

interface DbBackupSettings {
    frequency: "daily" | "weekly" | "manual";
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

export default function AdminSettingsPage() {
    const apiCall = useApiCall();

    // Printer settings
    const [printerSettings, setPrinterSettings] = useState<PrinterSettings>({ print_after_create_bill: false, printer_name: "" });
    const [printers, setPrinters] = useState<PrinterInfo[]>([]);
    const [printerSaving, setPrinterSaving] = useState(false);
    const [printerResult, setPrinterResult] = useState<{ success: boolean; error?: string } | null>(null);
    const [printTestMessage, setPrintTestMessage] = useState<string | null>(null);
    const [printTestBusy, setPrintTestBusy] = useState(false);

    // Bill settings
    const [billSettings, setBillSettings] = useState<BillSettings>({ show_tax_on_receipt: true });
    const [billSettingsSaving, setBillSettingsSaving] = useState(false);
    const [billSettingsResult, setBillSettingsResult] = useState<{ success: boolean; error?: string } | null>(null);

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
            if (res.status === 200 && res.data?.value) setBillSettings(res.data.value);
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
                <div className="mb-4">
                    <h2 className="mb-0">System Settings</h2>
                    <p className="text-muted small mb-0">Manage system configuration and maintenance</p>
                </div>

                {/* Top row: License + Bill Settings */}
                <Row className="mb-4">
                    <Col md={6} className="mb-4 mb-md-0">
                        <Card className="shadow-sm h-100">
                            <Card.Header className="bg-light fw-bold">License</Card.Header>
                            <Card.Body>
                                {licenseLoading ? <Spinner animation="border" size="sm" /> : (
                                    <>
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
                                        <Form.Group className="mb-3">
                                            <Form.Label className="fw-medium">License Key</Form.Label>
                                            <Form.Control type="text" placeholder="Enter license key" value={licenseCode} onChange={(e) => setLicenseCode(e.target.value)} />
                                        </Form.Group>
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
                            <Card.Header className="bg-light fw-bold">Bill Settings</Card.Header>
                            <Card.Body>
                                <p className="text-muted small mb-3">Configure how bills are presented to customers.</p>
                                {billSettingsResult && (
                                    <Alert variant={billSettingsResult.success ? "success" : "danger"} dismissible onClose={() => setBillSettingsResult(null)} className="mb-3">
                                        {billSettingsResult.success ? "Bill settings saved." : billSettingsResult.error}
                                    </Alert>
                                )}
                                <Form.Check
                                    type="switch"
                                    id="show-tax-switch"
                                    label="Show tax on receipt"
                                    checked={billSettings.show_tax_on_receipt}
                                    onChange={(e) => setBillSettings((s) => ({ ...s, show_tax_on_receipt: e.target.checked }))}
                                    className="mb-3"
                                />
                                <Button variant="primary" onClick={handleSaveBillSettings} disabled={billSettingsSaving}>
                                    {billSettingsSaving ? <><Spinner animation="border" size="sm" className="me-2" />Saving…</> : "Save"}
                                </Button>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                <Card className="shadow-sm mb-4">
                    <Card.Header className="bg-light fw-bold">Organisation &amp; receipts</Card.Header>
                    <Card.Body>
                        <p className="text-muted small mb-3">
                            Business name and tagline appear on printed and downloaded receipts. The M-PESA method marked <strong>Default</strong>
                            is printed above the thank-you footer. Staff with the print permission receive branding via the same API as printer prefs.
                        </p>
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
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="fw-bold mb-0">M-PESA payment options</h6>
                            <Button variant="outline-primary" size="sm" onClick={addMpesaMethod}>
                                Add method
                            </Button>
                        </div>
                        {(organisation.mpesa_methods ?? []).length === 0 ? (
                            <p className="text-muted small">No M-PESA lines on the receipt. Add a method to show Till, Pochi la biashara, or Paybill details.</p>
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
                    </Card.Body>
                </Card>

                {/* System Configuration card — Printer + DB Backup side by side, Logs below */}
                <Card className="shadow-sm mb-4">
                    <Card.Header className="bg-light fw-bold">System Configuration</Card.Header>
                    <Card.Body className="p-0">

                        <Row className="g-0">
                            {/* Printer Settings */}
                            <Col md={6} className="p-4 border-end">
                                <h6 className="fw-bold mb-3">Printer Settings</h6>
                                {printerResult && (
                                    <Alert variant={printerResult.success ? "success" : "danger"} dismissible onClose={() => setPrinterResult(null)} className="mb-3">
                                        {printerResult.success ? "Printer settings saved." : printerResult.error}
                                    </Alert>
                                )}
                                <Form.Check
                                    type="switch"
                                    id="auto-print-switch"
                                    label="Auto-print when creating a new bill (customer + kitchen copy)"
                                    checked={printerSettings.print_after_create_bill}
                                    onChange={(e) => setPrinterSettings((s) => ({ ...s, print_after_create_bill: e.target.checked }))}
                                    className="mb-2"
                                />
                                <p className="text-muted small mb-3">
                                    When on, saving a new bill from billing prints two jobs (customer copy with totals first, then kitchen/captain ticket). Closing a bill never prints automatically.
                                    My Sales → Print: one customer copy with totals. Billing → Print on a pending bill: same pair as auto-print.
                                </p>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-medium small">Printer</Form.Label>
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
                                    <Form.Text className="text-muted">Printer list is only available in the desktop app.</Form.Text>
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
                                        {printerSaving ? <><Spinner animation="border" size="sm" className="me-1" />Saving…</> : "Save"}
                                    </Button>
                                </div>
                            </Col>

                            {/* Database Backup */}
                            <Col md={6} className="p-4">
                                <h6 className="fw-bold mb-3">Database Backup</h6>
                                <p className="text-muted small mb-3">
                                    Backups are stored alongside the database file. A backup is also created automatically on the first daily launch.
                                    {" "}
                                    <Link href="/help/admin">Admin Help</Link> explains restore options and manual recovery.
                                </p>
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
                                    <p className="text-muted small mb-3">Database restore from this screen is only available when the app runs in SQLite mode (desktop).</p>
                                )}
                                <div className="d-flex gap-2">
                                    <Button variant="outline-secondary" onClick={handleBackupNow} disabled={backupLoading}>
                                        {backupLoading ? <><Spinner animation="border" size="sm" className="me-1" />Backing up…</> : <><i className="bi bi-database-fill-down me-1" />Backup Now</>}
                                    </Button>
                                    <Button variant="primary" onClick={handleSaveDbBackup} disabled={dbBackupSaving}>
                                        {dbBackupSaving ? <><Spinner animation="border" size="sm" className="me-1" />Saving…</> : "Save"}
                                    </Button>
                                </div>
                            </Col>
                        </Row>

                        <hr className="m-0" />

                        {/* Log Settings (full width) */}
                        <div className="p-4">
                            <h6 className="fw-bold mb-2">Log Settings</h6>
                            <p className="text-muted small mb-3">
                                How long application log files are kept on disk. Files older than the retention window are deleted automatically when the log viewer is opened.
                                Admins can open the{" "}
                                <Link href="/admin/logs">application log viewer</Link>
                                {" "}to diagnose desktop (Electron) issues. Access requires the <code>can_view_logs</code> permission (assigned to admin by default).
                            </p>
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
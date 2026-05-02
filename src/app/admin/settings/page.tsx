"use client";

import React, { useState, useEffect } from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import { Card, Button, Alert, Spinner, Form, Badge } from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";

interface PrinterInfo {
    name: string;
    displayName?: string;
    isDefault?: boolean;
}

interface PrinterSettings {
    print_after_close_bill: boolean;
    printer_name: string;
}

interface BillSettings {
    show_tax_on_receipt: boolean;
}

interface AdminSettings {
    db_backup_frequency: "daily" | "weekly" | "manual";
}

interface LicenseStatus {
    state: "ready" | "license_required" | "license_expired" | "license_invalid";
    message?: string;
}

export default function AdminSettingsPage() {
    const apiCall = useApiCall();
    const [backupLoading, setBackupLoading] = useState(false);
    const [backupResult, setBackupResult] = useState<{ success: boolean; path?: string; error?: string } | null>(null);

    // Printer settings state
    const [printerSettings, setPrinterSettings] = useState<PrinterSettings>({ print_after_close_bill: false, printer_name: "" });
    const [printers, setPrinters] = useState<PrinterInfo[]>([]);
    const [printerSaving, setPrinterSaving] = useState(false);
    const [printerResult, setPrinterResult] = useState<{ success: boolean; error?: string } | null>(null);

    // Bill settings state
    const [billSettings, setBillSettings] = useState<BillSettings>({ show_tax_on_receipt: true });
    const [billSettingsSaving, setBillSettingsSaving] = useState(false);
    const [billSettingsResult, setBillSettingsResult] = useState<{ success: boolean; error?: string } | null>(null);

    // Admin settings state
    const [adminSettings, setAdminSettings] = useState<AdminSettings>({ db_backup_frequency: "daily" });
    const [adminSettingsSaving, setAdminSettingsSaving] = useState(false);
    const [adminSettingsResult, setAdminSettingsResult] = useState<{ success: boolean; error?: string } | null>(null);

    // License state
    const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
    const [licenseLoading, setLicenseLoading] = useState(true);
    const [licenseCode, setLicenseCode] = useState("");
    const [licenseActivating, setLicenseActivating] = useState(false);
    const [licenseResult, setLicenseResult] = useState<{ success: boolean; error?: string } | null>(null);

    // Log settings state
    const [logRetentionDays, setLogRetentionDays] = useState(14);
    const [logRetentionInput, setLogRetentionInput] = useState("14");
    const [logRetentionLoading, setLogRetentionLoading] = useState(false);
    const [logRetentionResult, setLogRetentionResult] = useState<{ success: boolean; message?: string } | null>(null);

    useEffect(() => {
        apiCall("/api/system/settings?key=printer_settings").then((res) => {
            if (res.status === 200 && res.data?.value) setPrinterSettings(res.data.value);
        });
        apiCall("/api/system/settings?key=bill_settings").then((res) => {
            if (res.status === 200 && res.data?.value) setBillSettings(res.data.value);
        });
        apiCall("/api/system/settings?key=admin_settings").then((res) => {
            if (res.status === 200 && res.data?.value) setAdminSettings(res.data.value);
        });
        apiCall("/api/system/settings?key=log_settings").then((result) => {
            if (result.status === 200) {
                const days = result.data?.value?.retention_days;
                if (days) { setLogRetentionDays(Number(days)); setLogRetentionInput(String(days)); }
            }
        });
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
    }, []);

    const handleBackup = async () => {
        setBackupLoading(true);
        setBackupResult(null);
        try {
            const result = await apiCall("/api/system/backup", { method: "POST" });
            if (result.status === 200 && result.data?.success) {
                setBackupResult({ success: true, path: result.data.path });
            } else {
                setBackupResult({ success: false, error: result.error || "Backup failed" });
            }
        } catch {
            setBackupResult({ success: false, error: "Network error occurred" });
        } finally {
            setBackupLoading(false);
        }
    };

    const handleSavePrinterSettings = async () => {
        setPrinterSaving(true);
        setPrinterResult(null);
        try {
            const result = await apiCall("/api/system/settings?key=printer_settings", {
                method: "PUT",
                body: JSON.stringify(printerSettings),
            });
            setPrinterResult(result.status === 200 ? { success: true } : { success: false, error: result.error || "Failed to save" });
        } catch {
            setPrinterResult({ success: false, error: "Network error occurred" });
        } finally {
            setPrinterSaving(false);
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

    const handleSaveAdminSettings = async () => {
        setAdminSettingsSaving(true);
        setAdminSettingsResult(null);
        try {
            const result = await apiCall("/api/system/settings?key=admin_settings", {
                method: "PUT",
                body: JSON.stringify(adminSettings),
            });
            setAdminSettingsResult(result.status === 200 ? { success: true } : { success: false, error: result.error || "Failed to save" });
        } catch {
            setAdminSettingsResult({ success: false, error: "Network error occurred" });
        } finally {
            setAdminSettingsSaving(false);
        }
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

    const handleLogRetentionSave = async () => {
        const days = Number(logRetentionInput);
        if (!Number.isFinite(days) || days < 1 || days > 365) {
            setLogRetentionResult({ success: false, message: "Enter a number between 1 and 365." });
            return;
        }
        setLogRetentionLoading(true);
        setLogRetentionResult(null);
        const result = await apiCall("/api/system/settings?key=log_settings", {
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

                {/* License */}
                <Card className="shadow-sm mb-4">
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

                {/* Printer Settings */}
                <Card className="shadow-sm mb-4">
                    <Card.Header className="bg-light fw-bold">Printer Settings</Card.Header>
                    <Card.Body>
                        {printerResult && (
                            <Alert variant={printerResult.success ? "success" : "danger"} dismissible onClose={() => setPrinterResult(null)} className="mb-3">
                                {printerResult.success ? "Printer settings saved." : printerResult.error}
                            </Alert>
                        )}
                        <Form.Check type="switch" id="auto-print-switch" label="Auto-print receipt after closing a bill"
                            checked={printerSettings.print_after_close_bill}
                            onChange={(e) => setPrinterSettings((s) => ({ ...s, print_after_close_bill: e.target.checked }))}
                            className="mb-3" />
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-medium">Printer</Form.Label>
                            {printers.length > 0 ? (
                                <Form.Select value={printerSettings.printer_name} onChange={(e) => setPrinterSettings((s) => ({ ...s, printer_name: e.target.value }))}>
                                    <option value="">Default printer</option>
                                    {printers.map((p) => (
                                        <option key={p.name} value={p.name}>{p.displayName || p.name}{p.isDefault ? " (default)" : ""}</option>
                                    ))}
                                </Form.Select>
                            ) : (
                                <Form.Control type="text" placeholder="Leave blank to use default printer"
                                    value={printerSettings.printer_name}
                                    onChange={(e) => setPrinterSettings((s) => ({ ...s, printer_name: e.target.value }))} />
                            )}
                            <Form.Text className="text-muted">Printer list is only available in the desktop app.</Form.Text>
                        </Form.Group>
                        <Button variant="primary" onClick={handleSavePrinterSettings} disabled={printerSaving}>
                            {printerSaving ? <><Spinner animation="border" size="sm" className="me-2" />Saving…</> : "Save Printer Settings"}
                        </Button>
                    </Card.Body>
                </Card>

                {/* Bill Settings */}
                <Card className="shadow-sm mb-4">
                    <Card.Header className="bg-light fw-bold">Bill Settings</Card.Header>
                    <Card.Body>
                        {billSettingsResult && (
                            <Alert variant={billSettingsResult.success ? "success" : "danger"} dismissible onClose={() => setBillSettingsResult(null)} className="mb-3">
                                {billSettingsResult.success ? "Bill settings saved." : billSettingsResult.error}
                            </Alert>
                        )}
                        <Form.Check type="switch" id="show-tax-switch" label="Show tax on receipt"
                            checked={billSettings.show_tax_on_receipt}
                            onChange={(e) => setBillSettings((s) => ({ ...s, show_tax_on_receipt: e.target.checked }))}
                            className="mb-3" />
                        <Button variant="primary" onClick={handleSaveBillSettings} disabled={billSettingsSaving}>
                            {billSettingsSaving ? <><Spinner animation="border" size="sm" className="me-2" />Saving…</> : "Save Bill Settings"}
                        </Button>
                    </Card.Body>
                </Card>

                {/* Admin Settings */}
                <Card className="shadow-sm mb-4">
                    <Card.Header className="bg-light fw-bold">Admin Settings</Card.Header>
                    <Card.Body>
                        {adminSettingsResult && (
                            <Alert variant={adminSettingsResult.success ? "success" : "danger"} dismissible onClose={() => setAdminSettingsResult(null)} className="mb-3">
                                {adminSettingsResult.success ? "Admin settings saved." : adminSettingsResult.error}
                            </Alert>
                        )}
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-medium">Automatic Database Backup</Form.Label>
                            <Form.Select value={adminSettings.db_backup_frequency}
                                onChange={(e) => setAdminSettings((s) => ({ ...s, db_backup_frequency: e.target.value as AdminSettings["db_backup_frequency"] }))}>
                                <option value="daily">Daily (on first launch of the day)</option>
                                <option value="weekly">Weekly</option>
                                <option value="manual">Manual only</option>
                            </Form.Select>
                        </Form.Group>
                        <Button variant="primary" onClick={handleSaveAdminSettings} disabled={adminSettingsSaving}>
                            {adminSettingsSaving ? <><Spinner animation="border" size="sm" className="me-2" />Saving…</> : "Save Admin Settings"}
                        </Button>
                    </Card.Body>
                </Card>

                {/* Log Settings */}
                <Card className="shadow-sm mb-4">
                    <Card.Header className="bg-light fw-bold">Log Settings</Card.Header>
                    <Card.Body>
                        <p className="text-muted mb-3">
                            Configure how long application log files are kept on disk. Log files are stored at{" "}
                            <span className="font-monospace">%APPDATA%\JK PosMan\logs</span> on Windows.{" "}
                            Files older than the retention window are deleted automatically when the log viewer is opened.
                        </p>
                        <div className="row g-2 align-items-end mb-3" style={{ maxWidth: 360 }}>
                            <div className="col">
                                <label className="form-label small mb-1">Retention period (days)</label>
                                <input type="number" className="form-control" min={1} max={365}
                                    value={logRetentionInput} onChange={e => setLogRetentionInput(e.target.value)} />
                            </div>
                            <div className="col-auto">
                                <Button variant="primary" onClick={handleLogRetentionSave}
                                    disabled={logRetentionLoading || Number(logRetentionInput) === logRetentionDays}>
                                    {logRetentionLoading ? <Spinner animation="border" size="sm" /> : "Save"}
                                </Button>
                            </div>
                        </div>
                        {logRetentionResult && (
                            <Alert variant={logRetentionResult.success ? "success" : "danger"} dismissible onClose={() => setLogRetentionResult(null)}>
                                {logRetentionResult.message}
                            </Alert>
                        )}
                    </Card.Body>
                </Card>

                {/* Database Backup */}
                <Card className="shadow-sm mb-4">
                    <Card.Header className="bg-light fw-bold">Database Backup</Card.Header>
                    <Card.Body>
                        <p className="text-muted mb-3">
                            Create a manual backup of the SQLite database. A backup is also created automatically on the first daily launch.
                        </p>
                        {backupResult && (
                            <Alert variant={backupResult.success ? "success" : "danger"} dismissible onClose={() => setBackupResult(null)} className="mb-3">
                                {backupResult.success ? (
                                    <><strong>Backup created successfully.</strong>{backupResult.path && <div className="small mt-1 font-monospace">{backupResult.path}</div>}</>
                                ) : backupResult.error}
                            </Alert>
                        )}
                        <Button variant="primary" onClick={handleBackup} disabled={backupLoading}>
                            {backupLoading ? <><Spinner animation="border" size="sm" className="me-2" />Backing up…</> : <><i className="bi bi-database-fill-down me-2"></i>Backup Database</>}
                        </Button>
                    </Card.Body>
                </Card>
            </div>
        </RoleAwareLayout>
    );
}

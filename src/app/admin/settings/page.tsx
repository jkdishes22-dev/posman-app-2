"use client";

import React, { useState, useEffect } from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import { Card, Button, Alert, Spinner, Form, Badge, Row, Col } from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";
import { normalizePrinterSettings, toPrinterSettingsPayload } from "../../shared/printerSettings";

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

interface LicenseStatus {
    state: "ready" | "license_required" | "license_expired" | "license_invalid";
    message?: string;
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

    // Log settings
    const [logRetentionDays, setLogRetentionDays] = useState(14);
    const [logRetentionInput, setLogRetentionInput] = useState("14");
    const [logRetentionLoading, setLogRetentionLoading] = useState(false);
    const [logRetentionResult, setLogRetentionResult] = useState<{ success: boolean; message?: string } | null>(null);

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
            } else {
                setBackupResult({ success: false, error: result.error || "Backup failed" });
            }
        } catch {
            setBackupResult({ success: false, error: "Network error occurred" });
        } finally {
            setBackupLoading(false);
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
                                    label="Auto-print when creating a new bill (kitchen + customer copy)"
                                    checked={printerSettings.print_after_create_bill}
                                    onChange={(e) => setPrinterSettings((s) => ({ ...s, print_after_create_bill: e.target.checked }))}
                                    className="mb-2"
                                />
                                <p className="text-muted small mb-3">
                                    Applies when a pending bill is first saved from billing. Submitting or closing bills does not auto-print; use the Print button on the bill screen.
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
            </div>
        </RoleAwareLayout>
    );
}
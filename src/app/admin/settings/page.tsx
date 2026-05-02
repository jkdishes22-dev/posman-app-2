"use client";

import React, { useState, useEffect } from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import { Card, Button, Alert, Spinner, Form } from "react-bootstrap";
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

export default function AdminSettingsPage() {
    const apiCall = useApiCall();
    const [backupLoading, setBackupLoading] = useState(false);
    const [backupResult, setBackupResult] = useState<{ success: boolean; path?: string; error?: string } | null>(null);

    // Printer settings state
    const [printerSettings, setPrinterSettings] = useState<PrinterSettings>({ print_after_close_bill: false, printer_name: "" });
    const [printers, setPrinters] = useState<PrinterInfo[]>([]);
    const [printerSaving, setPrinterSaving] = useState(false);
    const [printerResult, setPrinterResult] = useState<{ success: boolean; error?: string } | null>(null);

    // Log settings state
    const [logRetentionDays, setLogRetentionDays] = useState(14);
    const [logRetentionInput, setLogRetentionInput] = useState("14");
    const [logRetentionLoading, setLogRetentionLoading] = useState(false);
    const [logRetentionResult, setLogRetentionResult] = useState<{ success: boolean; message?: string } | null>(null);

    useEffect(() => {
        // Load printer settings
        apiCall("/api/system/settings?key=printer_settings").then((res) => {
            if (res.status === 200 && res.data?.value) {
                setPrinterSettings(res.data.value);
            }
        });

        // Load log retention setting
        apiCall("/api/system/settings?key=log_settings").then((result) => {
            if (result.status === 200) {
                const days = result.data?.value?.retention_days;
                if (days) {
                    setLogRetentionDays(Number(days));
                    setLogRetentionInput(String(days));
                }
            }
        });

        // Load available printers from Electron (no-op in web mode)
        const electronAPI = (window as any).electron;
        if (electronAPI?.getPrinters) {
            electronAPI.getPrinters().then((list: PrinterInfo[]) => {
                setPrinters(list || []);
            });
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
            if (result.status === 200) {
                setPrinterResult({ success: true });
            } else {
                setPrinterResult({ success: false, error: result.error || "Failed to save" });
            }
        } catch {
            setPrinterResult({ success: false, error: "Network error occurred" });
        } finally {
            setPrinterSaving(false);
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

    return (
        <RoleAwareLayout>
            <div className="container-fluid">
                <div className="mb-4">
                    <h2 className="mb-0">System Settings</h2>
                    <p className="text-muted small mb-0">Manage system configuration and maintenance</p>
                </div>

                {/* Printer Settings */}
                <Card className="shadow-sm mb-4">
                    <Card.Header className="bg-light fw-bold">Printer Settings</Card.Header>
                    <Card.Body>
                        {printerResult && (
                            <Alert
                                variant={printerResult.success ? "success" : "danger"}
                                dismissible
                                onClose={() => setPrinterResult(null)}
                                className="mb-3"
                            >
                                {printerResult.success ? "Printer settings saved." : printerResult.error}
                            </Alert>
                        )}

                        <Form.Check
                            type="switch"
                            id="auto-print-switch"
                            label="Auto-print receipt after closing a bill"
                            checked={printerSettings.print_after_close_bill}
                            onChange={(e) => setPrinterSettings((s) => ({ ...s, print_after_close_bill: e.target.checked }))}
                            className="mb-3"
                        />

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-medium">Printer</Form.Label>
                            {printers.length > 0 ? (
                                <Form.Select
                                    value={printerSettings.printer_name}
                                    onChange={(e) => setPrinterSettings((s) => ({ ...s, printer_name: e.target.value }))}
                                >
                                    <option value="">Default printer</option>
                                    {printers.map((p) => (
                                        <option key={p.name} value={p.name}>
                                            {p.displayName || p.name}{p.isDefault ? " (default)" : ""}
                                        </option>
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
                            <Form.Text className="text-muted">
                                Printer list is only available in the desktop app.
                            </Form.Text>
                        </Form.Group>

                        <Button variant="primary" onClick={handleSavePrinterSettings} disabled={printerSaving}>
                            {printerSaving ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Saving…
                                </>
                            ) : (
                                "Save Printer Settings"
                            )}
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
                                <input
                                    type="number"
                                    className="form-control"
                                    min={1}
                                    max={365}
                                    value={logRetentionInput}
                                    onChange={e => setLogRetentionInput(e.target.value)}
                                />
                            </div>
                            <div className="col-auto">
                                <Button
                                    variant="primary"
                                    onClick={handleLogRetentionSave}
                                    disabled={logRetentionLoading || Number(logRetentionInput) === logRetentionDays}
                                >
                                    {logRetentionLoading ? <Spinner animation="border" size="sm" /> : "Save"}
                                </Button>
                            </div>
                        </div>
                        {logRetentionResult && (
                            <Alert
                                variant={logRetentionResult.success ? "success" : "danger"}
                                dismissible
                                onClose={() => setLogRetentionResult(null)}
                            >
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
                            <Alert
                                variant={backupResult.success ? "success" : "danger"}
                                dismissible
                                onClose={() => setBackupResult(null)}
                                className="mb-3"
                            >
                                {backupResult.success ? (
                                    <>
                                        <strong>Backup created successfully.</strong>
                                        {backupResult.path && (
                                            <div className="small mt-1 font-monospace">{backupResult.path}</div>
                                        )}
                                    </>
                                ) : (
                                    backupResult.error
                                )}
                            </Alert>
                        )}

                        <Button
                            variant="primary"
                            onClick={handleBackup}
                            disabled={backupLoading}
                        >
                            {backupLoading ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Backing up…
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-database-fill-down me-2"></i>
                                    Backup Database
                                </>
                            )}
                        </Button>
                    </Card.Body>
                </Card>
            </div>
        </RoleAwareLayout>
    );
}

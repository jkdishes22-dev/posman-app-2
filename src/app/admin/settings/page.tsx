"use client";

import React, { useState, useEffect } from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import { Card, Button, Alert, Spinner } from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";

export default function AdminSettingsPage() {
    const apiCall = useApiCall();
    const [backupLoading, setBackupLoading] = useState(false);
    const [backupResult, setBackupResult] = useState<{ success: boolean; path?: string; error?: string } | null>(null);

    // Log settings
    const [logRetentionDays, setLogRetentionDays] = useState(14);
    const [logRetentionInput, setLogRetentionInput] = useState("14");
    const [logRetentionLoading, setLogRetentionLoading] = useState(false);
    const [logRetentionResult, setLogRetentionResult] = useState<{ success: boolean; message?: string } | null>(null);

    useEffect(() => {
        apiCall("/api/system/settings?key=log_settings").then(result => {
            if (result.status === 200) {
                const days = result.data?.value?.retention_days;
                if (days) {
                    setLogRetentionDays(Number(days));
                    setLogRetentionInput(String(days));
                }
            }
        });
    }, []);

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

    return (
        <RoleAwareLayout>
            <div className="container-fluid">
                <div className="mb-4">
                    <h2 className="mb-0">System Settings</h2>
                    <p className="text-muted small mb-0">Manage system configuration and maintenance</p>
                </div>

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

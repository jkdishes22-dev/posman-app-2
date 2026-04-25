"use client";

import React, { useState } from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import { Card, Button, Alert, Spinner } from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";

export default function AdminSettingsPage() {
    const apiCall = useApiCall();
    const [backupLoading, setBackupLoading] = useState(false);
    const [backupResult, setBackupResult] = useState<{ success: boolean; path?: string; error?: string } | null>(null);

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

"use client";
import React, { useState, useEffect, useCallback } from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import { useApiCall } from "../../utils/apiUtils";
import { todayEAT } from "../../shared/eatDate";

interface LogFile {
    filename: string;
    date: string;
    sizeBytes: number;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function LogsContent() {
    const apiCall = useApiCall();

    const [files, setFiles] = useState<LogFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [logContent, setLogContent] = useState<string | null>(null);
    const [truncated, setTruncated] = useState(false);
    const [isLoadingFiles, setIsLoadingFiles] = useState(true);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const today = todayEAT();
    const yesterday = (() => {
        const d = new Date(today);
        d.setDate(d.getDate() - 1);
        return d.toISOString().slice(0, 10);
    })();

    const fetchFiles = useCallback(async () => {
        setIsLoadingFiles(true);
        setError(null);
        const result = await apiCall("/api/system/logs");
        setIsLoadingFiles(false);
        if (result.status === 200) {
            setFiles(result.data.files || []);
        } else {
            setError(result.error || "Failed to load log file list.");
        }
    }, [apiCall]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    // Auto-select today's log on load
    useEffect(() => {
        if (files.length > 0 && !selectedFile) {
            const todayFile = files.find(f => f.date === today);
            const firstFile = files[0];
            openFile((todayFile || firstFile).filename);
        }
    }, [files]);

    const openFile = useCallback(async (filename: string) => {
        setSelectedFile(filename);
        setLogContent(null);
        setTruncated(false);
        setIsLoadingContent(true);
        setSearch("");
        const result = await apiCall(`/api/system/logs?file=${encodeURIComponent(filename)}`);
        setIsLoadingContent(false);
        if (result.status === 200) {
            setLogContent(result.data.content || "");
            setTruncated(result.data.truncated || false);
        } else {
            setLogContent(null);
            setError(result.error || "Failed to read log file.");
        }
    }, [apiCall]);

    const filteredLines = logContent
        ? logContent.split("\n").filter(line => !search || line.toLowerCase().includes(search.toLowerCase()))
        : null;

    const getLineClass = (line: string) => {
        if (line.includes("] [ERROR]")) return "text-danger";
        if (line.includes("] [WARN]")) return "text-warning";
        if (line.includes("[server-err]")) return "text-danger";
        return "";
    };

    return (
        <div className="container-fluid p-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h5 className="mb-0 fw-bold">System Logs</h5>
                    <small className="text-muted">Application logs for diagnostics and troubleshooting</small>
                </div>
                <button className="btn btn-outline-secondary btn-sm" onClick={fetchFiles} title="Refresh file list">
                    <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                </button>
            </div>

            {error && (
                <div className="alert alert-danger alert-dismissible">
                    {error}
                    <button type="button" className="btn-close" onClick={() => setError(null)}></button>
                </div>
            )}

            <div className="row g-3">
                {/* File list sidebar */}
                <div className="col-12 col-md-3">
                    <div className="card h-100">
                        <div className="card-header py-2">
                            <small className="fw-semibold text-muted text-uppercase">Log Files</small>
                        </div>
                        <div className="list-group list-group-flush" style={{ overflowY: "auto", maxHeight: "70vh" }}>
                            {isLoadingFiles ? (
                                <div className="list-group-item text-center py-4 text-muted">
                                    <div className="spinner-border spinner-border-sm me-2"></div>
                                    Loading…
                                </div>
                            ) : files.length === 0 ? (
                                <div className="list-group-item text-muted py-4 text-center">
                                    <i className="bi bi-inbox fs-4 d-block mb-2"></i>
                                    No log files found
                                </div>
                            ) : (
                                files.map(f => (
                                    <button
                                        key={f.filename}
                                        type="button"
                                        className={`list-group-item list-group-item-action d-flex justify-content-between align-items-start py-2 px-3 ${selectedFile === f.filename ? "active" : ""}`}
                                        onClick={() => openFile(f.filename)}
                                    >
                                        <div>
                                            <div className="fw-medium small">
                                                {f.date === today && <span className="badge bg-success me-1">Today</span>}
                                                {f.date === yesterday && <span className="badge bg-secondary me-1">Yesterday</span>}
                                                {f.date}
                                            </div>
                                            <div className="text-muted" style={{ fontSize: "0.72rem" }}>{formatBytes(f.sizeBytes)}</div>
                                        </div>
                                        <i className="bi bi-chevron-right small mt-1"></i>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Log content panel */}
                <div className="col-12 col-md-9">
                    <div className="card">
                        <div className="card-header py-2 d-flex justify-content-between align-items-center gap-2">
                            <span className="fw-semibold small text-muted text-uppercase">
                                {selectedFile || "Select a file"}
                            </span>
                            {logContent !== null && (
                                <div className="d-flex align-items-center gap-2 ms-auto">
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        style={{ width: 200 }}
                                        placeholder="Filter lines…"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                    <small className="text-muted text-nowrap">
                                        {filteredLines?.length ?? 0} lines
                                    </small>
                                </div>
                            )}
                        </div>
                        <div className="card-body p-0">
                            {isLoadingContent ? (
                                <div className="text-center py-5 text-muted">
                                    <div className="spinner-border spinner-border-sm me-2"></div>
                                    Loading log…
                                </div>
                            ) : !selectedFile ? (
                                <div className="text-center py-5 text-muted">
                                    <i className="bi bi-journal-text fs-2 d-block mb-2"></i>
                                    Select a log file from the left
                                </div>
                            ) : logContent === null ? (
                                <div className="text-center py-5 text-danger">
                                    <i className="bi bi-exclamation-triangle fs-2 d-block mb-2"></i>
                                    Failed to load log content
                                </div>
                            ) : (
                                <>
                                    {truncated && (
                                        <div className="alert alert-info m-2 py-1 small mb-0">
                                            <i className="bi bi-info-circle me-1"></i>
                                            Showing last 2,000 lines. Download the file for the full log.
                                        </div>
                                    )}
                                    <pre
                                        style={{
                                            fontFamily: "monospace",
                                            fontSize: "0.73rem",
                                            lineHeight: 1.45,
                                            overflowY: "auto",
                                            maxHeight: "68vh",
                                            whiteSpace: "pre-wrap",
                                            wordBreak: "break-all",
                                            margin: 0,
                                            padding: "0.75rem",
                                            background: "#1e1e1e",
                                            color: "#d4d4d4",
                                            borderRadius: "0 0 0.375rem 0.375rem",
                                        }}
                                    >
                                        {filteredLines && filteredLines.length > 0 ? (
                                            filteredLines.map((line, i) => (
                                                <span
                                                    key={i}
                                                    className={getLineClass(line)}
                                                    style={{ display: "block" }}
                                                >
                                                    {line}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-muted">
                                                {search ? "No lines match the filter." : "Log file is empty."}
                                            </span>
                                        )}
                                    </pre>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LogsPage() {
    return (
        <RoleAwareLayout>
            <LogsContent />
        </RoleAwareLayout>
    );
}

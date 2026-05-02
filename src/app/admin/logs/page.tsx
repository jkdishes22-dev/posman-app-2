"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
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

function getLineVariant(line: string): React.CSSProperties {
    if (line.includes("] [ERROR]") || line.includes("[server-err]")) return { color: "#f48771" };
    if (line.includes("] [WARN]")) return { color: "#dcdcaa" };
    return {};
}

function LogsContent() {
    const apiCall = useApiCall();

    const [files, setFiles] = useState<LogFile[]>([]);
    const [retentionDays, setRetentionDays] = useState(14);
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [logContent, setLogContent] = useState<string | null>(null);
    const [truncated, setTruncated] = useState(false);
    const [totalLines, setTotalLines] = useState(0);
    const [isLoadingFiles, setIsLoadingFiles] = useState(true);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [listError, setListError] = useState<string | null>(null);
    const [contentError, setContentError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [savingRetention, setSavingRetention] = useState(false);
    const [retentionInput, setRetentionInput] = useState("14");
    const [retentionSaved, setRetentionSaved] = useState(false);
    const logPaneRef = useRef<HTMLPreElement>(null);

    const today = todayEAT();

    const availableDates = new Set(files.map(f => f.date));

    const fetchFiles = useCallback(async () => {
        setIsLoadingFiles(true);
        setListError(null);
        const result = await apiCall("/api/system/logs");
        setIsLoadingFiles(false);
        if (result.status === 200) {
            const data = result.data;
            setFiles(data.files || []);
            setRetentionDays(data.retentionDays ?? 14);
            setRetentionInput(String(data.retentionDays ?? 14));
        } else {
            setListError(result.error || "Failed to load log file list.");
        }
    }, [apiCall]);

    useEffect(() => { fetchFiles(); }, [fetchFiles]);

    // Auto-open today's log (or latest available) after file list loads
    useEffect(() => {
        if (files.length > 0 && !selectedDate) {
            const defaultDate = files.find(f => f.date === today)?.date ?? files[0].date;
            setSelectedDate(defaultDate);
        }
    }, [files]);

    // Load log content whenever selected date changes
    useEffect(() => {
        if (!selectedDate) return;
        const filename = `app-${selectedDate}.log`;
        if (!availableDates.has(selectedDate)) {
            setLogContent(null);
            setContentError(null);
            return;
        }
        setLogContent(null);
        setContentError(null);
        setTruncated(false);
        setSearch("");
        setIsLoadingContent(true);
        apiCall(`/api/system/logs?file=${encodeURIComponent(filename)}`).then(result => {
            setIsLoadingContent(false);
            if (result.status === 200) {
                setLogContent(result.data.content ?? "");
                setTruncated(result.data.truncated ?? false);
                setTotalLines(result.data.totalLines ?? 0);
            } else {
                setContentError(result.error || "Failed to read log file.");
            }
        });
    }, [selectedDate]);

    // Scroll to bottom of log pane when content loads
    useEffect(() => {
        if (logContent && logPaneRef.current) {
            logPaneRef.current.scrollTop = logPaneRef.current.scrollHeight;
        }
    }, [logContent]);

    const handleRetentionSave = async () => {
        const days = Number(retentionInput);
        if (!Number.isFinite(days) || days < 1 || days > 365) return;
        setSavingRetention(true);
        const result = await apiCall("/api/system/settings?key=log_settings", {
            method: "PUT",
            body: JSON.stringify({ retention_days: days }),
        });
        setSavingRetention(false);
        if (result.status === 200) {
            setRetentionDays(days);
            setRetentionSaved(true);
            setTimeout(() => setRetentionSaved(false), 3000);
            fetchFiles(); // re-list with new window
        }
    };

    const filteredLines = logContent
        ? logContent.split("\n").filter(line => !search || line.toLowerCase().includes(search.toLowerCase()))
        : null;

    const selectedFileMeta = files.find(f => f.date === selectedDate);

    return (
        <div className="container-fluid p-3" style={{ minHeight: "100vh" }}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
                <div>
                    <h5 className="mb-0 fw-bold">System Logs</h5>
                    <small className="text-muted">Application logs for diagnostics and troubleshooting</small>
                </div>
                <button className="btn btn-outline-secondary btn-sm" onClick={fetchFiles} disabled={isLoadingFiles}>
                    <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                </button>
            </div>

            {listError && (
                <div className="alert alert-danger alert-dismissible">
                    {listError}
                    <button type="button" className="btn-close" onClick={() => setListError(null)}></button>
                </div>
            )}

            <div className="row g-3">
                {/* Left panel: date picker + available dates */}
                <div className="col-12 col-md-3">
                    <div className="card mb-3">
                        <div className="card-header py-2">
                            <small className="fw-semibold text-muted text-uppercase">Select Date</small>
                        </div>
                        <div className="card-body p-2">
                            {/* Native date picker — works great on touch screens */}
                            <input
                                type="date"
                                className="form-control form-control-sm mb-3"
                                value={selectedDate}
                                max={today}
                                onChange={e => setSelectedDate(e.target.value)}
                            />

                            {isLoadingFiles ? (
                                <div className="text-center py-3 text-muted small">
                                    <div className="spinner-border spinner-border-sm me-1"></div> Loading…
                                </div>
                            ) : files.length === 0 ? (
                                <div className="text-center text-muted small py-2">
                                    <i className="bi bi-inbox d-block fs-4 mb-1"></i>
                                    No log files found
                                </div>
                            ) : (
                                <>
                                    <div className="small text-muted mb-2">
                                        {files.length} file{files.length !== 1 ? "s" : ""} in last {retentionDays} days
                                    </div>
                                    <div className="d-flex flex-column gap-1" style={{ maxHeight: "50vh", overflowY: "auto" }}>
                                        {files.map(f => (
                                            <button
                                                key={f.date}
                                                type="button"
                                                className={`btn btn-sm text-start d-flex justify-content-between align-items-center px-2 py-1 ${
                                                    selectedDate === f.date
                                                        ? "btn-primary"
                                                        : "btn-outline-secondary"
                                                }`}
                                                onClick={() => setSelectedDate(f.date)}
                                            >
                                                <span>
                                                    {f.date === today && (
                                                        <span className={`badge me-1 ${selectedDate === f.date ? "bg-light text-primary" : "bg-success"}`}>Today</span>
                                                    )}
                                                    {f.date}
                                                </span>
                                                <span className={`small ${selectedDate === f.date ? "text-white-50" : "text-muted"}`}>
                                                    {formatBytes(f.sizeBytes)}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Retention setting */}
                    <div className="card">
                        <div className="card-header py-2">
                            <small className="fw-semibold text-muted text-uppercase">Log Retention</small>
                        </div>
                        <div className="card-body p-2">
                            <label className="form-label small mb-1">Days to keep log files</label>
                            <div className="input-group input-group-sm">
                                <input
                                    type="number"
                                    className="form-control"
                                    min={1}
                                    max={365}
                                    value={retentionInput}
                                    onChange={e => setRetentionInput(e.target.value)}
                                />
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={handleRetentionSave}
                                    disabled={savingRetention || Number(retentionInput) === retentionDays}
                                >
                                    {savingRetention ? <span className="spinner-border spinner-border-sm"></span> : "Save"}
                                </button>
                            </div>
                            {retentionSaved && (
                                <div className="text-success small mt-1">
                                    <i className="bi bi-check-circle me-1"></i>Saved. Files older than {retentionDays} days will be removed.
                                </div>
                            )}
                            <div className="text-muted small mt-1">
                                Files older than {retentionDays} day{retentionDays !== 1 ? "s" : ""} are deleted automatically.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right panel: log content */}
                <div className="col-12 col-md-9">
                    <div className="card h-100">
                        <div className="card-header py-2 d-flex align-items-center gap-2 flex-wrap">
                            <span className="fw-semibold small text-muted text-uppercase me-auto">
                                {selectedDate
                                    ? `${selectedDate}${selectedFileMeta ? ` — ${formatBytes(selectedFileMeta.sizeBytes)}` : " (no file)"}`
                                    : "Select a date"}
                            </span>
                            {logContent !== null && (
                                <>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        style={{ width: 200 }}
                                        placeholder="Filter lines…"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                    <small className="text-muted text-nowrap">
                                        {filteredLines?.length ?? 0} / {totalLines} lines
                                    </small>
                                </>
                            )}
                        </div>

                        <div className="card-body p-0">
                            {isLoadingContent ? (
                                <div className="text-center py-5 text-muted">
                                    <div className="spinner-border spinner-border-sm me-2"></div>Loading log…
                                </div>
                            ) : !selectedDate ? (
                                <div className="text-center py-5 text-muted">
                                    <i className="bi bi-calendar-date fs-2 d-block mb-2"></i>
                                    Pick a date to view its log
                                </div>
                            ) : !availableDates.has(selectedDate) ? (
                                <div className="text-center py-5 text-muted">
                                    <i className="bi bi-journal-x fs-2 d-block mb-2"></i>
                                    No log file for {selectedDate}
                                </div>
                            ) : contentError ? (
                                <div className="text-center py-5 text-danger">
                                    <i className="bi bi-exclamation-triangle fs-2 d-block mb-2"></i>
                                    {contentError}
                                </div>
                            ) : (
                                <>
                                    {truncated && (
                                        <div className="alert alert-info m-2 py-1 small mb-0 rounded-1">
                                            <i className="bi bi-info-circle me-1"></i>
                                            Showing last 2,000 of {totalLines.toLocaleString()} lines.
                                        </div>
                                    )}
                                    <pre
                                        ref={logPaneRef}
                                        style={{
                                            fontFamily: "'Cascadia Code', 'Consolas', monospace",
                                            fontSize: "0.72rem",
                                            lineHeight: 1.5,
                                            overflowY: "auto",
                                            height: "70vh",
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
                                                <span key={i} style={{ display: "block", ...getLineVariant(line) }}>
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

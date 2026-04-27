"use client";

import React, { useState } from "react";
import { Modal, Button, Form, Alert, Spinner, Table, Badge } from "react-bootstrap";
import { useApiCall } from "../utils/apiUtils";
import { ApiErrorResponse } from "../utils/errorUtils";
import ErrorDisplay from "./ErrorDisplay";
import UploadPreview from "./UploadPreview";
import SmartMatchSuggestions from "./SmartMatchSuggestions";

type Step = "select" | "review" | "result";

interface PricelistUploadModalProps {
  pricelistId: number;
  show: boolean;
  onHide: () => void;
  onUploadComplete: () => void;
}

/**
 * Parses a validation error string like "Row 3: ..." and returns { row, message }.
 * Falls back to { row: null, message: full string } for non-row errors.
 */
function parseError(err: string): { row: number | null; message: string } {
  const match = err.match(/^Row (\d+):\s*(.+)$/i);
  if (match) {
    return { row: parseInt(match[1], 10), message: match[2] };
  }
  return { row: null, message: err };
}

export default function PricelistUploadModal({
  pricelistId,
  show,
  onHide,
  onUploadComplete,
}: PricelistUploadModalProps) {
  const [step, setStep] = useState<Step>("select");
  const [file, setFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [userConfirmations, setUserConfirmations] = useState<Map<number, "create" | "update" | "skip">>(new Map());
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const apiCall = useApiCall();

  const getNetworkErrorDetails = (message?: string): ApiErrorResponse => ({
    message: message || "Network error occurred",
    networkError: true,
    status: 0,
  });

  const getSafeErrorMessage = (fallback: string, error?: unknown): string => {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return fallback;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setValidationResult(null);
      setUserConfirmations(new Map());
      setError(null);
      setErrorDetails(null);
    }
  };

  const handleValidate = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setValidating(true);
    setError(null);
    setErrorDetails(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await apiCall(`/api/menu/pricelists/${pricelistId}/upload/validate`, {
        method: "POST",
        body: formData,
      });

      if (result.status === 200) {
        setValidationResult(result.data);

        // Pre-populate confirmations: update for matches, create for new items
        const confirmations = new Map<number, "create" | "update" | "skip">();
        (result.data.rows || []).forEach((_: any, index: number) => {
          const match = result.data.rowMatches?.[index];
          confirmations.set(index, match?.itemId ? "update" : "create");
        });
        setUserConfirmations(confirmations);

        if (result.data.valid) {
          setStep("review");
        }
        // If not valid, stay on "select" and show errors below the file input
      } else {
        setError(result.error || "Failed to validate file");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: unknown) {
      const message = getSafeErrorMessage("Network error occurred", error);
      setError(message);
      setErrorDetails(getNetworkErrorDetails(message));
    } finally {
      setValidating(false);
    }
  };

  const handleConfirmationChange = (index: number, action: "create" | "update" | "skip") => {
    const newConfirmations = new Map(userConfirmations);
    newConfirmations.set(index, action);
    setUserConfirmations(newConfirmations);
  };

  const handleUpload = async () => {
    if (!validationResult) return;

    setUploading(true);
    setUploadError(null);

    try {
      // Send rows + confirmations only (not the full validationResult — Maps can't round-trip JSON)
      const userConfirmationsArray = Array.from(userConfirmations.entries()).map(([index, action]) => ({
        index,
        action,
        // Pass the matched item ID so the server knows which item to update
        matchedItemId:
          action === "update"
            ? (validationResult.rowMatches?.[index]?.itemId ?? null)
            : null,
      }));

      const result = await apiCall(`/api/menu/pricelists/${pricelistId}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: validationResult.rows,
          userConfirmations: userConfirmationsArray,
        }),
      });

      if (result.status === 200) {
        setUploadResult(result.data);
        setStep("result");
        onUploadComplete();
      } else {
        setUploadError(result.error || "Upload failed — no items were saved");
        setErrorDetails(result.errorDetails || null);
      }
    } catch (error: unknown) {
      const message = getSafeErrorMessage("Network error — no items were saved", error);
      setUploadError(message);
      setErrorDetails(getNetworkErrorDetails(message));
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    setError(null);
    setErrorDetails(null);
    try {
      const result = await apiCall(`/api/menu/pricelists/${pricelistId}/upload/template`, {
        method: "GET",
        headers: {
          Accept: "text/csv",
        },
      });

      if (result.status !== 200) {
        setError(result.error || "Failed to download template");
        setErrorDetails(result.errorDetails || null);
        return;
      }

      const templateContent =
        typeof result.data === "string"
          ? result.data
          : typeof result.data?.error === "string"
            ? result.data.error
            : null;

      if (!templateContent) {
        setError("Template content was empty");
        setErrorDetails({ message: "Template content was empty", status: 500 });
        return;
      }

      const blob = new Blob([templateContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "pricelist-upload-template.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      const message = getSafeErrorMessage("Failed to download template", error);
      setError(message);
      setErrorDetails(getNetworkErrorDetails(message));
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleBack = () => {
    setStep("select");
    setValidationResult(null);
    setUserConfirmations(new Map());
    setUploadError(null);
  };

  const handleClose = () => {
    setStep("select");
    setFile(null);
    setValidationResult(null);
    setUserConfirmations(new Map());
    setUploadResult(null);
    setUploadError(null);
    setError(null);
    setErrorDetails(null);
    onHide();
  };

  // Count non-skipped rows
  const activeRowCount = Array.from(userConfirmations.values()).filter(a => a !== "skip").length;

  const stepLabel = { select: "1. Select File", review: "2. Review & Confirm", result: "3. Done" };

  return (
    <Modal show={show} onHide={handleClose} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>
          Upload Pricelist Items
          <small className="text-muted ms-3 fs-6 fw-normal">{stepLabel[step]}</small>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* ── Step 1: File Selection ── */}
        {step === "select" && (
          <div>
            <div className="d-flex justify-content-between align-items-start mb-3">
              <p className="text-muted mb-0">
                Upload a CSV or Excel file to add or update items on this pricelist.
              </p>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
                className="ms-3 flex-shrink-0"
              >
                {downloadingTemplate ? (
                  <><Spinner animation="border" size="sm" className="me-1" />Downloading…</>
                ) : (
                  <><i className="bi bi-download me-1" />Download Template</>
                )}
              </Button>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Select File (CSV, XLS, XLSX)</Form.Label>
              <Form.Control
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileChange}
              />
              <Form.Text className="text-muted">
                Supported formats: CSV, XLS, XLSX · Maximum file size: 10 MB
              </Form.Text>
            </Form.Group>

            <ErrorDisplay
              error={error}
              errorDetails={errorDetails}
              onDismiss={() => { setError(null); setErrorDetails(null); }}
            />

            {/* Structured validation error table */}
            {validationResult && !validationResult.valid && validationResult.errors?.length > 0 && (
              <Alert variant="danger" className="mt-3">
                <Alert.Heading>
                  <i className="bi bi-exclamation-triangle-fill me-2" />
                  {validationResult.errors.length} validation error{validationResult.errors.length !== 1 ? "s" : ""} found
                </Alert.Heading>
                <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                  <Table size="sm" bordered className="mb-0 mt-2">
                    <thead>
                      <tr>
                        <th style={{ width: "60px" }}>Row</th>
                        <th>Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationResult.errors.map((err: string, idx: number) => {
                        const parsed = parseError(err);
                        return (
                          <tr key={idx}>
                            <td className="text-center">
                              {parsed.row != null ? (
                                <Badge bg="danger">{parsed.row}</Badge>
                              ) : "—"}
                            </td>
                            <td>{parsed.message}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
                <p className="mb-0 mt-2 small text-muted">
                  Fix the errors in your file and upload again.
                </p>
              </Alert>
            )}
          </div>
        )}

        {/* ── Step 2: Review & Confirm ── */}
        {step === "review" && validationResult && (
          <div>
            {validationResult.warnings?.length > 0 && (
              <Alert variant="warning" className="mb-3">
                <i className="bi bi-info-circle-fill me-2" />
                <strong>{validationResult.warnings.length} notice{validationResult.warnings.length !== 1 ? "s" : ""}:</strong>{" "}
                {validationResult.warnings.length === 1
                  ? validationResult.warnings[0]
                  : `${validationResult.warnings.filter((w: string) => w.includes("create new")).length} rows will create new items; ${validationResult.warnings.filter((w: string) => w.includes("confidence")).length} rows have low-confidence matches.`}
              </Alert>
            )}

            {uploadError && (
              <Alert variant="danger" className="mb-3">
                <Alert.Heading>
                  <i className="bi bi-x-circle-fill me-2" />
                  Upload failed — no items were saved
                </Alert.Heading>
                <p className="mb-0">{uploadError}</p>
                <p className="mb-0 mt-1 small text-muted">
                  Because uploads are all-or-nothing, no data has changed. Fix the issue and try again.
                </p>
              </Alert>
            )}

            <UploadPreview
              validationResult={validationResult}
              userConfirmations={userConfirmations}
              onConfirmationChange={handleConfirmationChange}
            />
            <SmartMatchSuggestions
              validationResult={validationResult}
              userConfirmations={userConfirmations}
              onConfirmationChange={handleConfirmationChange}
            />

            <p className="text-muted small mt-2 mb-0">
              <i className="bi bi-shield-check me-1" />
              This upload is <strong>all-or-nothing</strong> — if any row fails, nothing will be saved.
            </p>
          </div>
        )}

        {/* ── Step 3: Result ── */}
        {step === "result" && uploadResult && (
          <Alert variant="success">
            <Alert.Heading>
              <i className="bi bi-check-circle-fill me-2" />
              Upload complete
            </Alert.Heading>
            <Table size="sm" borderless className="mb-0 mt-2">
              <tbody>
                <tr>
                  <td><Badge bg="success">Created</Badge></td>
                  <td><strong>{uploadResult.created}</strong> items</td>
                </tr>
                <tr>
                  <td><Badge bg="primary">Updated</Badge></td>
                  <td><strong>{uploadResult.updated}</strong> items</td>
                </tr>
                <tr>
                  <td><Badge bg="secondary">Skipped</Badge></td>
                  <td><strong>{uploadResult.skipped}</strong> items</td>
                </tr>
              </tbody>
            </Table>
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer>
        {step === "select" && (
          <>
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleValidate}
              disabled={!file || validating}
            >
              {validating ? (
                <><Spinner animation="border" size="sm" className="me-2" />Validating…</>
              ) : (
                "Validate File"
              )}
            </Button>
          </>
        )}

        {step === "review" && (
          <>
            <Button variant="outline-secondary" onClick={handleBack} disabled={uploading}>
              <i className="bi bi-arrow-left me-1" />Back
            </Button>
            <Button variant="secondary" onClick={handleClose} disabled={uploading}>Cancel</Button>
            <Button
              variant="success"
              onClick={handleUpload}
              disabled={uploading || activeRowCount === 0}
            >
              {uploading ? (
                <><Spinner animation="border" size="sm" className="me-2" />Uploading…</>
              ) : (
                `Upload All (${activeRowCount} item${activeRowCount !== 1 ? "s" : ""})`
              )}
            </Button>
          </>
        )}

        {step === "result" && (
          <Button variant="primary" onClick={handleClose}>Done</Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

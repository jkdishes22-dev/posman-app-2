"use client";

import React, { useState } from "react";
import { Modal, Button, Form, Alert, Spinner } from "react-bootstrap";
import { useApiCall } from "../utils/apiUtils";
import { ApiErrorResponse } from "../utils/errorUtils";
import ErrorDisplay from "./ErrorDisplay";
import UploadPreview from "./UploadPreview";
import SmartMatchSuggestions from "./SmartMatchSuggestions";

interface PricelistUploadModalProps {
  pricelistId: number;
  show: boolean;
  onHide: () => void;
  onUploadComplete: () => void;
}

export default function PricelistUploadModal({
  pricelistId,
  show,
  onHide,
  onUploadComplete,
}: PricelistUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [userConfirmations, setUserConfirmations] = useState<Map<number, "create" | "update" | "skip">>(new Map());
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const apiCall = useApiCall();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setValidationResult(null);
      setUserConfirmations(new Map());
      setUploadResult(null);
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
        // Initialize confirmations - default to "update" for matches, "create" for new items
        const confirmations = new Map<number, "create" | "update" | "skip">();
        result.data.rows.forEach((row: any, index: number) => {
          const match = result.data.matchedItems.get(index);
          if (match && match.item) {
            confirmations.set(index, "update");
          } else {
            confirmations.set(index, "create");
          }
        });
        setUserConfirmations(confirmations);
      } else {
        setError(result.error || "Failed to validate file");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ networkError: true, status: 0 });
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
    if (!validationResult) {
      setError("Please validate the file first");
      return;
    }

    setUploading(true);
    setError(null);
    setErrorDetails(null);

    try {
      // Convert Map to array format for JSON
      const confirmationsArray = Array.from(userConfirmations.entries()).map(([index, action]) => ({
        index,
        action,
      }));

      const result = await apiCall(`/api/menu/pricelists/${pricelistId}/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          validationResult,
          userConfirmations: confirmationsArray,
        }),
      });

      if (result.status === 200) {
        setUploadResult(result.data);
        onUploadComplete();
        // Close modal after 2 seconds
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setError(result.error || "Failed to upload items");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ networkError: true, status: 0 });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setValidationResult(null);
    setUserConfirmations(new Map());
    setUploadResult(null);
    setError(null);
    setErrorDetails(null);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>Upload Pricelist Items</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ErrorDisplay
          error={error}
          errorDetails={errorDetails}
          onDismiss={() => {
            setError(null);
            setErrorDetails(null);
          }}
        />

        {uploadResult && (
          <Alert variant="success">
            <Alert.Heading>Upload Complete!</Alert.Heading>
            <p>
              Created: {uploadResult.created}, Updated: {uploadResult.updated}, Skipped: {uploadResult.skipped}
            </p>
            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div>
                <strong>Errors:</strong>
                <ul>
                  {uploadResult.errors.map((err: string, idx: number) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </Alert>
        )}

        {!validationResult && !uploadResult && (
          <div>
            <Form.Group className="mb-3">
              <Form.Label>Select File (CSV, XLS, XLSX)</Form.Label>
              <Form.Control
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileChange}
              />
              <Form.Text className="text-muted">
                Supported formats: CSV, XLS, XLSX. Maximum file size: 10MB
              </Form.Text>
            </Form.Group>

            <Button
              variant="primary"
              onClick={handleValidate}
              disabled={!file || validating}
            >
              {validating ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Validating...
                </>
              ) : (
                "Validate File"
              )}
            </Button>
          </div>
        )}

        {validationResult && !uploadResult && (
          <div>
            {validationResult.errors && validationResult.errors.length > 0 && (
              <Alert variant="danger">
                <Alert.Heading>Validation Errors</Alert.Heading>
                <ul>
                  {validationResult.errors.map((err: string, idx: number) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {validationResult.warnings && validationResult.warnings.length > 0 && (
              <Alert variant="warning">
                <Alert.Heading>Warnings</Alert.Heading>
                <ul>
                  {validationResult.warnings.map((warn: string, idx: number) => (
                    <li key={idx}>{warn}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {validationResult.valid && (
              <>
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
              </>
            )}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
        {validationResult && validationResult.valid && !uploadResult && (
          <Button
            variant="primary"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Uploading...
              </>
            ) : (
              "Upload Items"
            )}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}


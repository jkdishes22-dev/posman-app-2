"use client";

import React, { useEffect, useState } from "react";
import { Modal, Table, Badge, Spinner } from "react-bootstrap";
import { useApiCall } from "../utils/apiUtils";
import { ApiErrorResponse } from "../utils/errorUtils";
import ErrorDisplay from "./ErrorDisplay";

interface AuditLogEntry {
  id: number;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: number | null;
  changed_by_user?: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  };
  changed_at: string;
  change_reason: string | null;
}

interface ItemAuditLogProps {
  itemId: number;
  show: boolean;
  onHide: () => void;
}

export default function ItemAuditLog({
  itemId,
  show,
  onHide,
}: ItemAuditLogProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const apiCall = useApiCall();

  useEffect(() => {
    if (show && itemId) {
      fetchAuditLogs();
    }
  }, [show, itemId]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);
    setErrorDetails(null);

    try {
      const result = await apiCall(`/api/menu/items/${itemId}/audit`);
      if (result.status === 200) {
        setAuditLogs(result.data || []);
      } else {
        setError(result.error || "Failed to fetch audit logs");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ networkError: true, status: 0 });
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: string | null): string => {
    if (value === null || value === undefined) {
      return "(empty)";
    }
    return String(value);
  };

  const formatUserName = (user: any): string => {
    if (!user) return "Unknown";
    return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "Unknown";
  };

  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>Audit Log - Item #{itemId}</Modal.Title>
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

        {loading ? (
          <div className="text-center p-4">
            <Spinner animation="border" />
          </div>
        ) : (
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Field</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>Changed By</th>
                <th>Changed At</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <code>{log.field_name}</code>
                    </td>
                    <td>{formatValue(log.old_value)}</td>
                    <td>{formatValue(log.new_value)}</td>
                    <td>{formatUserName(log.changed_by_user)}</td>
                    <td>{new Date(log.changed_at).toLocaleString()}</td>
                    <td>{log.change_reason || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-secondary" onClick={onHide}>
          Close
        </button>
      </Modal.Footer>
    </Modal>
  );
}


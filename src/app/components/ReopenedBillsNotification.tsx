"use client";

import React, { useState, useEffect } from "react";
import { Button, Badge, Alert, Collapse } from "react-bootstrap";
import { useApiCall } from "../utils/apiUtils";
import ErrorDisplay from "./ErrorDisplay";

interface ReopenedBill {
  id: number;
  total: number;
  reopen_reason: string;
  reopened_at: string;
  created_at: string;
}

interface ReopenedBillsNotificationProps {
  onBillClick: (billId: number) => void;
}

const ReopenedBillsNotification: React.FC<ReopenedBillsNotificationProps> = ({ onBillClick }) => {
  const [reopenedBills, setReopenedBills] = useState<ReopenedBill[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const apiCall = useApiCall();

  const fetchReopenedBills = async () => {
    setIsLoading(true);
    try {
      const result = await apiCall("/api/bills?status=reopened&pageSize=10");
      if (result.status === 200) {
        setReopenedBills(result.data.bills || []);
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to fetch reopened bills");
        setErrorDetails(result.errorDetails);
      }
    } catch (error) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReopenedBills();
  }, [apiCall]);

  if (reopenedBills.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="mb-3">
      <Alert 
        variant="warning" 
        className="mb-0"
        style={{ cursor: "pointer" }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <strong>Reopened Bills Requiring Attention</strong>
            <Badge bg="danger" className="ms-2">
              {reopenedBills.length}
            </Badge>
          </div>
          <i className={`bi bi-chevron-${isExpanded ? "up" : "down"}`}></i>
        </div>
      </Alert>

      <Collapse in={isExpanded}>
        <div className="card">
          <div className="card-body">
            <ErrorDisplay
              error={error}
              errorDetails={errorDetails}
              onDismiss={() => {
                setError(null);
                setErrorDetails(null);
              }}
            />
            
            {isLoading ? (
              <div className="text-center">
                <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
                Loading reopened bills...
              </div>
            ) : (
              <div className="row">
                {reopenedBills.map((bill) => (
                  <div key={bill.id} className="col-md-6 col-lg-4 mb-3">
                    <div className="card border-warning">
                      <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h6 className="card-title mb-0">Bill #{bill.id}</h6>
                          <Badge bg="warning" text="dark">
                            KES {bill.total}
                          </Badge>
                        </div>
                        <p className="card-text small text-muted mb-2">
                          <strong>Reason:</strong> {bill.reopen_reason}
                        </p>
                        <p className="card-text small text-muted mb-3">
                          <strong>Reopened:</strong> {new Date(bill.reopened_at).toLocaleString()}
                        </p>
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() => onBillClick(bill.id)}
                          className="w-100"
                        >
                          <i className="bi bi-arrow-clockwise me-1"></i>
                          Resubmit Bill
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Collapse>
    </div>
  );
};

export default ReopenedBillsNotification;

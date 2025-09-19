"use client";

import RoleAwareLayout from "../../shared/RoleAwareLayout";
import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import ErrorDisplay from "../../components/ErrorDisplay";
import { useApiCall } from "../../utils/apiUtils";

interface VoidRequest {
  id: number;
  billId: number;
  itemId: number;
  reason: string;
  status: string;
  requestedBy: {
    firstName: string;
    lastName: string;
  };
  requestedAt: string;
  bill: {
    id: number;
    total: number;
    status: string;
  };
  item: {
    name: string;
    quantity: number;
    price: number;
  };
}

export default function SupervisorVoidRequestsPage() {
  const [voidRequests, setVoidRequests] = useState<VoidRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [processingRequest, setProcessingRequest] = useState<number | null>(null);
  const apiCall = useApiCall();

  useEffect(() => {
    fetchVoidRequests();
  }, []);

  const fetchVoidRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);

      const result = await apiCall("/api/bills/void-requests");
      if (result.status === 200) {
        setVoidRequests(result.data.requests || []);
      } else {
        setError(result.error || "Failed to fetch void requests");
        setErrorDetails(result.errorDetails || null);
      }
    } catch (error) {
      setError("Network error occurred");
      setErrorDetails({ networkError: true, status: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveVoid = async (requestId: number, billId: number, itemId: number) => {
    try {
      setProcessingRequest(requestId);
      const result = await apiCall(`/api/bills/${billId}/items/${itemId}/void-approve`, {
        method: "POST",
        body: JSON.stringify({ approved: true })
      });

      if (result.status === 200) {
        await fetchVoidRequests();
      } else {
        setError(result.error || "Failed to approve void request");
        setErrorDetails(result.errorDetails || null);
      }
    } catch (error) {
      setError("Network error occurred");
      setErrorDetails({ networkError: true, status: 0 });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectVoid = async (requestId: number, billId: number, itemId: number) => {
    try {
      setProcessingRequest(requestId);
      const result = await apiCall(`/api/bills/${billId}/items/${itemId}/void-approve`, {
        method: "POST",
        body: JSON.stringify({ approved: false })
      });

      if (result.status === 200) {
        await fetchVoidRequests();
      } else {
        setError(result.error || "Failed to reject void request");
        setErrorDetails(result.errorDetails || null);
      }
    } catch (error) {
      setError("Network error occurred");
      setErrorDetails({ networkError: true, status: 0 });
    } finally {
      setProcessingRequest(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: "bg-warning",
      approved: "bg-success",
      rejected: "bg-danger"
    };

    return (
      <span className={`badge ${statusClasses[status] || "bg-secondary"}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="h3 mb-0">Void Requests Management</h1>
            <p className="text-muted">Review and approve/reject item void requests as supervisor fallback</p>
          </div>
        </div>

        {/* Error Display */}
        <ErrorDisplay
          error={error}
          errorDetails={errorDetails}
          onDismiss={() => {
            setError(null);
            setErrorDetails(null);
          }}
        />

        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Pending Void Requests</h5>
                <Button
                  variant="outline-primary"
                  onClick={fetchVoidRequests}
                  disabled={loading}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Refresh
                </Button>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="text-center">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Request ID</th>
                          <th>Bill ID</th>
                          <th>Item</th>
                          <th>Quantity</th>
                          <th>Price</th>
                          <th>Reason</th>
                          <th>Requested By</th>
                          <th>Requested At</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {voidRequests.map((request) => (
                          <tr key={request.id}>
                            <td>{request.id}</td>
                            <td>
                              <a href={`/home/cashier/bills?billId=${request.billId}`} className="text-decoration-none">
                                #{request.billId}
                              </a>
                            </td>
                            <td>{request.item.name}</td>
                            <td>{request.item.quantity}</td>
                            <td>${request.item.price.toFixed(2)}</td>
                            <td>{request.reason}</td>
                            <td>{request.requestedBy.firstName} {request.requestedBy.lastName}</td>
                            <td>{new Date(request.requestedAt).toLocaleString()}</td>
                            <td>{getStatusBadge(request.status)}</td>
                            <td>
                              {request.status === "pending" && (
                                <div className="btn-group" role="group">
                                  <Button
                                    variant="success"
                                    size="sm"
                                    onClick={() => handleApproveVoid(request.id, request.billId, request.itemId)}
                                    disabled={processingRequest === request.id}
                                  >
                                    {processingRequest === request.id ? (
                                      <span className="spinner-border spinner-border-sm me-1"></span>
                                    ) : (
                                      <i className="bi bi-check me-1"></i>
                                    )}
                                    Approve
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleRejectVoid(request.id, request.billId, request.itemId)}
                                    disabled={processingRequest === request.id}
                                  >
                                    {processingRequest === request.id ? (
                                      <span className="spinner-border spinner-border-sm me-1"></span>
                                    ) : (
                                      <i className="bi bi-x me-1"></i>
                                    )}
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {voidRequests.length === 0 && (
                      <div className="text-center text-muted py-4">
                        <i className="bi bi-inbox fs-1"></i>
                        <p className="mt-2">No void requests found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleAwareLayout>
  );
}

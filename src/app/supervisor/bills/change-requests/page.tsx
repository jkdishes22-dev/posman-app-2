"use client";

import { useState, useEffect } from "react";
import { todayEAT } from "src/app/shared/eatDate";
import FilterDatePicker from "src/app/shared/FilterDatePicker";
import { dateToYmdEat, ymdToDateEat } from "src/app/shared/filterDateUtils";
import { Bill } from "src/app/types/types";
import { Modal, Button, Form, Badge } from "react-bootstrap";
import Pagination from "src/app/components/Pagination";
import { useApiCall } from "src/app/utils/apiUtils";
import { ApiErrorResponse } from "src/app/utils/errorUtils";
import ErrorDisplay from "src/app/components/ErrorDisplay";
import CollapsibleFilterSectionCard from "src/app/components/CollapsibleFilterSectionCard";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";

interface ChangeRequest {
  id: number;
  bill_id: number;
  item_id: number;
  type: "void" | "quantity_change";
  initiated_by: number;
  reason: string;
  status: string;
  created_at: string;
  current_quantity?: number;
  requested_quantity?: number;
  current_bill_total?: number;
  new_bill_total?: number;
  initiator: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  };
  bill: {
    id: number;
    total: number;
    status: string;
    created_at: string;
    user: {
      firstName: string;
      lastName: string;
    };
    station: {
      name: string;
    };
  };
  item: {
    id: number;
    name: string;
  };
}

const SupervisorChangeRequestsPage = () => {
  const apiCall = useApiCall();

  // Read requestType from URL params if present
  const getRequestTypeFromUrl = () => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const requestType = urlParams.get("requestType") || "all";
      return ["all", "void", "quantity_change"].includes(requestType) ? requestType : "all";
    }
    return "all";
  };

  const [filters, setFilters] = useState({
    billingDate: ymdToDateEat(todayEAT()) as Date | null,
    status: "pending",
    requestType: getRequestTypeFromUrl(), // "all", "void", "quantity_change"
  });
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);

  // Request approval states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject" | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [paperApprovalReceived, setPaperApprovalReceived] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [approvalErrorDetails, setApprovalErrorDetails] = useState<ApiErrorResponse | null>(null);

  // Update filters when URL params change
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const requestType = urlParams.get("requestType") || "all";
      const validRequestType = ["all", "void", "quantity_change"].includes(requestType) ? requestType : "all";
      if (filters.requestType !== validRequestType) {
        setFilters(prev => ({ ...prev, requestType: validRequestType }));
      }
    }
  }, [filters.requestType]);

  useEffect(() => {
    fetchChangeRequests();
  }, [filters, page]);

  const fetchChangeRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);

      let url = `/api/bills/change-requests?requestType=${filters.requestType}`;
      
      if (filters.billingDate) {
        url += `&date=${dateToYmdEat(filters.billingDate)}`;
      }

      const result = await apiCall(url);

      if (result.status === 200) {
        const requests = result.data.changeRequests || [];
        setChangeRequests(requests);
        setTotal(requests.length);
        
        // Group requests by bill_id for display
        const billIds = [...new Set(requests.map((req: ChangeRequest) => req.bill_id))];
        setTotal(billIds.length);
      } else {
        setError(result.error || "Failed to fetch change requests");
        setErrorDetails(result.errorDetails || null);
        setChangeRequests([]);
        setTotal(0);
      }
    } catch (error) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      setChangeRequests([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchBillById = async (billId: number) => {
    const url = `/api/bills?billId=${billId}`;
    try {
      const result = await apiCall(url);
      if (result.status === 200) {
        setSelectedBill(result.data.bills[0]);
      } else {
        setError(result.error || "Failed to fetch bill details");
        setErrorDetails(result.errorDetails);
      }
    } catch (error) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleRequestApproval = (request: ChangeRequest, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setApprovalAction(action);
    setApprovalNotes("");
    setPaperApprovalReceived(false);
    setApprovalError(null);
    setApprovalErrorDetails(null);
    setShowApprovalModal(true);
  };

  const handleConfirmApproval = async () => {
    if (!selectedRequest || !approvalAction || !selectedBill) {
      return;
    }

    setApprovalLoading(true);
    setApprovalError(null);
    setApprovalErrorDetails(null);

    try {
      const endpoint = selectedRequest.type === "void"
        ? `/api/bills/${selectedBill.id}/items/${selectedRequest.item_id}/void-approve`
        : `/api/bills/${selectedBill.id}/items/${selectedRequest.item_id}/quantity-change-approve`;

      const result = await apiCall(endpoint, {
        method: "POST",
        body: JSON.stringify({
          action: approvalAction,
          approvalNotes: approvalNotes.trim(),
          paperApprovalReceived: paperApprovalReceived
        })
      });

      if (result.status === 200) {
        setShowApprovalModal(false);
        setSelectedRequest(null);
        setApprovalAction(null);
        setApprovalNotes("");
        setPaperApprovalReceived(false);

        // Refresh the bill data to show updated status
        await fetchBillById(selectedBill.id);
        // Also refresh the change requests list
        await fetchChangeRequests();
      } else {
        setApprovalError(result.error || `Failed to process ${selectedRequest.type} request`);
        setApprovalErrorDetails(result.errorDetails);
      }
    } catch (error) {
      setApprovalError("Network error occurred");
      setApprovalErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleCloseApprovalModal = () => {
    setShowApprovalModal(false);
    setSelectedRequest(null);
    setApprovalAction(null);
    setApprovalNotes("");
    setPaperApprovalReceived(false);
    setApprovalError(null);
    setApprovalErrorDetails(null);
  };

  // Group change requests by bill_id
  const billsWithRequests = changeRequests.reduce((acc, request) => {
    const billId = request.bill_id;
    if (!acc[billId]) {
      acc[billId] = {
        bill: request.bill,
        requests: []
      };
    }
    acc[billId].requests.push(request);
    return acc;
  }, {} as Record<number, { bill: ChangeRequest["bill"]; requests: ChangeRequest[] }>);

  const billsList = Object.values(billsWithRequests);
  const paginatedBills = billsList.slice((page - 1) * pageSize, page * pageSize);

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        {/* Error Display */}
        <ErrorDisplay
          error={error}
          errorDetails={errorDetails}
          onDismiss={() => {
            setError(null);
            setErrorDetails(null);
          }}
        />

        {/* Header */}
        <div className="bg-warning text-dark p-3 mb-4">
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Bill Change Requests Management
          </h1>
          <p className="mb-0">Review and approve/reject pending void and quantity change requests from sales team</p>
        </div>

        {/* Filtering Section */}
        <div className="row mb-4">
          <div className="col-12">
            <CollapsibleFilterSectionCard className="card shadow-sm" bodyClassName="card-body">
                <Form
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                  }}
                >
                <div className="row g-3 align-items-end">
                  <div className="col-md-3">
                    <Form.Group>
                      <FilterDatePicker
                        id="billingDate"
                        label="Billing Date"
                        value={filters.billingDate ? dateToYmdEat(filters.billingDate) : ""}
                        onChange={(ymd) =>
                          handleFilterChange("billingDate", ymd ? ymdToDateEat(ymd) : null)
                        }
                        maxDate={new Date()}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-3">
                    <Form.Group>
                      <Form.Label className="fw-semibold">Request Type</Form.Label>
                      <Form.Select
                        value={filters.requestType}
                        onChange={(e) => handleFilterChange("requestType", e.target.value)}
                      >
                        <option value="all">All Requests</option>
                        <option value="void">Void Requests</option>
                        <option value="quantity_change">Quantity Change Requests</option>
                      </Form.Select>
                    </Form.Group>
                  </div>
                  <div className="col-md-3 d-flex align-items-end">
                    <div className="btn-group" role="group" aria-label="Filter actions">
                      <button
                        type="button"
                        className="btn btn-outline-warning btn-sm"
                        onClick={() => handleFilterChange("status", "pending")}
                      >
                        Pending Requests
                      </button>
                    </div>
                  </div>
                </div>
                </Form>
            </CollapsibleFilterSectionCard>
          </div>
        </div>

        {/* Main Content */}
        <div className="row">
          {/* Bills List - Left Column */}
          <div className="col-5">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-light">
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-list-ul me-2 text-primary"></i>
                  Bills with Pending Requests
                </h5>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : paginatedBills.length === 0 ? (
                  <div className="text-center text-muted py-4">
                    <i className="bi bi-check-circle display-4"></i>
                    <p className="mt-2">No bills with pending requests found</p>
                  </div>
                ) : (
                  <>
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>ID</th>
                            <th>STATUS</th>
                            <th>TOTAL</th>
                            <th>CREATED BY</th>
                            <th>PENDING REQUESTS</th>
                            <th>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedBills.map((billData) => {
                            const voidCount = billData.requests.filter(r => r.type === "void").length;
                            const qtyCount = billData.requests.filter(r => r.type === "quantity_change").length;
                            return (
                              <tr
                                key={billData.bill.id}
                                style={{ cursor: "pointer" }}
                                onClick={() => fetchBillById(billData.bill.id)}
                                className={selectedBill?.id === billData.bill.id ? "table-primary" : ""}
                              >
                                <td>{billData.bill.id}</td>
                                <td>
                                  <span className={`badge ${billData.bill.status === "pending" ? "bg-warning" :
                                    billData.bill.status === "reopened" ? "bg-info" : "bg-secondary"
                                    }`}>
                                    {billData.bill.status}
                                  </span>
                                </td>
                                <td>${billData.bill.total}</td>
                                <td>{billData.bill.user.firstName} {billData.bill.user.lastName}</td>
                                <td>
                                  <div className="d-flex gap-1 flex-wrap">
                                    {voidCount > 0 && (
                                      <Badge bg="warning" text="dark">
                                        {voidCount} void
                                      </Badge>
                                    )}
                                    {qtyCount > 0 && (
                                      <Badge bg="info" text="dark">
                                        {qtyCount} qty
                                      </Badge>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <button
                                    className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      fetchBillById(billData.bill.id);
                                    }}
                                    title="View bill details and change requests"
                                  >
                                    <i className="bi bi-eye-fill"></i>
                                    <span>View Details</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {total > pageSize && (
                      <div className="d-flex justify-content-center mt-3">
                        <Pagination
                          page={page}
                          pageSize={pageSize}
                          total={total}
                          onPageChange={setPage}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bill Details - Right Column */}
          <div className="col-7">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-light">
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-receipt me-2 text-primary"></i>
                  Bill Details & Pending Requests
                </h5>
              </div>
              <div className="card-body">
                {selectedBill ? (
                  <div>
                    <h6 className="fw-bold text-primary">Bill Information</h6>
                    <div className="mb-3">
                      <p className="mb-1"><strong>Bill ID:</strong> {selectedBill.id}</p>
                      <p className="mb-1"><strong>Total:</strong> ${selectedBill.total}</p>
                      <p className="mb-1"><strong>Created By:</strong> {selectedBill.user?.firstName} {selectedBill.user?.lastName}</p>
                      <p className="mb-1"><strong>Created At:</strong> {new Date(selectedBill.created_at).toLocaleString()}</p>
                    </div>

                    {/* Bill Items with Pending Requests */}
                    <h6 className="fw-bold text-primary">Items with Pending Requests</h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Subtotal</th>
                            <th>Request Type</th>
                            <th>Reason</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBill.bill_items
                            ?.filter((item: any) => item.status === "void_pending" || item.status === "quantity_change_request")
                            .map((item, index) => {
                              const isVoidRequest = item.status === "void_pending";
                              const isQuantityChangeRequest = item.status === "quantity_change_request";
                              const request = changeRequests.find(r => r.item_id === item.id && r.bill_id === selectedBill.id);
                              return (
                                <tr key={index} className={isVoidRequest ? "table-warning" : "table-info"}>
                                  <td>
                                    <div className="fw-semibold">{item.item.name}</div>
                                  </td>
                                  <td>
                                    {isQuantityChangeRequest && item.requested_quantity ? (
                                      <div>
                                        <div className="text-decoration-line-through text-muted small">
                                          {item.quantity}
                                        </div>
                                        <div className="fw-bold text-primary">
                                          {item.requested_quantity}
                                        </div>
                                      </div>
                                    ) : (
                                      item.quantity
                                    )}
                                  </td>
                                  <td>${((Number(item.subtotal) || 0) / (Number(item.quantity) || 1)).toFixed(2)}</td>
                                  <td>${(Number(item.subtotal) || 0).toFixed(2)}</td>
                                  <td>
                                    <Badge bg={isVoidRequest ? "warning" : "info"} text="dark">
                                      {isVoidRequest ? "Void" : "Qty Change"}
                                    </Badge>
                                  </td>
                                  <td>
                                    <div className="small text-muted">
                                      {isVoidRequest ? item.void_reason : item.quantity_change_reason}
                                    </div>
                                  </td>
                                  <td>
                                    {request && (
                                      <div className="d-flex gap-2">
                                        <button
                                          className="btn btn-success btn-sm d-flex align-items-center gap-1"
                                          onClick={() => handleRequestApproval(request, "approve")}
                                          title={`Approve ${isVoidRequest ? "Void" : "Quantity Change"} Request`}
                                          disabled={approvalLoading}
                                        >
                                          <i className="bi bi-check-circle-fill"></i>
                                          <span className="d-none d-sm-inline">Approve</span>
                                        </button>
                                        <button
                                          className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
                                          onClick={() => handleRequestApproval(request, "reject")}
                                          title={`Reject ${isVoidRequest ? "Void" : "Quantity Change"} Request`}
                                          disabled={approvalLoading}
                                        >
                                          <i className="bi bi-x-circle-fill"></i>
                                          <span className="d-none d-sm-inline">Reject</span>
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted py-5">
                    <i className="bi bi-receipt display-1"></i>
                    <p className="mt-3">Select a bill to see details and pending requests</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Approval Modal */}
        <Modal show={showApprovalModal} onHide={handleCloseApprovalModal} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              {approvalAction === "approve" ? "Approve" : "Reject"} {selectedRequest?.type === "void" ? "Void" : "Quantity Change"} Request
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ErrorDisplay
              error={approvalError}
              errorDetails={approvalErrorDetails}
              onDismiss={() => {
                setApprovalError(null);
                setApprovalErrorDetails(null);
              }}
            />

            {selectedRequest && (
              <div>
                <div className="mb-3">
                  <strong>Bill ID:</strong> {selectedRequest.bill_id}<br />
                  <strong>Item:</strong> {selectedRequest.item.name}<br />
                  <strong>Request Type:</strong> <Badge bg={selectedRequest.type === "void" ? "warning" : "info"} text="dark">
                    {selectedRequest.type === "void" ? "Void" : "Quantity Change"}
                  </Badge><br />
                  <strong>Reason:</strong> {selectedRequest.reason}
                </div>

                <Form.Group className="mb-3">
                  <Form.Label>Approval Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Enter any notes about this approval/rejection..."
                  />
                </Form.Group>

                {approvalAction === "approve" && (
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="Paper approval received"
                      checked={paperApprovalReceived}
                      onChange={(e) => setPaperApprovalReceived(e.target.checked)}
                    />
                  </Form.Group>
                )}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseApprovalModal} disabled={approvalLoading}>
              Cancel
            </Button>
            <Button
              variant={approvalAction === "approve" ? "success" : "danger"}
              onClick={handleConfirmApproval}
              disabled={approvalLoading}
            >
              {approvalLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Processing...
                </>
              ) : (
                `${approvalAction === "approve" ? "Approve" : "Reject"} Request`
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </RoleAwareLayout>
  );
};

export default SupervisorChangeRequestsPage;


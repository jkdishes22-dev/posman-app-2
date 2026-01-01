"use client";

import { useState, useEffect } from "react";
import "react-datepicker/dist/react-datepicker.css";
import { formatISO } from "date-fns";
import { Bill } from "src/app/types/types";
import { Modal, Button, Form, Badge } from "react-bootstrap";
import Pagination from "../../../components/Pagination";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import ErrorDisplay from "../../../components/ErrorDisplay";

const VoidRequestsPage = () => {
    const apiCall = useApiCall();

    const [filters, setFilters] = useState({
        billingDate: null,
        status: "pending",
        requestType: "all", // "all", "void", "quantity_change"
    });
    const [bills, setBills] = useState<Bill[]>([]);
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [total, setTotal] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);

    // Request approval states
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [approvalAction, setApprovalAction] = useState<"approve" | "reject" | null>(null);
    const [approvalNotes, setApprovalNotes] = useState("");
    const [paperApprovalReceived, setPaperApprovalReceived] = useState(false);
    const [approvalLoading, setApprovalLoading] = useState(false);
    const [approvalError, setApprovalError] = useState<string | null>(null);
    const [approvalErrorDetails, setApprovalErrorDetails] = useState<ApiErrorResponse | null>(null);
    const [requestType, setRequestType] = useState<"void" | "quantity_change" | null>(null);

    useEffect(() => {
        fetchBills();
    }, [filters, page]);

    const fetchBills = async () => {
        const { status, billingDate } = filters;

        try {
            let bills: Bill[] = [];
            let total = 0;

            // Fetch both pending and reopened bills that have void requests
            const baseParams = [];
            if (billingDate) {
                const formattedDate = formatISO(billingDate, { representation: "date" });
                baseParams.push(`date=${formattedDate}`);
            }
            baseParams.push(`page=${page}`);
            baseParams.push(`pageSize=${pageSize}`);

            // Fetch pending bills
            const pendingUrl = `/api/bills?status=pending${baseParams.length > 0 ? "&" + baseParams.join("&") : ""}`;
            const pendingResult = await apiCall(pendingUrl);

            // Fetch reopened bills
            const reopenedUrl = `/api/bills?status=reopened${baseParams.length > 0 ? "&" + baseParams.join("&") : ""}`;
            const reopenedResult = await apiCall(reopenedUrl);

            if (pendingResult.status === 200 && reopenedResult.status === 200) {
                const pendingBills = pendingResult.data.bills || [];
                const reopenedBills = reopenedResult.data.bills || [];

                // Combine and filter for bills with pending requests
                const allBills = [...pendingBills, ...reopenedBills];
                bills = allBills.filter((bill: Bill) => {
                    if (filters.requestType === "void") {
                        return bill.bill_items?.some((item: any) => item.status === "void_pending");
                    } else if (filters.requestType === "quantity_change") {
                        return bill.bill_items?.some((item: any) => item.status === "quantity_change_request");
                    } else {
                        // "all" - show bills with any pending requests
                        return bill.bill_items?.some((item: any) =>
                            item.status === "void_pending" || item.status === "quantity_change_request"
                        );
                    }
                });
                total = bills.length;
            } else {
                setError("Failed to fetch bills for void requests");
                setErrorDetails(pendingResult.errorDetails || reopenedResult.errorDetails);
                setBills([]);
                setTotal(0);
                return;
            }

            setBills(bills);
            setTotal(total);
            setError(null);
            setErrorDetails(null);
        } catch (error) {
            setError("Network error occurred");
            setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
            setBills([]);
            setTotal(0);
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

    const handleRequestApproval = (item: any, action: "approve" | "reject", type: "void" | "quantity_change") => {
        setSelectedItem(item);
        setApprovalAction(action);
        setRequestType(type);
        setApprovalNotes("");
        setPaperApprovalReceived(false);
        setApprovalError(null);
        setApprovalErrorDetails(null);
        setShowApprovalModal(true);
    };

    const handleConfirmApproval = async () => {
        if (!selectedItem || !approvalAction || !selectedBill || !requestType) {
            return;
        }

        setApprovalLoading(true);
        setApprovalError(null);
        setApprovalErrorDetails(null);

        try {
            const endpoint = requestType === "void"
                ? `/api/bills/${selectedBill.id}/items/${selectedItem.id}/void-approve`
                : `/api/bills/${selectedBill.id}/items/${selectedItem.id}/quantity-change-approve`;

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
                setSelectedItem(null);
                setApprovalAction(null);
                setRequestType(null);
                setApprovalNotes("");
                setPaperApprovalReceived(false);

                // Refresh the bill data to show updated status
                await fetchBillById(selectedBill.id);
                // Also refresh the bills list
                await fetchBills();
            } else {
                setApprovalError(result.error || `Failed to process ${requestType} request`);
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
        setSelectedItem(null);
        setApprovalAction(null);
        setRequestType(null);
        setApprovalNotes("");
        setPaperApprovalReceived(false);
        setApprovalError(null);
        setApprovalErrorDetails(null);
    };

    return (
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
                    <div className="card shadow-sm">
                        <div className="card-body">
                            <div className="row g-3 align-items-end">
                                <div className="col-md-3">
                                    <div className="form-group">
                                        <label htmlFor="billingDate" className="form-label fw-semibold">
                                            Billing Date
                                        </label>
                                        <div>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={filters.billingDate ? filters.billingDate.toISOString().split("T")[0] : ""}
                                                onChange={(e) => handleFilterChange("billingDate", e.target.value ? new Date(e.target.value) : null)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="form-group">
                                        <label className="form-label fw-semibold">Request Type</label>
                                        <select
                                            className="form-select"
                                            value={filters.requestType}
                                            onChange={(e) => handleFilterChange("requestType", e.target.value)}
                                        >
                                            <option value="all">All Requests</option>
                                            <option value="void">Void Requests</option>
                                            <option value="quantity_change">Quantity Change Requests</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="col-md-3 d-flex align-items-end">
                                    <div className="btn-group" role="group" aria-label="Filter actions">
                                        <button
                                            className="btn btn-outline-warning btn-sm"
                                            onClick={() => handleFilterChange("status", "pending")}
                                        >
                                            Pending Requests
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="row">
                {/* Bills List - Left Column */}
                <div className="col-6">
                    <div className="card shadow-sm h-100">
                        <div className="card-header bg-light">
                            <h5 className="mb-0 fw-bold">
                                <i className="bi bi-list-ul me-2 text-primary"></i>
                                Bills with Pending Requests
                            </h5>
                        </div>
                        <div className="card-body">
                            {bills.length === 0 ? (
                                <div className="text-center text-muted py-4">
                                    <i className="bi bi-check-circle display-4"></i>
                                    <p className="mt-2">No bills with pending requests found</p>
                                </div>
                            ) : (
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
                                            {bills.map((bill) => {
                                                const pendingVoidCount = bill.bill_items?.filter((item: any) => item.status === "void_pending").length || 0;
                                                const pendingQuantityChangeCount = bill.bill_items?.filter((item: any) => item.status === "quantity_change_request").length || 0;
                                                const totalPendingCount = pendingVoidCount + pendingQuantityChangeCount;
                                                return (
                                                    <tr
                                                        key={bill.id}
                                                        style={{ cursor: "pointer" }}
                                                        onClick={() => fetchBillById(bill.id)}
                                                        className={selectedBill?.id === bill.id ? "table-primary" : ""}
                                                    >
                                                        <td>{bill.id}</td>
                                                        <td>
                                                            <span className={`badge ${bill.status === "pending" ? "bg-warning" :
                                                                bill.status === "reopened" ? "bg-info" : "bg-secondary"
                                                                }`}>
                                                                {bill.status}
                                                            </span>
                                                        </td>
                                                        <td>${bill.total}</td>
                                                        <td>{bill.user?.firstName} {bill.user?.lastName}</td>
                                                        <td>
                                                            <div className="d-flex gap-1 flex-wrap">
                                                                {pendingVoidCount > 0 && (
                                                                    <Badge bg="warning" text="dark">
                                                                        {pendingVoidCount} void
                                                                    </Badge>
                                                                )}
                                                                {pendingQuantityChangeCount > 0 && (
                                                                    <Badge bg="info" text="dark">
                                                                        {pendingQuantityChangeCount} qty
                                                                    </Badge>
                                                                )}
                                                                {totalPendingCount === 0 && (
                                                                    <span className="text-muted">None</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <button
                                                                className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    fetchBillById(bill.id);
                                                                }}
                                                                title="View bill details and void requests"
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
                            )}

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
                        </div>
                    </div>
                </div>

                {/* Bill Details - Right Column */}
                <div className="col-6">
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
                                                                    <div className="d-flex gap-2">
                                                                        <button
                                                                            className="btn btn-success btn-sm d-flex align-items-center gap-1"
                                                                            onClick={() => handleRequestApproval(item, "approve", isVoidRequest ? "void" : "quantity_change")}
                                                                            title={`Approve ${isVoidRequest ? "Void" : "Quantity Change"} Request`}
                                                                            disabled={approvalLoading}
                                                                        >
                                                                            <i className="bi bi-check-circle-fill"></i>
                                                                            <span className="d-none d-sm-inline">Approve</span>
                                                                        </button>
                                                                        <button
                                                                            className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
                                                                            onClick={() => handleRequestApproval(item, "reject", isVoidRequest ? "void" : "quantity_change")}
                                                                            title={`Reject ${isVoidRequest ? "Void" : "Quantity Change"} Request`}
                                                                            disabled={approvalLoading}
                                                                        >
                                                                            <i className="bi bi-x-circle-fill"></i>
                                                                            <span className="d-none d-sm-inline">Reject</span>
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-muted">
                                    <i className="bi bi-receipt display-4"></i>
                                    <p className="mt-2">Select a bill to see details and pending requests</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Request Approval Modal */}
            <Modal show={showApprovalModal} onHide={handleCloseApprovalModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className={`bi ${requestType === "void" ? "bi-exclamation-triangle" : "bi-pencil-square"} me-2 ${requestType === "void" ? "text-warning" : "text-info"}`}></i>
                        {approvalAction === "approve" ? "Approve" : "Reject"} {requestType === "void" ? "Void" : "Quantity Change"} Request
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedItem && (
                        <div>
                            <div className="alert alert-info">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6 className="fw-bold mb-0">Item Details: {selectedItem.item.name}</h6>
                                    <span className="badge bg-primary fs-6">Bill #{selectedBill?.id}</span>
                                </div>

                                {requestType === "quantity_change" && selectedItem.requested_quantity ? (
                                    <div className="row">
                                        <div className="col-6">
                                            <div className="border rounded p-3 bg-light">
                                                <h6 className="text-muted mb-3">Current</h6>
                                                <p className="mb-2"><strong>Quantity:</strong> {selectedItem.quantity}</p>
                                                <p className="mb-2"><strong>Subtotal:</strong> ${((Number(selectedItem.item.price) || 0) * (Number(selectedItem.quantity) || 0)).toFixed(2)}</p>
                                                <p className="mb-0"><strong>Unit Price:</strong> ${(Number(selectedItem.item.price) || 0).toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="col-6">
                                            <div className="border rounded p-3 bg-light">
                                                <h6 className="text-muted mb-3">Requested</h6>
                                                <p className="mb-2"><strong>Quantity:</strong> {selectedItem.requested_quantity}</p>
                                                <p className="mb-2"><strong>Subtotal:</strong> ${((Number(selectedItem.item.price) || 0) * (Number(selectedItem.requested_quantity) || 0)).toFixed(2)}</p>
                                                <p className="mb-0"><strong>Unit Price:</strong> ${(Number(selectedItem.item.price) || 0).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="row">
                                        <div className="col-12">
                                            <p className="mb-1"><strong>Quantity:</strong> {selectedItem.quantity}</p>
                                            <p className="mb-1"><strong>Subtotal:</strong> ${selectedItem.subtotal}</p>
                                            <p className="mb-0"><strong>Unit Price:</strong> ${selectedItem.item.price}</p>
                                        </div>
                                    </div>
                                )}

                                {requestType === "quantity_change" && selectedItem.requested_quantity && (
                                    <div className="mt-3 p-3 bg-white border rounded">
                                        <h6 className="fw-bold mb-2">Change Summary</h6>
                                        <div className="row">
                                            <div className="col-6">
                                                <p className="mb-1"><strong>Quantity Change:</strong></p>
                                                <span className={`badge ${selectedItem.requested_quantity > selectedItem.quantity ? "bg-success" : "bg-danger"} fs-6`}>
                                                    {selectedItem.requested_quantity > selectedItem.quantity ? "+" : ""}
                                                    {selectedItem.requested_quantity - selectedItem.quantity}
                                                </span>
                                            </div>
                                            <div className="col-6">
                                                <p className="mb-1"><strong>Subtotal Change:</strong></p>
                                                <span className={`badge ${selectedItem.requested_quantity > selectedItem.quantity ? "bg-success" : "bg-danger"} fs-6`}>
                                                    {selectedItem.requested_quantity > selectedItem.quantity ? "+" : ""}
                                                    ${(((Number(selectedItem.item.price) || 0) * (Number(selectedItem.requested_quantity) || 0)) - ((Number(selectedItem.item.price) || 0) * (Number(selectedItem.quantity) || 0))).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-3">
                                    {requestType === "void" && selectedItem.void_reason && (
                                        <p className="mb-0"><strong>Void Reason:</strong> {selectedItem.void_reason}</p>
                                    )}
                                    {requestType === "quantity_change" && selectedItem.quantity_change_reason && (
                                        <p className="mb-0"><strong>Change Reason:</strong> {selectedItem.quantity_change_reason}</p>
                                    )}
                                </div>
                            </div>

                            <Form.Group className="mb-3">
                                <Form.Label>
                                    <strong>
                                        {approvalAction === "approve" ? "Approval" : "Rejection"} Notes
                                    </strong>
                                </Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={approvalNotes}
                                    onChange={(e) => setApprovalNotes(e.target.value)}
                                    placeholder={`Enter ${approvalAction === "approve" ? "approval" : "rejection"} notes...`}
                                />
                            </Form.Group>

                            {approvalAction === "approve" && (
                                <Form.Group className="mb-3">
                                    <Form.Check
                                        type="checkbox"
                                        id="paperApprovalReceived"
                                        label="Physical proof (signed form) received from chef/order-releaser"
                                        checked={paperApprovalReceived}
                                        onChange={(e) => setPaperApprovalReceived(e.target.checked)}
                                    />
                                </Form.Group>
                            )}

                            <ErrorDisplay
                                error={approvalError}
                                errorDetails={approvalErrorDetails}
                                onDismiss={() => {
                                    setApprovalError(null);
                                    setApprovalErrorDetails(null);
                                }}
                            />
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-between">
                    <Button
                        variant="outline-secondary"
                        onClick={handleCloseApprovalModal}
                        disabled={approvalLoading}
                    >
                        <i className="bi bi-x-circle me-1"></i>
                        Cancel
                    </Button>
                    <Button
                        variant={approvalAction === "approve" ? "success" : "danger"}
                        onClick={handleConfirmApproval}
                        disabled={approvalLoading || (approvalAction === "approve" && !paperApprovalReceived)}
                        className="d-flex align-items-center gap-2"
                    >
                        {approvalLoading ? (
                            <>
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                Processing...
                            </>
                        ) : (
                            <>
                                <i className={`bi ${approvalAction === "approve" ? "bi-check-circle-fill" : "bi-x-circle-fill"}`}></i>
                                {approvalAction === "approve" ? "Approve" : "Reject"} {requestType === "void" ? "Void" : "Quantity Change"} Request
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default VoidRequestsPage;

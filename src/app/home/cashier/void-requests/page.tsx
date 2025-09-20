"use client";

import { useState, useEffect } from "react";
import "react-datepicker/dist/react-datepicker.css";
import { formatISO } from "date-fns";
import { Bill } from "src/app/types/types";
import { Modal, Button, Form } from "react-bootstrap";
import Pagination from "../../../components/Pagination";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import ErrorDisplay from "../../../components/ErrorDisplay";

const VoidRequestsPage = () => {
    const apiCall = useApiCall();

    const [filters, setFilters] = useState({
        billingDate: null,
        status: "pending",
    });
    const [bills, setBills] = useState<Bill[]>([]);
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [total, setTotal] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);

    // Void approval states
    const [showVoidApprovalModal, setShowVoidApprovalModal] = useState(false);
    const [selectedVoidItem, setSelectedVoidItem] = useState<any>(null);
    const [voidApprovalAction, setVoidApprovalAction] = useState<'approve' | 'reject' | null>(null);
    const [voidApprovalNotes, setVoidApprovalNotes] = useState("");
    const [paperApprovalReceived, setPaperApprovalReceived] = useState(false);
    const [voidApprovalLoading, setVoidApprovalLoading] = useState(false);
    const [voidApprovalError, setVoidApprovalError] = useState<string | null>(null);
    const [voidApprovalErrorDetails, setVoidApprovalErrorDetails] = useState<ApiErrorResponse | null>(null);

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
            const pendingUrl = `/api/bills?status=pending${baseParams.length > 0 ? '&' + baseParams.join('&') : ''}`;
            const pendingResult = await apiCall(pendingUrl);

            // Fetch reopened bills
            const reopenedUrl = `/api/bills?status=reopened${baseParams.length > 0 ? '&' + baseParams.join('&') : ''}`;
            const reopenedResult = await apiCall(reopenedUrl);

            if (pendingResult.status === 200 && reopenedResult.status === 200) {
                const pendingBills = pendingResult.data.bills || [];
                const reopenedBills = reopenedResult.data.bills || [];

                // Combine and filter for bills with pending void requests
                const allBills = [...pendingBills, ...reopenedBills];
                bills = allBills.filter((bill: Bill) =>
                    bill.bill_items?.some((item: any) => item.status === 'void_pending')
                );
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

    const handleVoidApproval = (item: any, action: 'approve' | 'reject') => {
        setSelectedVoidItem(item);
        setVoidApprovalAction(action);
        setVoidApprovalNotes("");
        setPaperApprovalReceived(false);
        setVoidApprovalError(null);
        setVoidApprovalErrorDetails(null);
        setShowVoidApprovalModal(true);
    };

    const handleConfirmVoidApproval = async () => {
        if (!selectedVoidItem || !voidApprovalAction || !selectedBill) {
            return;
        }

        setVoidApprovalLoading(true);
        setVoidApprovalError(null);
        setVoidApprovalErrorDetails(null);

        try {
            const result = await apiCall(`/api/bills/${selectedBill.id}/items/${selectedVoidItem.id}/void-approve`, {
                method: "POST",
                body: JSON.stringify({
                    action: voidApprovalAction,
                    approvalNotes: voidApprovalNotes.trim(),
                    paperApprovalReceived: paperApprovalReceived
                })
            });

            if (result.status === 200) {
                setShowVoidApprovalModal(false);
                setSelectedVoidItem(null);
                setVoidApprovalAction(null);
                setVoidApprovalNotes("");
                setPaperApprovalReceived(false);

                // Refresh the bill data to show updated status
                await fetchBillById(selectedBill.id);
                // Also refresh the bills list
                await fetchBills();
            } else {
                setVoidApprovalError(result.error || "Failed to process void request");
                setVoidApprovalErrorDetails(result.errorDetails);
            }
        } catch (error) {
            setVoidApprovalError("Network error occurred");
            setVoidApprovalErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
        } finally {
            setVoidApprovalLoading(false);
        }
    };

    const handleCloseVoidApprovalModal = () => {
        setShowVoidApprovalModal(false);
        setSelectedVoidItem(null);
        setVoidApprovalAction(null);
        setVoidApprovalNotes("");
        setPaperApprovalReceived(false);
        setVoidApprovalError(null);
        setVoidApprovalErrorDetails(null);
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
                    Void Requests Management
                </h1>
                <p className="mb-0">Review and approve/reject pending void requests from sales team</p>
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
                                                value={filters.billingDate ? filters.billingDate.toISOString().split('T')[0] : ''}
                                                onChange={(e) => handleFilterChange("billingDate", e.target.value ? new Date(e.target.value) : null)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3 d-flex align-items-end">
                                    <div className="btn-group" role="group" aria-label="Filter actions">
                                        <button
                                            className="btn btn-outline-warning btn-sm"
                                            onClick={() => handleFilterChange("status", "pending")}
                                        >
                                            Pending Voids
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
                                Bills with Pending Void Requests
                            </h5>
                        </div>
                        <div className="card-body">
                            {bills.length === 0 ? (
                                <div className="text-center text-muted py-4">
                                    <i className="bi bi-check-circle display-4"></i>
                                    <p className="mt-2">No bills with pending void requests found</p>
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
                                                <th>VOID REQUESTS</th>
                                                <th>ACTIONS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bills.map((bill) => {
                                                const pendingVoidCount = bill.bill_items?.filter((item: any) => item.status === 'void_pending').length || 0;
                                                return (
                                                    <tr
                                                        key={bill.id}
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => fetchBillById(bill.id)}
                                                        className={selectedBill?.id === bill.id ? 'table-primary' : ''}
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
                                                            <span className="badge bg-warning text-dark">
                                                                {pendingVoidCount} pending
                                                            </span>
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
                                Bill Details & Void Requests
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

                                    {/* Bill Items with Void Requests */}
                                    <h6 className="fw-bold text-primary">Items with Pending Void Requests</h6>
                                    <div className="table-responsive">
                                        <table className="table table-sm table-hover">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Item</th>
                                                    <th>Qty</th>
                                                    <th>Price</th>
                                                    <th>Subtotal</th>
                                                    <th>Reason</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedBill.bill_items
                                                    ?.filter((item: any) => item.status === 'void_pending')
                                                    .map((item, index) => (
                                                        <tr key={index} className="table-warning">
                                                            <td>
                                                                <div className="fw-semibold">{item.item.name}</div>
                                                            </td>
                                                            <td>{item.quantity}</td>
                                                            <td>${(item.subtotal / item.quantity).toFixed(2)}</td>
                                                            <td>${item.subtotal.toFixed(2)}</td>
                                                            <td>
                                                                <div className="small text-muted">
                                                                    {item.void_reason}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="d-flex gap-2">
                                                                    <button
                                                                        className="btn btn-success btn-sm d-flex align-items-center gap-1"
                                                                        onClick={() => handleVoidApproval(item, 'approve')}
                                                                        title="Approve Void Request"
                                                                        disabled={voidApprovalLoading}
                                                                    >
                                                                        <i className="bi bi-check-circle-fill"></i>
                                                                        <span className="d-none d-sm-inline">Approve</span>
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
                                                                        onClick={() => handleVoidApproval(item, 'reject')}
                                                                        title="Reject Void Request"
                                                                        disabled={voidApprovalLoading}
                                                                    >
                                                                        <i className="bi bi-x-circle-fill"></i>
                                                                        <span className="d-none d-sm-inline">Reject</span>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-muted">
                                    <i className="bi bi-receipt display-4"></i>
                                    <p className="mt-2">Select a bill to see details and void requests</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Void Approval Modal */}
            <Modal show={showVoidApprovalModal} onHide={handleCloseVoidApprovalModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="bi bi-exclamation-triangle me-2 text-warning"></i>
                        {voidApprovalAction === 'approve' ? 'Approve' : 'Reject'} Void Request
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedVoidItem && (
                        <div>
                            <div className="alert alert-info">
                                <h6 className="fw-bold">Item Details:</h6>
                                <p className="mb-1"><strong>Item:</strong> {selectedVoidItem.item.name}</p>
                                <p className="mb-1"><strong>Quantity:</strong> {selectedVoidItem.quantity}</p>
                                <p className="mb-1"><strong>Subtotal:</strong> ${selectedVoidItem.subtotal}</p>
                                <p className="mb-0"><strong>Void Reason:</strong> {selectedVoidItem.void_reason}</p>
                            </div>

                            <Form.Group className="mb-3">
                                <Form.Label>
                                    <strong>
                                        {voidApprovalAction === 'approve' ? 'Approval' : 'Rejection'} Notes
                                    </strong>
                                </Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={voidApprovalNotes}
                                    onChange={(e) => setVoidApprovalNotes(e.target.value)}
                                    placeholder={`Enter ${voidApprovalAction === 'approve' ? 'approval' : 'rejection'} notes...`}
                                />
                            </Form.Group>

                            {voidApprovalAction === 'approve' && (
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
                                error={voidApprovalError}
                                errorDetails={voidApprovalErrorDetails}
                                onDismiss={() => {
                                    setVoidApprovalError(null);
                                    setVoidApprovalErrorDetails(null);
                                }}
                            />
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-between">
                    <Button
                        variant="outline-secondary"
                        onClick={handleCloseVoidApprovalModal}
                        disabled={voidApprovalLoading}
                    >
                        <i className="bi bi-x-circle me-1"></i>
                        Cancel
                    </Button>
                    <Button
                        variant={voidApprovalAction === 'approve' ? 'success' : 'danger'}
                        onClick={handleConfirmVoidApproval}
                        disabled={voidApprovalLoading || (voidApprovalAction === 'approve' && !paperApprovalReceived)}
                        className="d-flex align-items-center gap-2"
                    >
                        {voidApprovalLoading ? (
                            <>
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                Processing...
                            </>
                        ) : (
                            <>
                                <i className={`bi ${voidApprovalAction === 'approve' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}></i>
                                {voidApprovalAction === 'approve' ? 'Approve' : 'Reject'} Void Request
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default VoidRequestsPage;

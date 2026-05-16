"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { Modal, Button } from "react-bootstrap";
import { todayEAT, EAT_TIMEZONE } from "../../shared/eatDate";
import FilterDatePicker from "../../shared/FilterDatePicker";
import { ymdToDateEat } from "../../shared/filterDateUtils";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import PageHeaderStrip from "../../components/PageHeaderStrip";
import CollapsibleFilterSectionCard from "../../components/CollapsibleFilterSectionCard";
import { useApiCall } from "../../utils/apiUtils";
import ErrorDisplay from "../../components/ErrorDisplay";
import Pagination from "../../components/Pagination";

interface BillPaymentEntry {
    payment: { creditAmount: number };
}

interface Bill {
    id: number;
    total: number;
    status: string;
    created_at: string;
    user: {
        id: number;
        firstName: string;
        lastName: string;
    };
    station?: {
        name: string;
    };
    bill_payments?: BillPaymentEntry[];
}

interface StaffUser {
    id: number;
    firstName: string;
    lastName: string;
}

const SupervisorBillsPage: React.FC = () => {
    const router = useRouter();
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState(() => todayEAT());
    const [endDate, setEndDate] = useState(() => todayEAT());
    const [staffUserId, setStaffUserId] = useState("");
    const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 10;
    const apiCall = useApiCall();
    const [businessShifts, setBusinessShifts] = useState<{ id: string; name: string; start_time: string; end_time: string }[]>([]);
    const [showBulkClosePreviewModal, setShowBulkClosePreviewModal] = useState(false);
    const [bulkClosePreviewData, setBulkClosePreviewData] = useState<{
        bills: Bill[];
        totalBilled: number;
        totalPaid: number;
        discrepancies: Bill[];
    } | null>(null);
    const [bulkClosePreviewLoading, setBulkClosePreviewLoading] = useState(false);
    // Independent filter state for the preview modal (not tied to the page filter)
    const [previewStartDate, setPreviewStartDate] = useState(() => todayEAT());
    const [previewEndDate, setPreviewEndDate] = useState(() => todayEAT());
    const [previewStaffId, setPreviewStaffId] = useState("");
    const [previewShiftId, setPreviewShiftId] = useState("");
    const [previewSalespersons, setPreviewSalespersons] = useState<{ id: number; firstName: string; lastName: string }[]>([]);

    const [searchPage, setSearchPage] = useState(1);

    const handleViewBill = (billId: number) => {
        router.push(`/home/cashier/bills?billId=${billId}`);
    };

    // Load billing-capable staff (sales + supervisor) once on mount.
    // We exclude admin/cashier/storekeeper because they don't create bills.
    useEffect(() => {
        apiCall("/api/users?role=sales,supervisor&pageSize=200").then((res) => {
            if (res.status === 200) {
                const list = Array.isArray(res.data) ? res.data : (res.data?.users || []);
                setStaffUsers(list);
            }
        }).catch(() => {});
        apiCall("/api/system/settings?key=system_settings&sub=business_shifts").then((res) => {
            if (res.status === 200 && Array.isArray(res.data?.value)) {
                setBusinessShifts(res.data.value);
            }
        }).catch(() => {});
    }, []);

    useEffect(() => {
        fetchBills();
    }, [statusFilter, page, startDate, endDate, staffUserId]);

    useEffect(() => {
        setPage(1);
        setSearchPage(1);
    }, [statusFilter, startDate, endDate, staffUserId]);

    useEffect(() => {
        setSearchPage(1);
    }, [searchTerm]);

    const filterBillsByShift = (bills: Bill[], shiftId: string): Bill[] => {
        if (!shiftId) return bills;
        const shift = businessShifts.find(s => s.id === shiftId);
        if (!shift) return bills;
        return bills.filter(bill => {
            const t = formatInTimeZone(new Date(bill.created_at), EAT_TIMEZONE, "HH:mm");
            const overnight = shift.start_time > shift.end_time;
            return overnight
                ? t >= shift.start_time || t < shift.end_time
                : t >= shift.start_time && t < shift.end_time;
        });
    };

    const doFetchBulkClosePreview = async (sDate: string, eDate: string, staffId: string, shiftId: string) => {
        setBulkClosePreviewLoading(true);
        setBulkClosePreviewData(null);

        // No billingUserId at API level — filter client-side so salesperson dropdown stays populated
        const params = new URLSearchParams({ status: "submitted", pageSize: "1000" });
        if (sDate) params.append("startDate", sDate);
        if (eDate) params.append("endDate", eDate);

        try {
            const result = await apiCall(`/api/bills?${params.toString()}`);
            if (result.status === 200) {
                const allBills: Bill[] = result.data.bills || [];

                // Extract unique salespersons from all fetched bills (unfiltered)
                const seen = new Set<number>();
                const persons: { id: number; firstName: string; lastName: string }[] = [];
                for (const b of allBills) {
                    if (b.user?.id && !seen.has(b.user.id)) {
                        seen.add(b.user.id);
                        persons.push({ id: b.user.id, firstName: b.user.firstName, lastName: b.user.lastName });
                    }
                }
                setPreviewSalespersons(persons);

                // Apply salesperson filter client-side
                let fetched: Bill[] = staffId
                    ? allBills.filter(b => String(b.user?.id) === staffId)
                    : allBills;

                // Apply shift filter client-side
                fetched = filterBillsByShift(fetched, shiftId);

                setBulkClosePreviewData({
                    bills: fetched,
                    totalBilled: fetched.reduce((s, b) => s + (Number(b.total) || 0), 0),
                    totalPaid: fetched.reduce((s, b) =>
                        s + (b.bill_payments?.reduce(
                            (ps: number, bp: BillPaymentEntry) => ps + (Number(bp.payment.creditAmount) || 0), 0
                        ) || 0), 0),
                    discrepancies: fetched.filter(b => {
                        const paid = b.bill_payments?.reduce(
                            (ps: number, bp: BillPaymentEntry) => ps + (Number(bp.payment.creditAmount) || 0), 0
                        ) || 0;
                        return Math.abs(paid - (Number(b.total) || 0)) > 0.01;
                    }),
                });
            }
        } catch (_e) { /* non-critical — preview stays empty on error */ }
        setBulkClosePreviewLoading(false);
    };

    const handleBulkCloseClick = async () => {
        const initStart = startDate;
        const initEnd = endDate;
        const initStaff = staffUserId;
        setPreviewStartDate(initStart);
        setPreviewEndDate(initEnd);
        setPreviewStaffId(initStaff);
        setPreviewShiftId("");
        setShowBulkClosePreviewModal(true);
        await doFetchBulkClosePreview(initStart, initEnd, initStaff, "");
    };

    const fetchBulkClosePreview = () => {
        doFetchBulkClosePreview(previewStartDate, previewEndDate, previewStaffId, previewShiftId);
    };

    const handleBulkCloseConfirm = async () => {
        if (!bulkClosePreviewData?.bills.length) return;
        setShowBulkClosePreviewModal(false);
        try {
            const result = await apiCall("/api/bills/bulk-close", {
                method: "POST",
                body: JSON.stringify({ billIds: bulkClosePreviewData.bills.map(b => b.id) }),
            });
            if (result.status === 200) {
                fetchBills();
            } else {
                setError(result.error || "Failed to bulk close bills");
            }
        } catch {
            setError("Network error occurred");
        }
    };

    const fetchBills = async () => {
        try {
            setLoading(true);
            setError(null);
            setErrorDetails(null);

            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
            });
            if (statusFilter !== "all") params.append("status", statusFilter);
            if (startDate) params.append("startDate", startDate);
            if (endDate) params.append("endDate", endDate);
            if (staffUserId) params.append("billingUserId", staffUserId);

            const result = await apiCall(`/api/bills?${params.toString()}`);

            if (result.status === 200) {
                setBills(result.data.bills || []);
                setTotal(result.data.total || 0);
            } else {
                setError(result.error || "Failed to fetch bills");
                setErrorDetails(result.errorDetails || null);
                setBills([]);
                setTotal(0);
            }
        } catch {
            setError("Network error occurred");
            setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
            setBills([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    };

    const filteredBills = bills.filter(bill =>
        searchTerm === "" ||
        bill.id.toString().includes(searchTerm) ||
        bill.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bill.station?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const paginatedBills = searchTerm
        ? filteredBills.slice((searchPage - 1) * pageSize, searchPage * pageSize)
        : filteredBills;

    const displayTotal = searchTerm ? filteredBills.length : total;

    const clearFilters = () => {
        setSearchTerm("");
        setStatusFilter("all");
        const d = todayEAT();
        setStartDate(d);
        setEndDate(d);
        setStaffUserId("");
        setPage(1);
    };

    const getStatusBadge = (status: string) => {
        const statusClasses: Record<string, string> = {
            pending: "bg-warning",
            submitted: "bg-info",
            closed: "bg-success",
            reopened: "bg-danger",
            voided: "bg-secondary"
        };
        return (
            <span className={`badge ${statusClasses[status] || "bg-secondary"}`}>
                {status.toUpperCase()}
            </span>
        );
    };

    return (
        <RoleAwareLayout>
            <div className="container-fluid supervisor-bills-screen" style={{ overflowX: "hidden" }}>
                <div className="row">
                    <div className="col-12">
                        <PageHeaderStrip
                            actions={
                                <div className="d-flex gap-2">
                                    <button type="button" className="btn btn-success btn-sm" onClick={handleBulkCloseClick}>
                                        <i className="bi bi-check-circle me-1"></i>
                                        Bulk Close
                                    </button>
                                    <button type="button" className="btn btn-outline-light btn-sm" onClick={fetchBills}>
                                        <i className="bi bi-arrow-clockwise me-2"></i>
                                        Refresh
                                    </button>
                                </div>
                            }
                        >
                            <h1 className="h4 mb-0 fw-bold">
                                <i className="bi bi-receipt me-2" aria-hidden />
                                Bills Management
                            </h1>
                        </PageHeaderStrip>

                        <ErrorDisplay
                            error={error}
                            errorDetails={errorDetails}
                            onDismiss={() => { setError(null); setErrorDetails(null); }}
                        />

                        {/* Filters */}
                        <CollapsibleFilterSectionCard className="mb-4" bodyClassName="p-3">
                                <div className="row g-3">
                                    <div className="col-12 col-md-6 col-lg-2">
                                        <label className="form-label">Status</label>
                                        <select
                                            className="form-select"
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                        >
                                            <option value="all">All Bills</option>
                                            <option value="pending">Pending</option>
                                            <option value="submitted">Submitted</option>
                                            <option value="closed">Closed</option>
                                            <option value="reopened">Reopened</option>
                                            <option value="voided">Voided</option>
                                        </select>
                                    </div>
                                    <div className="col-12 col-md-6 col-lg-2">
                                        <label className="form-label">Staff</label>
                                        <select
                                            className="form-select"
                                            value={staffUserId}
                                            onChange={(e) => setStaffUserId(e.target.value)}
                                        >
                                            <option value="">All Staff</option>
                                            {staffUsers.map((u) => (
                                                <option key={u.id} value={u.id}>
                                                    {u.firstName} {u.lastName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-12 col-md-6 col-lg-2">
                                        <FilterDatePicker
                                            label="From"
                                            value={startDate}
                                            onChange={setStartDate}
                                            maxDate={endDate ? ymdToDateEat(endDate) ?? new Date() : new Date()}
                                        />
                                    </div>
                                    <div className="col-12 col-md-6 col-lg-2">
                                        <FilterDatePicker
                                            label="To"
                                            value={endDate}
                                            onChange={setEndDate}
                                            minDate={startDate ? ymdToDateEat(startDate) ?? undefined : undefined}
                                            maxDate={new Date()}
                                        />
                                    </div>
                                    <div className="col-12 col-md-6 col-lg-2">
                                        <label className="form-label">Search</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="ID, user, station…"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-12 col-md-6 col-lg-2 d-flex align-items-end">
                                        <button type="button" className="btn btn-outline-secondary w-100" onClick={clearFilters}>
                                            Clear filters
                                        </button>
                                    </div>
                                </div>
                        </CollapsibleFilterSectionCard>

                        {/* Bills Table */}
                        <div className="card">
                            <div className="card-header">
                                <h5 className="card-title mb-0">Bills ({displayTotal})</h5>
                            </div>
                            <div className="card-body">
                                {loading ? (
                                    <div className="text-center py-5">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                        <p className="mt-3 text-muted">Loading bills...</p>
                                    </div>
                                ) : paginatedBills.length === 0 ? (
                                    <div className="text-center py-5 text-muted">
                                        <i className="bi bi-receipt fs-1 mb-3"></i>
                                        <p>No bills found</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="table-responsive" style={{ overflowX: "auto" }}>
                                            <table className="table table-hover">
                                                <thead>
                                                    <tr>
                                                        <th>Bill ID</th>
                                                        <th>User</th>
                                                        <th className="d-none d-md-table-cell">Station</th>
                                                        <th>Total</th>
                                                        <th>Status</th>
                                                        <th className="d-none d-lg-table-cell">Created</th>
                                                        <th style={{ minWidth: "100px" }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paginatedBills.map((bill) => (
                                                        <tr key={bill.id}>
                                                            <td><strong>#{bill.id}</strong></td>
                                                            <td>{bill.user.firstName} {bill.user.lastName}</td>
                                                            <td className="d-none d-md-table-cell">{bill.station?.name || "N/A"}</td>
                                                            <td><strong>KES {(Number(bill.total) || 0).toFixed(2)}</strong></td>
                                                            <td>{getStatusBadge(bill.status)}</td>
                                                            <td className="d-none d-lg-table-cell">
                                                                {new Date(bill.created_at).toLocaleDateString()}
                                                            </td>
                                                            <td>
                                                                <button
                                                                    className="btn btn-sm btn-outline-primary"
                                                                    title="View bill details"
                                                                    onClick={() => handleViewBill(bill.id)}
                                                                >
                                                                    <i className="bi bi-eye"></i>
                                                                    <span className="d-none d-sm-inline ms-1">View</span>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="mt-4">
                                            {searchTerm ? (
                                                <Pagination
                                                    page={searchPage}
                                                    pageSize={pageSize}
                                                    total={filteredBills.length}
                                                    onPageChange={setSearchPage}
                                                    showInfo={true}
                                                />
                                            ) : (
                                                <Pagination
                                                    page={page}
                                                    pageSize={pageSize}
                                                    total={total}
                                                    onPageChange={setPage}
                                                    showInfo={true}
                                                />
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        {/* Bulk Close Preview Modal — has its own independent filter controls */}
        <Modal show={showBulkClosePreviewModal} onHide={() => setShowBulkClosePreviewModal(false)} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="bi bi-check-circle me-2 text-success"></i>
                    Bulk Close Bills
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {/* Independent filters */}
                <div className="row g-2 mb-3">
                    <div className={businessShifts.length > 0 ? "col-12 col-md-3" : "col-12 col-md-4"}>
                        <FilterDatePicker
                            label="From"
                            value={previewStartDate}
                            onChange={setPreviewStartDate}
                            maxDate={previewEndDate ? ymdToDateEat(previewEndDate) ?? new Date() : new Date()}
                        />
                    </div>
                    <div className={businessShifts.length > 0 ? "col-12 col-md-3" : "col-12 col-md-4"}>
                        <FilterDatePicker
                            label="To"
                            value={previewEndDate}
                            onChange={setPreviewEndDate}
                            minDate={previewStartDate ? ymdToDateEat(previewStartDate) ?? undefined : undefined}
                            maxDate={new Date()}
                        />
                    </div>
                    <div className={businessShifts.length > 0 ? "col-12 col-md-3" : "col-12 col-md-4"}>
                        <label className="form-label">Salesperson</label>
                        <select
                            className="form-select"
                            value={previewStaffId}
                            onChange={(e) => setPreviewStaffId(e.target.value)}
                        >
                            <option value="">All</option>
                            {previewSalespersons.map(p => (
                                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                            ))}
                        </select>
                    </div>
                    {businessShifts.length > 0 && (
                        <div className="col-12 col-md-3">
                            <label className="form-label">Shift</label>
                            <select
                                className="form-select"
                                value={previewShiftId}
                                onChange={(e) => setPreviewShiftId(e.target.value)}
                            >
                                <option value="">All day</option>
                                {businessShifts.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.start_time}–{s.end_time})</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <div className="mb-3">
                    <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={fetchBulkClosePreview}
                        disabled={bulkClosePreviewLoading}
                    >
                        <i className="bi bi-search me-1"></i>
                        {bulkClosePreviewLoading ? "Loading…" : "Update Preview"}
                    </Button>
                </div>

                <hr className="my-2" />

                {/* Results */}
                {bulkClosePreviewLoading ? (
                    <div className="text-center py-3">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading…</span>
                        </div>
                        <p className="mt-2 text-muted mb-0">Fetching submitted bills…</p>
                    </div>
                ) : bulkClosePreviewData ? (
                    bulkClosePreviewData.bills.length === 0 ? (
                        <div className="alert alert-info mb-0">
                            <i className="bi bi-info-circle me-1"></i>
                            No submitted bills found for the selected filters.
                        </div>
                    ) : (
                        <div>
                            <p className="mb-2">
                                <strong>{bulkClosePreviewData.bills.length}</strong> submitted bill(s) will be closed.
                            </p>
                            <table className="table table-sm mb-2">
                                <tbody>
                                    <tr>
                                        <td className="text-muted">Total billed</td>
                                        <td className="text-end fw-semibold">KES {bulkClosePreviewData.totalBilled.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td className="text-muted">Total paid</td>
                                        <td className="text-end fw-semibold">KES {bulkClosePreviewData.totalPaid.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                            {bulkClosePreviewData.discrepancies.length > 0 && (
                                <div className="alert alert-warning py-2 mb-0">
                                    <i className="bi bi-exclamation-triangle me-1"></i>
                                    <strong>{bulkClosePreviewData.discrepancies.length}</strong> bill(s) have payment
                                    discrepancies (Bill IDs: {bulkClosePreviewData.discrepancies.map(b => `#${b.id}`).join(", ")}).
                                    These will fail to close.
                                </div>
                            )}
                        </div>
                    )
                ) : (
                    <p className="text-muted small mb-0">Select filters above and click <strong>Update Preview</strong> to see matching bills.</p>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowBulkClosePreviewModal(false)}>Cancel</Button>
                <Button
                    variant="success"
                    onClick={handleBulkCloseConfirm}
                    disabled={bulkClosePreviewLoading || !bulkClosePreviewData?.bills.length}
                >
                    <i className="bi bi-check-circle me-1"></i>
                    Close {bulkClosePreviewData?.bills.length ?? 0} Bill(s)
                </Button>
            </Modal.Footer>
        </Modal>

</RoleAwareLayout>
    );
};

export default SupervisorBillsPage;

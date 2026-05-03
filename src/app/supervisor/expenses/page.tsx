"use client";

import React, { useState, useEffect, useCallback } from "react";
import RoleAwareLayout from "../../shared/RoleAwareLayout";
import { Card, Table, Button, Badge, Modal, Form, Alert, Spinner, Row, Col } from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";

interface PaymentRecord {
    id: number;
    debitAmount: number;
    paymentType: string;
    reference?: string | null;
    paidAt: string;
}

interface ExpensePayment {
    id: number;
    payment: PaymentRecord;
    notes?: string | null;
    created_at: string;
}

interface Expense {
    id: number;
    category: string;
    description: string;
    amount: number;
    expense_date: string;
    status: "open" | "partial" | "settled";
    notes?: string;
    paid: number;
    balance: number;
    payments?: ExpensePayment[];
}

const CATEGORIES = [
    "Utilities",
    "Rent",
    "Salaries",
    "Supplies",
    "Maintenance",
    "Transport",
    "Marketing",
    "Other",
];

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Cheque", "Mobile Money"];

const statusVariant = (status: string) => {
    if (status === "settled") return "success";
    if (status === "partial") return "warning";
    return "secondary";
};

export default function ExpensesPage() {
    const apiCall = useApiCall();

    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const pageSize = 20;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Create expense modal
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ category: "", description: "", amount: "", expense_date: new Date().toISOString().slice(0, 10), notes: "" });
    const [createSaving, setCreateSaving] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Record payment modal
    const [payTarget, setPayTarget] = useState<Expense | null>(null);
    const [payForm, setPayForm] = useState({ amount: "", payment_method: "Cash", notes: "", reference: "" });
    const [paySaving, setPaySaving] = useState(false);
    const [payError, setPayError] = useState<string | null>(null);

    // Detail modal
    const [detailExpense, setDetailExpense] = useState<Expense | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const loadExpenses = useCallback(async (p = page) => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiCall(`/api/expenses?page=${p}&pageSize=${pageSize}`);
            if (res.status === 200) {
                setExpenses(res.data.items || []);
                setTotal(res.data.total || 0);
            } else {
                setError(res.error || "Failed to load expenses");
            }
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { loadExpenses(page); }, [page]);

    const handleCreate = async () => {
        setCreateSaving(true);
        setCreateError(null);
        try {
            const res = await apiCall("/api/expenses", {
                method: "POST",
                body: JSON.stringify({
                    category: createForm.category,
                    description: createForm.description,
                    amount: parseFloat(createForm.amount),
                    expense_date: createForm.expense_date,
                    notes: createForm.notes || undefined,
                }),
            });
            if (res.status === 201) {
                setShowCreate(false);
                setCreateForm({ category: "", description: "", amount: "", expense_date: new Date().toISOString().slice(0, 10), notes: "" });
                loadExpenses(1);
                setPage(1);
            } else {
                setCreateError(res.error || res.data?.error || "Failed to create expense");
            }
        } catch {
            setCreateError("Network error");
        } finally {
            setCreateSaving(false);
        }
    };

    const handleRecordPayment = async () => {
        if (!payTarget) return;
        setPaySaving(true);
        setPayError(null);
        try {
            const res = await apiCall(`/api/expenses/${payTarget.id}/payments`, {
                method: "POST",
                body: JSON.stringify({
                    amount: parseFloat(payForm.amount),
                    payment_method: payForm.payment_method,
                    reference: payForm.reference || undefined,
                    notes: payForm.notes || undefined,
                }),
            });
            if (res.status === 201) {
                setPayTarget(null);
                setPayForm({ amount: "", payment_method: "Cash", notes: "", reference: "" });
                loadExpenses(page);
            } else {
                setPayError(res.error || res.data?.error || "Failed to record payment");
            }
        } catch {
            setPayError("Network error");
        } finally {
            setPaySaving(false);
        }
    };

    const openDetail = async (expense: Expense) => {
        setDetailExpense(expense);
        setDetailLoading(true);
        const res = await apiCall(`/api/expenses/${expense.id}`);
        if (res.status === 200) setDetailExpense(res.data);
        setDetailLoading(false);
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <RoleAwareLayout>
            <div className="container-fluid">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="mb-0">Expenses</h2>
                        <p className="text-muted small mb-0">Track and manage operational expenses</p>
                    </div>
                    <Button variant="primary" onClick={() => setShowCreate(true)}>
                        <i className="bi bi-plus-circle me-2"></i>Add Expense
                    </Button>
                </div>

                {error && <Alert variant="danger">{error}</Alert>}

                <Card className="shadow-sm">
                    <Card.Body className="p-0">
                        {loading ? (
                            <div className="text-center py-5">
                                <Spinner animation="border" />
                            </div>
                        ) : expenses.length === 0 ? (
                            <div className="text-center text-muted py-5">No expenses recorded yet.</div>
                        ) : (
                            <Table responsive hover className="mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Date</th>
                                        <th>Category</th>
                                        <th>Description</th>
                                        <th className="text-end">Amount</th>
                                        <th className="text-end">Paid</th>
                                        <th className="text-end">Balance</th>
                                        <th>Status</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.map((e) => (
                                        <tr key={e.id}>
                                            <td className="text-nowrap">{new Date(e.expense_date).toLocaleDateString()}</td>
                                            <td>{e.category}</td>
                                            <td>{e.description}</td>
                                            <td className="text-end">KES {Number(e.amount).toFixed(2)}</td>
                                            <td className="text-end">KES {Number(e.paid).toFixed(2)}</td>
                                            <td className="text-end">KES {Number(e.balance).toFixed(2)}</td>
                                            <td>
                                                <Badge bg={statusVariant(e.status)} className="text-capitalize">{e.status}</Badge>
                                            </td>
                                            <td className="text-nowrap">
                                                <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => openDetail(e)}>
                                                    <i className="bi bi-eye"></i>
                                                </Button>
                                                {e.status !== "settled" && (
                                                    <Button size="sm" variant="outline-primary" onClick={() => { setPayTarget(e); setPayForm({ amount: String(e.balance), payment_method: "Cash", notes: "", reference: "" }); }}>
                                                        Pay
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </Card.Body>
                    {totalPages > 1 && (
                        <Card.Footer className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">{total} expense{total !== 1 ? "s" : ""}</small>
                            <div className="d-flex gap-2">
                                <Button size="sm" variant="outline-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                                <span className="align-self-center small">Page {page} of {totalPages}</span>
                                <Button size="sm" variant="outline-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                            </div>
                        </Card.Footer>
                    )}
                </Card>
            </div>

            {/* Create Expense Modal */}
            <Modal show={showCreate} onHide={() => { setShowCreate(false); setCreateError(null); }} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Add Expense</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {createError && <Alert variant="danger">{createError}</Alert>}
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Category</Form.Label>
                            <Form.Select value={createForm.category} onChange={(e) => setCreateForm(f => ({ ...f, category: e.target.value }))}>
                                <option value="">Select category…</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Brief description"
                                value={createForm.description}
                                onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
                            />
                        </Form.Group>
                        <Row>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label>Amount (KES)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={createForm.amount}
                                        onChange={(e) => setCreateForm(f => ({ ...f, amount: e.target.value }))}
                                    />
                                </Form.Group>
                            </Col>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label>Date</Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={createForm.expense_date}
                                        onChange={(e) => setCreateForm(f => ({ ...f, expense_date: e.target.value }))}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Notes <span className="text-muted">(optional)</span></Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={createForm.notes}
                                onChange={(e) => setCreateForm(f => ({ ...f, notes: e.target.value }))}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleCreate} disabled={createSaving || !createForm.category || !createForm.description || !createForm.amount}>
                        {createSaving ? <><Spinner animation="border" size="sm" className="me-2" />Saving…</> : "Save Expense"}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Record Payment Modal */}
            <Modal show={!!payTarget} onHide={() => { setPayTarget(null); setPayError(null); }} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Record Payment</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {payTarget && (
                        <div className="mb-3 p-3 bg-light rounded small">
                            <div><strong>{payTarget.description}</strong></div>
                            <div className="text-muted">Total: KES {Number(payTarget.amount).toFixed(2)} · Paid: KES {Number(payTarget.paid).toFixed(2)} · Balance: KES {Number(payTarget.balance).toFixed(2)}</div>
                        </div>
                    )}
                    {payError && <Alert variant="danger">{payError}</Alert>}
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Amount (KES)</Form.Label>
                            <Form.Control
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={payForm.amount}
                                onChange={(e) => setPayForm(f => ({ ...f, amount: e.target.value }))}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Payment Method</Form.Label>
                            <Form.Select value={payForm.payment_method} onChange={(e) => setPayForm(f => ({ ...f, payment_method: e.target.value }))}>
                                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                            </Form.Select>
                        </Form.Group>
                        {payForm.payment_method === "Mobile Money" && (
                            <Form.Group className="mb-3">
                                <Form.Label>Reference / confirmation code</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="e.g. M-Pesa code"
                                    value={payForm.reference}
                                    onChange={(e) => setPayForm(f => ({ ...f, reference: e.target.value }))}
                                />
                            </Form.Group>
                        )}
                        <Form.Group className="mb-3">
                            <Form.Label>Notes <span className="text-muted">(optional)</span></Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={payForm.notes}
                                onChange={(e) => setPayForm(f => ({ ...f, notes: e.target.value }))}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setPayTarget(null)}>Cancel</Button>
                    <Button variant="primary" onClick={handleRecordPayment} disabled={paySaving || !payForm.amount}>
                        {paySaving ? <><Spinner animation="border" size="sm" className="me-2" />Recording…</> : "Record Payment"}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Detail Modal */}
            <Modal show={!!detailExpense} onHide={() => setDetailExpense(null)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Expense Detail</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {detailLoading ? (
                        <div className="text-center py-3"><Spinner animation="border" /></div>
                    ) : detailExpense && (
                        <>
                            <Row className="mb-3">
                                <Col sm={6}><strong>Category:</strong> {detailExpense.category}</Col>
                                <Col sm={6}><strong>Date:</strong> {new Date(detailExpense.expense_date).toLocaleDateString()}</Col>
                            </Row>
                            <Row className="mb-3">
                                <Col><strong>Description:</strong> {detailExpense.description}</Col>
                            </Row>
                            {detailExpense.notes && (
                                <Row className="mb-3">
                                    <Col><strong>Notes:</strong> {detailExpense.notes}</Col>
                                </Row>
                            )}
                            <Row className="mb-3">
                                <Col sm={4}><strong>Total:</strong> KES {Number(detailExpense.amount).toFixed(2)}</Col>
                                <Col sm={4}><strong>Paid:</strong> KES {Number(detailExpense.paid).toFixed(2)}</Col>
                                <Col sm={4}><strong>Balance:</strong> KES {Number(detailExpense.balance).toFixed(2)}</Col>
                            </Row>
                            <hr />
                            <h6>Payment History</h6>
                            {!detailExpense.payments?.length ? (
                                <p className="text-muted small">No payments recorded.</p>
                            ) : (
                                <Table size="sm" bordered>
                                    <thead className="table-light">
                                        <tr>
                                            <th>Date</th>
                                            <th>Method</th>
                                            <th className="text-end">Amount</th>
                                            <th>Reference</th>
                                            <th>Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detailExpense.payments.map(p => (
                                            <tr key={p.id}>
                                                <td>{new Date(p.payment?.paidAt ?? p.created_at).toLocaleDateString()}</td>
                                                <td>{p.payment?.paymentType ?? "—"}</td>
                                                <td className="text-end">KES {Number(p.payment?.debitAmount ?? 0).toFixed(2)}</td>
                                                <td className="text-monospace small">{p.payment?.reference || "—"}</td>
                                                <td>{p.notes || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setDetailExpense(null)}>Close</Button>
                </Modal.Footer>
            </Modal>
        </RoleAwareLayout>
    );
}

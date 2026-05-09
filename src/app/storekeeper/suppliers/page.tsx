"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  Card,
  Row,
  Col,
  Badge,
  Button,
  Table,
  Modal,
  Form,
  InputGroup,
  Spinner,
  Alert
} from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";
import ErrorDisplay from "../../components/ErrorDisplay";
import HelpPopover from "../../components/HelpPopover";
import CollapsibleFilterSectionCard from "../../components/CollapsibleFilterSectionCard";
import PageHeaderStrip from "../../components/PageHeaderStrip";
import { ApiErrorResponse } from "../../utils/errorUtils";
import { AuthError } from "../../types/types";
import { useAuth } from "../../contexts/AuthContext";

function formatSupplierTransactionLabel(type: string): string {
  if (type === "adjustment") return "Partial payment";
  if (type === "payment") return "Payment";
  return type.replace(/_/g, " ");
}

interface Supplier {
  id: number;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  credit_limit: number;
  payment_terms: string | null;
  status: "active" | "inactive";
  balance?: {
    credit_balance: number;
    debit_balance: number;
    net_balance: number;
  };
}

export default function SuppliersPage() {
  const apiCall = useApiCall();
  const { user } = useAuth();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [authError, setAuthError] = useState<AuthError>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    credit_limit: "",
    payment_terms: "",
    status: "active" as "active" | "inactive",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search and filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const supplierFiltersActive = searchTerm !== "" || statusFilter !== "all";

  const clearSupplierFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  // Details modal states
  const [supplierBalance, setSupplierBalance] = useState<any>(null);
  const [supplierTransactions, setSupplierTransactions] = useState<any[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditKind, setCreditKind] = useState<"payment" | "adjustment">("payment");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReference, setCreditReference] = useState("");
  const [creditNotes, setCreditNotes] = useState("");
  const [creditSubmitting, setCreditSubmitting] = useState(false);
  const [creditError, setCreditError] = useState<string | null>(null);
  const [creditErrorDetails, setCreditErrorDetails] = useState<ApiErrorResponse | null>(null);

  /** Match roles granted can_add_supplier_payment in role-permissions (JWT roles may be strings). */
  const canAddSupplierPayment =
    user?.roles?.some((r: any) => {
      const name = typeof r === "string" ? r : r?.name;
      return name === "supervisor" || name === "storekeeper";
    }) ?? false;

  useEffect(() => {
    fetchSuppliers();
  }, [apiCall]);

  useEffect(() => {
    filterSuppliers();
  }, [suppliers, searchTerm, statusFilter]);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    setError(null);
    setErrorDetails(null);

    try {
      const result = await apiCall("/api/suppliers");
      if (result.status >= 200 && result.status < 300) {
        const data = Array.isArray(result.data) ? result.data : [];
        setSuppliers(data);
        setFilteredSuppliers(data);
      } else {
        if (result.status === 403) {
          setAuthError({ message: result.error || "Access denied" });
        }
        setError(result.error || "Failed to fetch suppliers");
        setErrorDetails(result.errorDetails);
        setSuppliers([]);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      setSuppliers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterSuppliers = () => {
    let filtered = [...suppliers];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(supplier =>
        supplier.name.toLowerCase().includes(term) ||
        supplier.contact_person?.toLowerCase().includes(term) ||
        supplier.email?.toLowerCase().includes(term) ||
        supplier.phone?.includes(term)
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(supplier => supplier.status === statusFilter);
    }

    setFilteredSuppliers(filtered);
  };

  const handleAdd = () => {
    setFormData({
      name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      credit_limit: "",
      payment_terms: "",
      status: "active",
    });
    setFormError(null);
    setShowAddModal(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      credit_limit: supplier.credit_limit != null ? supplier.credit_limit.toString() : "",
      payment_terms: supplier.payment_terms || "",
      status: supplier.status,
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const handleDelete = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDeleteModal(true);
  };

  const handleViewDetails = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailsModal(true);
    await fetchSupplierDetails(supplier.id);
  };

  const fetchSupplierDetails = async (supplierId: number) => {
    setLoadingBalance(true);
    setLoadingTransactions(true);

    try {
      // Fetch balance
      const balanceResult = await apiCall(`/api/suppliers/${supplierId}?action=balance`);
      if (balanceResult.status === 200) {
        setSupplierBalance(balanceResult.data);
      }

      // Fetch transactions
      const transactionsResult = await apiCall(`/api/suppliers/${supplierId}?action=transactions&limit=5`);
      if (transactionsResult.status === 200) {
        setSupplierTransactions(Array.isArray(transactionsResult.data) ? transactionsResult.data : []);
      }
    } catch (error: any) {
      console.error("Failed to fetch supplier details", error);
    } finally {
      setLoadingBalance(false);
      setLoadingTransactions(false);
    }
  };

  const openCreditModal = (kind: "payment" | "adjustment") => {
    setCreditKind(kind);
    setCreditError(null);
    setCreditErrorDetails(null);
    const def =
      supplierBalance?.debit_balance != null
        ? Number(supplierBalance.debit_balance).toFixed(2)
        : "";
    setCreditAmount(def);
    setCreditReference("");
    setCreditNotes("");
    setShowCreditModal(true);
  };

  const handleCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;

    setCreditError(null);
    setCreditErrorDetails(null);

    const amount = parseFloat(creditAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setCreditError("Enter a valid positive amount");
      return;
    }

    if (creditKind === "adjustment" && !creditNotes.trim()) {
      setCreditError("Reason is required for partial payments");
      return;
    }

    setCreditSubmitting(true);
    try {
      const result = await apiCall(`/api/suppliers/${selectedSupplier.id}/credit`, {
        method: "POST",
        body: JSON.stringify({
          transaction_type: creditKind,
          amount,
          notes: creditNotes.trim() || undefined,
          reference: creditReference.trim() || undefined,
        }),
      });

      if (result.status === 200) {
        setShowCreditModal(false);
        await fetchSupplierDetails(selectedSupplier.id);
      } else {
        setCreditError(result.error || "Operation failed");
        setCreditErrorDetails(result.errorDetails ?? null);
      }
    } catch {
      setCreditError("Network error occurred");
      setCreditErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setCreditSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError("Supplier name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        contact_person: formData.contact_person.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : 0,
        payment_terms: formData.payment_terms.trim() || null,
        status: formData.status,
      };

      const url = selectedSupplier
        ? `/api/suppliers/${selectedSupplier.id}`
        : "/api/suppliers";
      const method = selectedSupplier ? "PATCH" : "POST";

      const result = await apiCall(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (result.status >= 200 && result.status < 300) {
        await fetchSuppliers();
        setShowAddModal(false);
        setShowEditModal(false);
        setSelectedSupplier(null);
        setFormData({
          name: "",
          contact_person: "",
          email: "",
          phone: "",
          address: "",
          credit_limit: "",
          payment_terms: "",
          status: "active",
        });
      } else {
        if (result.status === 403) {
          setAuthError({ message: result.error || "Access denied" });
        }
        setFormError(result.error || "Failed to save supplier");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setFormError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedSupplier) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const result = await apiCall(`/api/suppliers/${selectedSupplier.id}`, {
        method: "DELETE",
      });

      if (result.status === 204 || result.status >= 200 && result.status < 300) {
        await fetchSuppliers();
        setShowDeleteModal(false);
        setSelectedSupplier(null);
      } else {
        if (result.status === 403) {
          setAuthError({ message: result.error || "Access denied" });
        }
        setFormError(result.error || "Failed to delete supplier");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setFormError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearErrors = () => {
    setError(null);
    setErrorDetails(null);
    setAuthError(null);
  };

  if (isLoading) {
    return (
      <RoleAwareLayout>
        <div className="container-fluid">
          <div className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        </div>
      </RoleAwareLayout>
    );
  }

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-truck me-2"></i>
            Supplier Management
          </h1>
        </PageHeaderStrip>

        <ErrorDisplay
          error={error}
          errorDetails={errorDetails}
          onDismiss={clearErrors}
        />

        {/* Search and Filter */}
        <CollapsibleFilterSectionCard className="mb-4">
            <Form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <Row className="g-2 align-items-end">
                <Col md={6}>
                  <InputGroup>
                    <InputGroup.Text>
                      <i className="bi bi-search"></i>
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Search suppliers by name, contact, email, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                </Col>
                <Col md={3}>
                  <Form.Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Form.Select>
                </Col>
                <Col md={3} className="d-flex justify-content-end">
                  <Button
                    type="button"
                    variant="outline-secondary"
                    size="sm"
                    disabled={!supplierFiltersActive}
                    onClick={clearSupplierFilters}
                  >
                    <i className="bi bi-x-lg me-1" aria-hidden />
                    Clear filters
                  </Button>
                </Col>
              </Row>
            </Form>
        </CollapsibleFilterSectionCard>

        {/* Suppliers Table */}
        <Card>
          <Card.Header className="bg-light fw-bold d-flex justify-content-between align-items-center">
            <span>Suppliers ({filteredSuppliers.length})</span>
            <div className="d-flex gap-2">
              <Button variant="primary" size="sm" onClick={handleAdd}>
                <i className="bi bi-plus-circle me-1"></i>
                Add Supplier
              </Button>
            </div>
          </Card.Header>
          <Card.Body>
            {filteredSuppliers.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-inbox fs-1 text-muted d-block mb-3"></i>
                <p className="text-muted">
                  {searchTerm || statusFilter !== "all"
                    ? "No suppliers match your search criteria"
                    : "No suppliers found. Click 'Add Supplier' to get started."}
                </p>
              </div>
            ) : (
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact Person</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Credit Limit</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td className="fw-semibold">{supplier.name}</td>
                      <td>{supplier.contact_person || "-"}</td>
                      <td>{supplier.email || "-"}</td>
                      <td>{supplier.phone || "-"}</td>
                      <td>${supplier?.credit_limit != null ? Number(supplier.credit_limit).toFixed(2) : "0.00"}</td>
                      <td>
                        <Badge bg={supplier.status === "active" ? "success" : "secondary"}>
                          {supplier.status}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          variant="outline-info"
                          size="sm"
                          className="me-1"
                          onClick={() => handleViewDetails(supplier)}
                          title="View Details"
                        >
                          <i className="bi bi-eye me-1"></i>
                          View
                        </Button>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-1"
                          onClick={() => handleEdit(supplier)}
                          title="Edit"
                        >
                          <i className="bi bi-pencil me-1"></i>
                          Edit
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(supplier)}
                          title="Delete"
                        >
                          <i className="bi bi-trash me-1"></i>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>

        {/* Add Supplier Modal */}
        <Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Add New Supplier</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmit}>
            <Modal.Body>
              {formError && errorDetails?.status === 403 ? (
                <ErrorDisplay
                  error={formError}
                  errorDetails={errorDetails}
                  onDismiss={() => {
                    setFormError(null);
                    setErrorDetails(null);
                  }}
                />
              ) : formError ? (
                <Alert variant="danger" dismissible onClose={() => setFormError(null)}>
                  {formError}
                </Alert>
              ) : null}
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Supplier Name <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Contact Person</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Phone</Form.Label>
                    <Form.Control
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </Form.Group>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Credit Limit</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "inactive" })}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>Payment Terms</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  placeholder="e.g., Net 30, Net 60"
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  "Add Supplier"
                )}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Edit Supplier Modal */}
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Edit Supplier</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmit}>
            <Modal.Body>
              {formError && errorDetails?.status === 403 ? (
                <ErrorDisplay
                  error={formError}
                  errorDetails={errorDetails}
                  onDismiss={() => {
                    setFormError(null);
                    setErrorDetails(null);
                  }}
                />
              ) : formError ? (
                <Alert variant="danger" dismissible onClose={() => setFormError(null)}>
                  {formError}
                </Alert>
              ) : null}
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Supplier Name <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Contact Person</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Phone</Form.Label>
                    <Form.Control
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </Form.Group>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Credit Limit</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "inactive" })}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>Payment Terms</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  placeholder="e.g., Net 30, Net 60"
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  "Update Supplier"
                )}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
          <Modal.Header closeButton className="align-items-center">
            <Modal.Title className="d-flex align-items-center gap-2 mb-0">
              Confirm Delete
              <HelpPopover id="suppliers-delete-warning" title="Deleting a supplier" ariaLabel="Help for delete supplier">
                This cannot be undone for the supplier record. Existing purchase orders and transactions remain in the system
                for audit history.
              </HelpPopover>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {formError && errorDetails?.status === 403 ? (
              <ErrorDisplay
                error={formError}
                errorDetails={errorDetails}
                onDismiss={() => {
                  setFormError(null);
                  setErrorDetails(null);
                }}
              />
            ) : formError ? (
              <Alert variant="danger" dismissible onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            ) : null}
            <p className="mb-0">
              Are you sure you want to delete supplier <strong>{selectedSupplier?.name}</strong>?
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Supplier Details Modal */}
        <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="bi bi-building me-2"></i>
              {selectedSupplier?.name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedSupplier && (
              <>
                <Row className="mb-4">
                  <Col md={6}>
                    <Card className="h-100">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">Contact Information</h6>
                      </Card.Header>
                      <Card.Body>
                        <p className="mb-2">
                          <strong>Contact Person:</strong> {selectedSupplier.contact_person || "-"}
                        </p>
                        <p className="mb-2">
                          <strong>Email:</strong> {selectedSupplier.email || "-"}
                        </p>
                        <p className="mb-2">
                          <strong>Phone:</strong> {selectedSupplier.phone || "-"}
                        </p>
                        <p className="mb-0">
                          <strong>Address:</strong> {selectedSupplier.address || "-"}
                        </p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card className="h-100">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">Financial Information</h6>
                      </Card.Header>
                      <Card.Body>
                        <p className="mb-2">
                          <strong>Credit Limit:</strong> ${selectedSupplier?.credit_limit != null ? Number(selectedSupplier.credit_limit).toFixed(2) : "0.00"}
                        </p>
                        <p className="mb-2">
                          <strong>Payment Terms:</strong> {selectedSupplier.payment_terms || "-"}
                        </p>
                        <p className="mb-0">
                          <strong>Status:</strong>{" "}
                          <Badge bg={selectedSupplier.status === "active" ? "success" : "secondary"}>
                            {selectedSupplier.status}
                          </Badge>
                        </p>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {/* Balance Information */}
                <Card className="mb-4">
                  <Card.Header className="bg-light d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <h6 className="mb-0">Balance Information</h6>
                    {canAddSupplierPayment &&
                      supplierBalance &&
                      !loadingBalance &&
                      Number(supplierBalance.debit_balance) > 0 && (
                        <div className="d-flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => openCreditModal("payment")}
                          >
                            Record payment
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={() => openCreditModal("adjustment")}
                          >
                            Partial payment
                          </Button>
                        </div>
                      )}
                  </Card.Header>
                  <Card.Body>
                    {loadingBalance ? (
                      <div className="text-center py-3">
                        <Spinner animation="border" size="sm" />
                      </div>
                    ) : supplierBalance ? (
                      <Row>
                        <Col md={4}>
                          <div className="text-center">
                            <p className="text-muted mb-1">Credit Balance</p>
                            <h4 className="text-success">${(Number(supplierBalance.credit_balance) || 0).toFixed(2)}</h4>
                          </div>
                        </Col>
                        <Col md={4}>
                          <div className="text-center">
                            <p className="text-muted mb-1">Debit Balance</p>
                            <h4 className="text-danger">${(Number(supplierBalance.debit_balance) || 0).toFixed(2)}</h4>
                          </div>
                        </Col>
                        <Col md={4}>
                          <div className="text-center">
                            <p className="text-muted mb-1">Net Balance</p>
                            <h4
                              className={
                                Number(supplierBalance.net_balance ?? 0) > 0
                                  ? "text-danger"
                                  : Number(supplierBalance.net_balance ?? 0) < 0
                                    ? "text-success"
                                    : "text-muted"
                              }
                            >
                              ${(Number(supplierBalance.net_balance) || 0).toFixed(2)}
                            </h4>
                          </div>
                        </Col>
                      </Row>
                    ) : (
                      <p className="text-muted">No balance information available</p>
                    )}
                  </Card.Body>
                </Card>

                {/* Recent Transactions */}
                <Card>
                  <Card.Header className="bg-light d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <h6 className="mb-0">Recent transactions (last 5)</h6>
                    {selectedSupplier && (
                      <Link
                        href={`/storekeeper/suppliers/transactions?supplierId=${selectedSupplier.id}`}
                        className="btn btn-sm btn-outline-primary"
                      >
                        View all payments
                      </Link>
                    )}
                  </Card.Header>
                  <Card.Body>
                    {loadingTransactions ? (
                      <div className="text-center py-3">
                        <Spinner animation="border" size="sm" />
                      </div>
                    ) : supplierTransactions.length > 0 ? (
                      <Table responsive size="sm">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Debit</th>
                            <th>Credit</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {supplierTransactions.slice(0, 5).map((transaction: any, index: number) => (
                            <tr key={transaction.id ?? index}>
                              <td>{new Date(transaction.created_at).toLocaleDateString()}</td>
                              <td>
                                <Badge bg="info">{formatSupplierTransactionLabel(transaction.transaction_type)}</Badge>
                              </td>
                              <td className={transaction.debit_amount > 0 ? "text-danger" : ""}>
                                {transaction.debit_amount > 0 ? `$${(Number(transaction.debit_amount) || 0).toFixed(2)}` : "-"}
                              </td>
                              <td className={transaction.credit_amount > 0 ? "text-success" : ""}>
                                {transaction.credit_amount > 0 ? `$${(Number(transaction.credit_amount) || 0).toFixed(2)}` : "-"}
                              </td>
                              <td>{transaction.notes || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : (
                      <p className="text-muted">No transactions found</p>
                    )}
                  </Card.Body>
                </Card>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showCreditModal} onHide={() => !creditSubmitting && setShowCreditModal(false)}>
          <Modal.Header closeButton className="align-items-center">
            <Modal.Title className="d-flex align-items-center gap-2 mb-0">
              {creditKind === "payment" ? "Record payment" : "Partial payment"}
              <HelpPopover
                id="suppliers-credit-payment"
                title={creditKind === "payment" ? "Recording payment" : "Partial payment"}
                ariaLabel="Help for supplier payment"
              >
                Applies a credit to this supplier&apos;s account up to the current debit balance. Use reference and notes for
                reconciliation and audits.
              </HelpPopover>
            </Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleCreditSubmit}>
            <Modal.Body>
              {creditError && (
                <ErrorDisplay
                  error={creditError}
                  errorDetails={creditErrorDetails}
                  onDismiss={() => {
                    setCreditError(null);
                    setCreditErrorDetails(null);
                  }}
                />
              )}
              <Form.Group className="mb-3">
                <Form.Label>Amount</Form.Label>
                <InputGroup>
                  <InputGroup.Text>$</InputGroup.Text>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min={0.01}
                    value={creditAmount}
                    onChange={e => setCreditAmount(e.target.value)}
                    required
                  />
                </InputGroup>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Reference (optional)</Form.Label>
                <Form.Control
                  type="text"
                  value={creditReference}
                  onChange={e => setCreditReference(e.target.value)}
                  placeholder="Check #, transfer id, etc."
                />
              </Form.Group>
              <Form.Group className="mb-0">
                <Form.Label>{creditKind === "adjustment" ? "Reason (required)" : "Notes (optional)"}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={creditNotes}
                  onChange={e => setCreditNotes(e.target.value)}
                  placeholder={
                    creditKind === "adjustment"
                      ? "Describe why this partial payment is recorded"
                      : "Optional notes"
                  }
                  required={creditKind === "adjustment"}
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                type="button"
                disabled={creditSubmitting}
                onClick={() => setShowCreditModal(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={creditSubmitting}>
                {creditSubmitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving…
                  </>
                ) : creditKind === "payment" ? (
                  "Record payment"
                ) : (
                  "Save partial payment"
                )}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </div>
    </RoleAwareLayout>
  );
}


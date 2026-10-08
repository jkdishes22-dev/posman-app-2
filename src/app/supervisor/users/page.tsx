"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Card,
  Form,
  InputGroup,
  Modal,
  Spinner,
  Table,
  Badge,
} from "react-bootstrap";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import PageHeaderStrip from "src/app/components/PageHeaderStrip";
import ErrorDisplay from "src/app/components/ErrorDisplay";
import Pagination from "src/app/components/Pagination";
import { useApiCall } from "src/app/utils/apiUtils";
import { ApiErrorResponse } from "src/app/utils/errorUtils";

interface UserRow {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  status: string;
  is_locked?: boolean;
  roles: { id: number; name: string }[];
}

export default function SupervisorUsersPage() {
  const apiCall = useApiCall();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);

  // Reset password modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState("");

  // Lock/unlock
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorDetails(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.set("search", search);
      const result = await apiCall(`/api/users?${params.toString()}`);
      if (result.status === 200) {
        setUsers(result.data.users ?? []);
        setTotal(result.data.total ?? 0);
      } else {
        setError(result.error || "Failed to load users");
        setErrorDetails(result.errorDetails ?? null);
      }
    } catch {
      setError("Network error");
      setErrorDetails({ message: "Network error", networkError: true, status: 0 });
    } finally {
      setLoading(false);
    }
  }, [apiCall, page, pageSize, search]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const openResetModal = (user: UserRow) => {
    setSelectedUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setResetError("");
    setResetSuccess("");
    setShowResetModal(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 4) {
      setResetError("Password must be at least 4 characters.");
      return;
    }
    setResetLoading(true);
    setResetError("");
    try {
      const result = await apiCall(`/api/users?userId=${selectedUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "reset-password", newPassword }),
      });
      if (result.status === 200) {
        setResetSuccess(`Password reset for ${selectedUser.firstName} ${selectedUser.lastName}. They will be prompted to change it on next login.`);
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setResetError(result.error || "Failed to reset password.");
      }
    } catch {
      setResetError("Network error occurred.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleLockToggle = async (user: UserRow) => {
    setActionLoading(user.id);
    try {
      const action = user.is_locked ? "unlock" : "lock";
      const result = await apiCall(`/api/users?userId=${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      if (result.status === 200) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, is_locked: !user.is_locked } : u))
        );
      } else {
        setError(result.error || `Failed to ${action} user.`);
      }
    } catch {
      setError("Network error occurred.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const roleBadgeColor = (name: string) => {
    switch (name) {
      case "admin": return "danger";
      case "supervisor": return "warning";
      case "cashier": return "primary";
      case "sales": return "success";
      case "storekeeper": return "info";
      default: return "secondary";
    }
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-people me-2"></i>
            User Management
          </h1>
          <p className="mb-0 mt-1 small text-white-50">View users and reset passwords</p>
        </PageHeaderStrip>

        <ErrorDisplay
          error={error}
          errorDetails={errorDetails}
          onDismiss={() => { setError(null); setErrorDetails(null); }}
        />

        <Card className="shadow-sm mb-3">
          <Card.Body className="py-2">
            <Form onSubmit={handleSearch} className="d-flex gap-2">
              <InputGroup size="sm" style={{ maxWidth: 340 }}>
                <Form.Control
                  placeholder="Search by name or username…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <Button type="submit" variant="primary" disabled={loading}>
                  <i className="bi bi-search"></i>
                </Button>
                {search && (
                  <Button
                    variant="outline-secondary"
                    onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
                  >
                    <i className="bi bi-x"></i>
                  </Button>
                )}
              </InputGroup>
              {loading && <Spinner animation="border" size="sm" className="ms-2 align-self-center" />}
            </Form>
          </Card.Body>
        </Card>

        <Card className="shadow-sm">
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id}>
                        <td className="text-muted small">{user.id}</td>
                        <td>
                          <div className="fw-semibold">{user.firstName} {user.lastName}</div>
                          {user.is_locked && (
                            <span className="badge bg-danger small">
                              <i className="bi bi-lock-fill me-1"></i>Locked
                            </span>
                          )}
                        </td>
                        <td className="text-muted">{user.username}</td>
                        <td>
                          {user.roles.map((r) => (
                            <Badge key={r.id} bg={roleBadgeColor(r.name)} className="me-1 text-capitalize">
                              {r.name}
                            </Badge>
                          ))}
                        </td>
                        <td>
                          <Badge bg={user.status === "ACTIVE" ? "success" : user.status === "DELETED" ? "danger" : "secondary"}>
                            {user.status}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => openResetModal(user)}
                              title="Reset password"
                              disabled={user.status === "DELETED"}
                            >
                              <i className="bi bi-key me-1"></i>Reset Password
                            </Button>
                            <Button
                              size="sm"
                              variant={user.is_locked ? "outline-success" : "outline-warning"}
                              onClick={() => handleLockToggle(user)}
                              disabled={actionLoading === user.id || user.status === "DELETED"}
                              title={user.is_locked ? "Unlock account" : "Lock account"}
                            >
                              {actionLoading === user.id ? (
                                <Spinner animation="border" size="sm" />
                              ) : (
                                <i className={`bi ${user.is_locked ? "bi-unlock" : "bi-lock"}`}></i>
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>

        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          recordLabel="users"
          onPageChange={setPage}
        />

        {/* Reset Password Modal */}
        <Modal show={showResetModal} onHide={() => setShowResetModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="bi bi-key me-2"></i>
              Reset Password
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedUser && (
              <p className="text-muted mb-3">
                Setting a new password for <strong>{selectedUser.firstName} {selectedUser.lastName}</strong> ({selectedUser.username}).
                They will be required to change it on next login.
              </p>
            )}

            {resetSuccess ? (
              <div className="alert alert-success">
                <i className="bi bi-check-circle me-2"></i>{resetSuccess}
              </div>
            ) : (
              <>
                {resetError && (
                  <div className="alert alert-danger">{resetError}</div>
                )}
                <Form.Group className="mb-3">
                  <Form.Label>New Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label>Confirm Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                  />
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowResetModal(false)}>
              {resetSuccess ? "Close" : "Cancel"}
            </Button>
            {!resetSuccess && (
              <Button
                variant="primary"
                onClick={handleResetPassword}
                disabled={resetLoading || !newPassword || !confirmPassword}
              >
                {resetLoading ? (
                  <><Spinner animation="border" size="sm" className="me-2" />Resetting…</>
                ) : (
                  "Reset Password"
                )}
              </Button>
            )}
          </Modal.Footer>
        </Modal>
      </div>
    </RoleAwareLayout>
  );
}

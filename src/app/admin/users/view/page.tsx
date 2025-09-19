"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import NewUser from "../register/new-user";
import { AuthError, User } from "../../../types/types";
import Pagination from "../../../components/Pagination";
import { withSecureRoute } from "../../../components/withSecureRoute";

const DEFAULT_PAGE_SIZE = parseInt(process.env.NEXT_PUBLIC_PAGE_SIZE || "10", 10);
const DEFAULT_REFRESH_INTERVAL_SECONDS = parseInt(process.env.NEXT_PUBLIC_REFRESH_INTERVAL_SECONDS || "300", 10);

function UsersPage() {
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [authError, setAuthError] = useState<AuthError>(null);
  const [fetchUserError, setFetchUserError] = useState<string>("");
  const [showAssignRoleModal, setShowAssignRoleModal] = useState(false);
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [assignRoleError, setAssignRoleError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showAssignRoleConfirmModal, setShowAssignRoleConfirmModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({ firstName: "", lastName: "", username: "" });
  const [lockLoading, setLockLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [reactivateError, setReactivateError] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [lockError, setLockError] = useState("");

  const handleClose = () => {
    setShowModal(false);
  };

  const handleShow = () => {
    setShowModal(true);
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  useEffect(() => {
    const intervalSeconds = DEFAULT_REFRESH_INTERVAL_SECONDS;
    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem("token", data.token);
        } else {
          setSessionError("Session expired. You will be redirected to login.");
          setTimeout(() => {
            localStorage.removeItem("token");
            window.location.href = "/login";
          }, 3000);
        }
      } catch {
        setSessionError("Session expired. You will be redirected to login.");
        setTimeout(() => {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }, 3000);
      }
    }, intervalSeconds * 1000);
    return () => clearInterval(interval);
  }, []);

  async function fetchUsers() {
    const token = localStorage.getItem("token");
    const response = await fetch(`/api/users?page=${page}&pageSize=${DEFAULT_PAGE_SIZE}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (response.ok) {
      setUsers(data.users);
      setTotal(data.total);
    } else if (response.status === 403) {
      setAuthError(data);
    } else {
      setFetchUserError("Failed to fetch users" + JSON.stringify(data));
    }
  }

  async function handleCreateUser(formData) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response) {
        const data = await response.json();
        if (response.status === 201) {
          setError("");
          const newUser = data;
          setUsers((prevUsers) => [...prevUsers, newUser]);
          handleClose();
        } else {
          setError(data.error);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      await fetchUsers();
    }
  }

  const filteredUsers = users.filter(
    (user: User) =>
      user.firstName.toLowerCase().includes(filter.toLowerCase()) ||
      user.lastName.toLowerCase().includes(filter.toLowerCase()) ||
      user.username.toLowerCase().includes(filter.toLowerCase()),
  );

  const handleUserSelect = (user) => {
    setSelectedUser(user);
  };

  const handleAssignRoleClick = async () => {
    setAssignRoleError("");
    setShowAssignRoleModal(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/roles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch roles");
      const data = await response.json();
      setRoles(data);
      if (selectedUser && selectedUser.role && selectedUser.role.id) {
        setSelectedRoleId(selectedUser.role.id.toString());
      } else if (selectedUser && selectedUser.role_id) {
        setSelectedRoleId(selectedUser.role_id.toString());
      } else {
        setSelectedRoleId(data.length > 0 ? data[0].id.toString() : "");
      }
    } catch (error: any) {
      setAssignRoleError(error.message || "Failed to fetch roles");
    }
  };

  const handleAssignRole = async () => {
    setAssignRoleError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/roles", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "assignRole",
          userId: selectedUser.id,
          roleId: selectedRoleId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to assign role");
      setSelectedUser((prev) => ({ ...prev, role_name: roles.find((r) => r.id.toString() === selectedRoleId)?.name, role_id: selectedRoleId }));
      setShowAssignRoleModal(false);
      await fetchUsers();
    } catch (error: any) {
      setAssignRoleError(error.message || "Failed to assign role");
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setDeleteError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/users?userId=${selectedUser.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const data = await response.json();
        setDeleteError(data.error || "Failed to delete user");
        return;
      }
      await fetchUsers();
      setSelectedUser(null);
      setShowDeleteModal(false);
    } catch (err) {
      setDeleteError("Failed to delete user");
      setShowDeleteModal(false);
    }
  };

  const handleReactivateUser = async () => {
    if (!selectedUser) return;
    setReactivateError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/users?userId=${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "reactivate" }),
      });
      if (!response.ok) {
        const data = await response.json();
        setReactivateError(data.error || "Failed to reactivate user");
        return;
      }
      await fetchUsers();
      setSelectedUser(null);
      setShowReactivateModal(false);
    } catch (err) {
      setReactivateError("Failed to reactivate user");
      setShowReactivateModal(false);
    }
  };

  const handleShowUpdateModal = () => {
    setUpdateForm({
      firstName: selectedUser.firstName,
      lastName: selectedUser.lastName,
      username: selectedUser.username,
    });
    setShowUpdateModal(true);
  };

  const handleUpdateFormChange = (e) => {
    setUpdateForm({ ...updateForm, [e.target.name]: e.target.value });
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setUpdateError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/users?userId=${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "update",
          firstName: updateForm.firstName,
          lastName: updateForm.lastName,
          username: updateForm.username,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        setUpdateError(data.error || "Failed to update user");
        return;
      }
      await fetchUsers();
      setShowUpdateModal(false);
    } catch (err) {
      setUpdateError("Failed to update user");
      setShowUpdateModal(false);
    }
  };

  const handleLockUser = async () => {
    if (!selectedUser) return;
    setLockLoading(true);
    setLockError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/users?userId=${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: selectedUser.is_locked ? "unlock" : "lock",
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        setLockError(data.error || "Failed to lock/unlock user");
        return;
      }
      const updatedUser = await response.json();
      await fetchUsers();
      setSelectedUser(updatedUser);
      setShowLockModal(false);
    } catch (err) {
      setLockError("Failed to lock/unlock user");
      setShowLockModal(false);
    } finally {
      setLockLoading(false);
    }
  };

  const handleAssignRoleConfirm = () => {
    setShowAssignRoleConfirmModal(false);
    handleAssignRoleClick();
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        {/* Header */}
        <div className="bg-primary text-white p-3 mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="h4 mb-0 fw-bold">
              <i className="bi bi-people me-2"></i>
              User Management
            </h1>
            <div className="d-flex align-items-center gap-3">
              <span className="badge bg-light text-dark">
                <i className="bi bi-people-fill me-1"></i>
                {total} Total Users
              </span>
              <button
                type="button"
                className="btn btn-light btn-sm"
                onClick={handleShow}
              >
                <i className="bi bi-person-plus me-1"></i>
                Add User
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {sessionError && (
          <div className="alert alert-warning alert-dismissible fade show mb-4" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {sessionError}
            <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close" onClick={() => setSessionError("")}></button>
          </div>
        )}

        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm">
              <div className="card-header bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold">
                    <i className="bi bi-people me-2 text-primary"></i>
                    Users
                    <span className="badge bg-light text-dark ms-2">
                      {filteredUsers.length} of {total}
                    </span>
                  </h5>
                  <div className="position-relative">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search users..."
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      style={{ width: '220px', paddingRight: '2.5rem' }}
                    />
                    <i className="bi bi-search position-absolute top-50 end-0 translate-middle-y me-3 text-muted"></i>
                    {filter && (
                      <button
                        type="button"
                        className="btn btn-sm position-absolute top-50 end-0 translate-middle-y me-1"
                        onClick={() => setFilter('')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#6b7280',
                          padding: '0.25rem',
                          lineHeight: 1
                        }}
                        title="Clear search"
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="card-body p-0">
                {fetchUserError && (
                  <div className="alert alert-danger m-3" role="alert">
                    {fetchUserError}
                  </div>
                )}
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="text-center" style={{ width: '50px' }}>
                          <i className="bi bi-check2-square text-muted"></i>
                        </th>
                        <th className="fw-semibold">First Name</th>
                        <th className="fw-semibold">Last Name</th>
                        <th className="fw-semibold">Username</th>
                        <th className="fw-semibold text-center">Role</th>
                        <th className="fw-semibold text-center">Status</th>
                        <th className="fw-semibold text-center">Locked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-5">
                            <div className="empty-state">
                              <i className="bi bi-search text-muted" style={{ fontSize: '3rem' }}></i>
                              <h5 className="text-muted mt-3 mb-2">No users found</h5>
                              <p className="text-muted mb-0">
                                {filter ? 'Try adjusting your search terms' : 'No users available'}
                              </p>
                              {filter && (
                                <button
                                  className="btn btn-outline-primary btn-sm mt-2"
                                  onClick={() => setFilter('')}
                                >
                                  Clear search
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr
                            key={user.id}
                            onClick={() => handleUserSelect(user)}
                            style={{ cursor: "pointer" }}
                            className={`user-row ${selectedUser && selectedUser.id === user.id ? 'table-primary selected' : ''}`}
                            title={`Click to view details for ${user.firstName} ${user.lastName}`}
                          >
                            <td className="text-center">
                              <div className="form-check">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={!!(selectedUser && selectedUser.id === user.id)}
                                  onChange={() => handleUserSelect(user)}
                                  onClick={e => e.stopPropagation()}
                                  title={`Select ${user.firstName} ${user.lastName}`}
                                />
                              </div>
                            </td>
                            <td className="fw-medium">
                              <div className="d-flex align-items-center">
                                <div className="user-avatar me-2">
                                  <i className="bi bi-person-circle text-muted"></i>
                                </div>
                                <div>
                                  <div className="fw-medium">{user.firstName}</div>
                                  <small className="text-muted">ID: {user.id}</small>
                                </div>
                              </div>
                            </td>
                            <td className="fw-medium">{user.lastName}</td>
                            <td>
                              <code className="text-muted">@{user.username}</code>
                            </td>
                            <td>
                              {user.roles && user.roles.length > 0 ? (
                                <span className="badge bg-primary rounded-pill" title={`Role: ${user.roles[0].name}`}>
                                  <i className="bi bi-shield-check me-1"></i>
                                  {user.roles[0].name}
                                </span>
                              ) : (
                                <span className="badge bg-light text-muted rounded-pill" title="No role assigned">
                                  <i className="bi bi-shield-x me-1"></i>
                                  No role
                                </span>
                              )}
                            </td>
                            <td className="text-center">
                              {user.status === "DELETED" ? (
                                <span className="badge bg-danger rounded-pill" title="User is deleted">
                                  <i className="bi bi-x-circle me-1"></i>
                                  Deleted
                                </span>
                              ) : (
                                <span className="badge bg-success rounded-pill" title="User is active">
                                  <i className="bi bi-check-circle me-1"></i>
                                  Active
                                </span>
                              )}
                            </td>
                            <td className="text-center">
                              {user.is_locked ? (
                                <span className="badge bg-warning rounded-pill" title="User account is locked">
                                  <i className="bi bi-lock-fill me-1"></i>
                                  Locked
                                </span>
                              ) : (
                                <span className="badge bg-light text-success rounded-pill" title="User account is unlocked">
                                  <i className="bi bi-unlock me-1"></i>
                                  Unlocked
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-3">
                  <Pagination
                    page={page}
                    pageSize={DEFAULT_PAGE_SIZE}
                    total={total}
                    onPageChange={setPage}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold">
                    <i className="bi bi-person me-2 text-primary"></i>
                    User Details
                  </h5>
                  {selectedUser && (
                    <div className="d-flex align-items-center gap-2">
                      {selectedUser.status === "DELETED" ? (
                        <span className="badge bg-danger">
                          <i className="bi bi-x-circle me-1"></i>
                          Deleted
                        </span>
                      ) : (
                        <span className="badge bg-success">
                          <i className="bi bi-check-circle me-1"></i>
                          Active
                        </span>
                      )}
                      {selectedUser.is_locked && (
                        <span className="badge bg-warning">
                          <i className="bi bi-lock-fill me-1"></i>
                          Locked
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="card-body">
                {selectedUser ? (
                  <div>
                    <div className="user-profile-header mb-4">
                      <div className="d-flex align-items-center mb-3">
                        <div className="user-avatar-large me-3">
                          <i className="bi bi-person-circle text-primary"></i>
                        </div>
                        <div>
                          <h4 className="text-primary mb-1">{selectedUser.firstName} {selectedUser.lastName}</h4>
                          <p className="text-muted mb-0">
                            <i className="bi bi-at me-1"></i>
                            @{selectedUser.username}
                          </p>
                        </div>
                      </div>
                      <div className="role-badge-container">
                        <span className="badge bg-primary fs-6 px-3 py-2">
                          <i className="bi bi-shield-check me-2"></i>
                          {selectedUser.roles && selectedUser.roles.length > 0 ? selectedUser.roles[0].name : "No role assigned"}
                        </span>
                      </div>
                    </div>

                    <div className="action-buttons mb-4">
                      <div className="row g-2">
                        <div className="col-6 col-md-3">
                          <button
                            type="button"
                            className="btn btn-warning btn-sm w-100"
                            onClick={handleShowUpdateModal}
                          >
                            <i className="bi bi-pencil me-1"></i>
                            Update
                          </button>
                        </div>
                        <div className="col-6 col-md-3">
                          <button
                            type="button"
                            className="btn btn-danger btn-sm w-100"
                            onClick={() => setShowDeleteModal(true)}
                            disabled={selectedUser.status === "DELETED"}
                          >
                            <i className="bi bi-trash me-1"></i>
                            Deactivate
                          </button>
                        </div>
                        <div className="col-6 col-md-3">
                          <button
                            className="btn btn-info btn-sm w-100"
                            onClick={() => setShowLockModal(true)}
                          >
                            <i className={`bi ${selectedUser.is_locked ? "bi-unlock" : "bi-lock"} me-1`}></i>
                            {selectedUser.is_locked ? "Unlock" : "Lock"}
                          </button>
                        </div>
                        <div className="col-6 col-md-3">
                          <button
                            className="btn btn-secondary btn-sm w-100"
                            onClick={() => setShowAssignRoleConfirmModal(true)}
                          >
                            <i className="bi bi-person-gear me-1"></i>
                            Assign Role
                          </button>
                        </div>
                      </div>
                      {selectedUser.status === "DELETED" && (
                        <div className="mt-2">
                          <button
                            className="btn btn-success w-100"
                            onClick={() => setShowReactivateModal(true)}
                          >
                            <i className="bi bi-arrow-clockwise me-1"></i>
                            Reactivate User
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="table-responsive">
                      <table className="table table-sm">
                        <tbody>
                          <tr>
                            <td className="fw-bold">First Name</td>
                            <td>{selectedUser.firstName}</td>
                          </tr>
                          <tr>
                            <td className="fw-bold">Last Name</td>
                            <td>{selectedUser.lastName}</td>
                          </tr>
                          <tr>
                            <td className="fw-bold">Username</td>
                            <td>{selectedUser.username}</td>
                          </tr>
                          <tr>
                            <td className="fw-bold">Status</td>
                            <td>
                              {selectedUser.status === "DELETED" ? (
                                <span className="badge bg-danger">Deleted</span>
                              ) : (
                                <span className="badge bg-success">Active</span>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td className="fw-bold">Locked</td>
                            <td>
                              {selectedUser.is_locked ? (
                                <span className="badge bg-warning">Yes</span>
                              ) : (
                                <span className="badge bg-light text-dark">No</span>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <i className="bi bi-person text-muted" style={{ fontSize: '3rem' }}></i>
                    <p className="text-muted mt-3 mb-0">Select a user to view their details</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <NewUser
          onClose={handleClose}
          onSave={handleCreateUser}
          error={error}
        />
      )}
      {showAssignRoleModal && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Assign Role</h5>
              </div>
              <div className="modal-body">
                {assignRoleError && <p style={{ color: "red" }}>{assignRoleError}</p>}
                <form>
                  <div className="form-group">
                    <label htmlFor="roleSelect">Select Role</label>
                    <select
                      className="form-control"
                      id="roleSelect"
                      value={selectedRoleId}
                      onChange={(e) => setSelectedRoleId(e.target.value)}
                    >
                      <option value="">Select a role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignRoleModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleAssignRole} disabled={!selectedRoleId}>
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Deactivate</h5>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to deactivate user <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong>?</p>
                {deleteError && <div className="alert alert-danger py-1 my-2">{deleteError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteUser}>
                  Deactivate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showReactivateModal && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Reactivation</h5>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to reactivate user <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong>?</p>
                {reactivateError && <div className="alert alert-danger py-1 my-2">{reactivateError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowReactivateModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-success" onClick={handleReactivateUser}>
                  Reactivate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showUpdateModal && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Update User</h5>
              </div>
              <div className="modal-body">
                {updateError && <div className="alert alert-danger py-1 my-2">{updateError}</div>}
                <form>
                  <div className="mb-3">
                    <label className="form-label">First Name</label>
                    <input type="text" className="form-control" name="firstName" value={updateForm.firstName} onChange={handleUpdateFormChange} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Last Name</label>
                    <input type="text" className="form-control" name="lastName" value={updateForm.lastName} onChange={handleUpdateFormChange} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Username</label>
                    <input type="text" className="form-control" name="username" value={updateForm.username} onChange={handleUpdateFormChange} />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUpdateModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-warning" onClick={handleUpdateUser}>
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showLockModal && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm {selectedUser.is_locked ? "Unlock" : "Lock"}</h5>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to {selectedUser.is_locked ? "unlock" : "lock"} user <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong>?</p>
                {lockError && <div className="alert alert-danger py-1 my-2">{lockError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowLockModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-info" onClick={handleLockUser} disabled={lockLoading}>
                  {lockLoading ? (selectedUser.is_locked ? "Unlocking..." : "Locking...") : (selectedUser.is_locked ? "Unlock" : "Lock")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showAssignRoleConfirmModal && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Assign Role</h5>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to assign a new role to user <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong>?</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignRoleConfirmModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleAssignRoleConfirm}>
                  Assign Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </RoleAwareLayout>
  );
}

export default withSecureRoute(UsersPage, { roleRequired: "admin" });

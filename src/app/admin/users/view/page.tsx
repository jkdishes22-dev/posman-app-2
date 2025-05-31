"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import AdminLayout from "../../../shared/AdminLayout";
import NewUser from "../register/new-user";
import { AuthError, User } from "../../../types/types";
import Pagination from "../../../components/Pagination";

const DEFAULT_PAGE_SIZE = parseInt(process.env.NEXT_PUBLIC_PAGE_SIZE || "10", 10);
const DEFAULT_REFRESH_INTERVAL_SECONDS = parseInt(process.env.NEXT_PUBLIC_REFRESH_INTERVAL_SECONDS || "300", 10);

export default function UsersPage() {
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
    <AdminLayout authError={authError}>
      {sessionError && (
        <div className="alert alert-warning alert-dismissible fade show" role="alert">
          {sessionError}
          <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close" onClick={() => setSessionError("")}></button>
        </div>
      )}
      <div className="container">
        <div className="row">
          <div className="col-12 col-lg-6">
            {fetchUserError && (
              <div className="alert alert-danger my-2" role="alert">
                {fetchUserError}
              </div>
            )}
            <div className="row align-items-center mb-3 mt-3">
              <div className="col-auto">
                <button
                  type="button"
                  className="btn btn-primary d-flex align-items-center"
                  style={{ fontWeight: "bold", fontSize: "1rem", borderRadius: 0, padding: "0.5rem 1rem" }}
                  onClick={handleShow}
                >
                  <Image
                    src="/icons/person-add.svg"
                    alt="Add user"
                    width={16}
                    height={16}
                    className="me-2"
                  />
                  Add
                </button>
              </div>
              <div className="col">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Filter users"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
            </div>
            <table className="table table-striped">
              <thead>
                <tr>
                  <th></th>
                  <th scope="col">First Name</th>
                  <th scope="col">Last Name</th>
                  <th scope="col">Username</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Locked</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={!!(selectedUser && selectedUser.id === user.id)}
                        onChange={() => handleUserSelect(user)}
                        onClick={e => e.stopPropagation()}
                      />
                    </td>
                    <td>{user.firstName}</td>
                    <td>{user.lastName}</td>
                    <td>{user.username}</td>
                    <td>{user.roles && user.roles.length > 0 ? user.roles[0].name : ""}</td>
                    <td>
                      {user.status === "DELETED" ? (
                        <span className="badge bg-danger">Deleted</span>
                      ) : (
                        <span className="badge bg-success">Active</span>
                      )}
                    </td>
                    <td>{user.is_locked ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={page}
              pageSize={DEFAULT_PAGE_SIZE}
              total={total}
              onPageChange={setPage}
            />
          </div>
          <div className="col-12 col-lg-6 mt-4 mt-md-0">
            {selectedUser ? (
              <div>
                <h3>User Details: {selectedUser.firstName}</h3>
                <h3>Role: {selectedUser.roles && selectedUser.roles.length > 0 ? selectedUser.roles[0].name : ""}</h3>

                <div className="mb-3 d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-warning btn-sm"
                    onClick={handleShowUpdateModal}
                  >
                    Update
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => setShowDeleteModal(true)}
                    disabled={selectedUser.status === "DELETED"}
                  >
                    Delete
                  </button>
                  <button
                    className="btn btn-outline-info btn-sm"
                    onClick={() => setShowLockModal(true)}
                  >
                    {selectedUser.is_locked ? "Unlock" : "Lock"}
                  </button>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setShowAssignRoleConfirmModal(true)}
                  >
                    Assign Role
                  </button>
                  {selectedUser.status === "DELETED" && (
                    <button
                      className="btn btn-outline-success btn-sm"
                      onClick={() => setShowReactivateModal(true)}
                    >
                      Reactivate
                    </button>
                  )}
                </div>

                <table className="table table-sm table-striped">
                  <thead className="table-dark">
                    <tr>
                      <th className="p-1 m-0">First Name</th>
                      <th className="p-1 m-0">{selectedUser.firstName}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-1 m-0">Last Name</td>
                      <td className="p-1 m-0">{selectedUser.lastName}</td>
                    </tr>
                    <tr>
                      <td className="p-1 m-0">Username</td>
                      <td className="p-1 m-0">{selectedUser.username}</td>
                    </tr>
                    <tr>
                      <td className="p-1 m-0">Locked</td>
                      <td className="p-1 m-0">
                        {selectedUser.is_locked ? "Yes" : "No"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Select a user to view their details.</p>
            )}
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
                <h5 className="modal-title">Confirm Delete</h5>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete user <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong>?</p>
                {deleteError && <div className="alert alert-danger py-1 my-2">{deleteError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteUser}>
                  Delete
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
    </AdminLayout>
  );
}

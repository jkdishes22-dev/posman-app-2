"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import NewUser from "../register/new-user";
import { AuthError, User } from "../../../types/types";
import Pagination from "../../../components/Pagination";
import { withSecureRoute } from "../../../components/withSecureRoute"; import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import ErrorDisplay from "../../../components/ErrorDisplay";

const DEFAULT_PAGE_SIZE = parseInt(process.env.NEXT_PUBLIC_PAGE_SIZE || "10", 10);
const DEFAULT_REFRESH_INTERVAL_SECONDS = parseInt(process.env.NEXT_PUBLIC_REFRESH_INTERVAL_SECONDS || "300", 10);

function UsersPage() {
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filter, setFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");
  const [error, setError] = useState("");
  const [authError, setAuthError] = useState<AuthError>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const apiCall = useApiCall();
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

  // Station management state
  const [userStations, setUserStations] = useState([]);
  const [availableStations, setAvailableStations] = useState([]);
  const [showAddStationModal, setShowAddStationModal] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState("");
  const [stationError, setStationError] = useState("");
  const [loadingStations, setLoadingStations] = useState(false);
  const [lockError, setLockError] = useState("");

  const handleClose = () => {
    setShowModal(false);
  };

  const handleShow = () => {
    setShowModal(true);
  };

  useEffect(() => {
    fetchUsers();
  }, [page, debouncedFilter]);

  // Debounce filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilter(filter);
    }, 300);
    return () => clearTimeout(timer);
  }, [filter]);

  // Reset page to 1 when filter changes
  useEffect(() => {
    if (debouncedFilter && page !== 1) {
      setPage(1);
    }
  }, [debouncedFilter]);

  // Fetch user stations when a user is selected
  useEffect(() => {
    if (selectedUser) {
      fetchUserStations(selectedUser.id);
    }
  }, [selectedUser]);

  useEffect(() => {
    const intervalSeconds = DEFAULT_REFRESH_INTERVAL_SECONDS;
    const interval = setInterval(async () => {
      try {
        const result = await apiCall("/api/auth/refresh", { method: "POST" });
        if (result.status === 200) {
          localStorage.setItem("token", result.data.token);
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
    const searchParam = debouncedFilter ? `&search=${encodeURIComponent(debouncedFilter)}` : "";
    try {
      const result = await apiCall(`/api/users?page=${page}&pageSize=${DEFAULT_PAGE_SIZE}${searchParam}`);
      if (result.status === 200) {
        setUsers(result.data?.users || []);
        setTotal(result.data?.total || 0);
        setFetchUserError("");
      } else if (result.status === 403) {
        setAuthError({ message: result.error || "Access denied" });
        setErrorDetails(result.errorDetails);
      } else {
        setFetchUserError(result.error || "Failed to fetch users");
        setErrorDetails(result.errorDetails);
      }
    } catch (error) {
      setFetchUserError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  }

  async function handleCreateUser(formData) {
    try {
      const result = await apiCall("/api/users", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      if (result.status === 201) {
        setError("");
        setUsers((prevUsers) => [...prevUsers, result.data]);
        handleClose();
      } else {
        setError(result.error || "Failed to create user");
        setErrorDetails(result.errorDetails);
      }
    } catch (err: any) {
      setError("Network error occurred while creating user");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      await fetchUsers();
    }
  }

  // Server-side filtering is now handled in fetchUsers()
  const filteredUsers = users;

  const handleUserSelect = (user) => {
    setSelectedUser(user);
  };

  const handleAssignRoleClick = async () => {
    setAssignRoleError("");
    setShowAssignRoleModal(true);
    try {
      const result = await apiCall("/api/roles");
      if (result.status === 200) {
        setRoles(result.data || []);
        if (selectedUser && selectedUser.role && selectedUser.role.id) {
          setSelectedRoleId(selectedUser.role.id.toString());
        } else if (selectedUser && selectedUser.role_id) {
          setSelectedRoleId(selectedUser.role_id.toString());
        } else {
          setSelectedRoleId((result.data?.length > 0 ? result.data[0].id.toString() : ""));
        }
      } else {
        setAssignRoleError(result.error || "Failed to fetch roles");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setAssignRoleError("Network error occurred while fetching roles");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleAssignRole = async () => {
    setAssignRoleError("");
    try {
      const result = await apiCall("/api/roles", {
        method: "PATCH",
        body: JSON.stringify({
          action: "assignRole",
          userId: selectedUser.id,
          roleId: selectedRoleId,
        }),
      });
      if (result.status === 200) {
        setSelectedUser((prev) => ({ ...prev, role_name: roles.find((r) => r.id.toString() === selectedRoleId)?.name, role_id: selectedRoleId }));
        setShowAssignRoleModal(false);
        await fetchUsers();
      } else {
        setAssignRoleError(result.error || "Failed to assign role");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setAssignRoleError("Network error occurred while assigning role");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setDeleteError("");
    try {
      const result = await apiCall(`/api/users?userId=${selectedUser.id}`, {
        method: "DELETE",
      });
      if (result.status === 200) {
        await fetchUsers();
        setSelectedUser(null);
        setShowDeleteModal(false);
      } else {
        setDeleteError(result.error || "Failed to delete user");
        setErrorDetails(result.errorDetails);
      }
    } catch (err) {
      setDeleteError("Network error occurred while deleting user");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      setShowDeleteModal(false);
    }
  };

  const handleReactivateUser = async () => {
    if (!selectedUser) return;
    setReactivateError("");
    try {
      const result = await apiCall(`/api/users?userId=${selectedUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "reactivate" }),
      });
      if (result.status === 200) {
        await fetchUsers();
        setSelectedUser(null);
        setShowReactivateModal(false);
      } else {
        setReactivateError(result.error || "Failed to reactivate user");
        setErrorDetails(result.errorDetails);
      }
    } catch (err) {
      setReactivateError("Network error occurred while reactivating user");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
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
      const result = await apiCall(`/api/users?userId=${selectedUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "update",
          firstName: updateForm.firstName,
          lastName: updateForm.lastName,
          username: updateForm.username,
        }),
      });
      if (result.status === 200) {
        await fetchUsers();
        setShowUpdateModal(false);
      } else {
        setUpdateError(result.error || "Failed to update user");
        setErrorDetails(result.errorDetails);
      }
    } catch (err) {
      setUpdateError("Network error occurred while updating user");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      setShowUpdateModal(false);
    }
  };

  const handleLockUser = async () => {
    if (!selectedUser) return;
    setLockLoading(true);
    setLockError("");
    try {
      const result = await apiCall(`/api/users?userId=${selectedUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: selectedUser.is_locked ? "unlock" : "lock",
        }),
      });
      if (result.status === 200) {
        await fetchUsers();
        setSelectedUser(result.data);
        setShowLockModal(false);
      } else {
        setLockError(result.error || "Failed to lock/unlock user");
        setErrorDetails(result.errorDetails);
      }
    } catch (err) {
      setLockError("Network error occurred while locking/unlocking user");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      setShowLockModal(false);
    } finally {
      setLockLoading(false);
    }
  };

  const handleAssignRoleConfirm = () => {
    setShowAssignRoleConfirmModal(false);
    handleAssignRoleClick();
  };

  // Station management functions
  const fetchUserStations = async (userId: number) => {
    setLoadingStations(true);
    setStationError("");
    try {
      const result = await apiCall(`/api/users/${userId}/stations`);
      if (result.status === 200) {
        // The API returns the stations array directly, not wrapped in a stations property
        setUserStations(result.data || []);
      } else {
        setStationError(result.error || "Failed to fetch user stations");
        setErrorDetails(result.errorDetails);
      }
    } catch (error) {
      setStationError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setLoadingStations(false);
    }
  };

  const fetchAvailableStations = async () => {
    try {
      const result = await apiCall("/api/stations");
      if (result.status === 200) {
        // Filter out stations that user is already linked to
        const linkedStationIds = userStations.map(us => us.station.id);
        const available = (result.data || []).filter(station =>
          station.status === "active" && !linkedStationIds.includes(station.id)
        );
        setAvailableStations(available);
      } else {
        console.error("Failed to fetch available stations:", result.error);
        setErrorDetails(result.errorDetails);
      }
    } catch (error) {
      console.error("Failed to fetch available stations:", error);
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleAddStation = async () => {
    if (!selectedUser || !selectedStationId) return;

    // Check if user has a valid role for station assignment
    const userRole = selectedUser.roles && selectedUser.roles.length > 0 ? selectedUser.roles[0].name : null;
    const allowedRoles = ["sales", "supervisor", "admin"];

    if (!userRole || !allowedRoles.includes(userRole)) {
      setStationError(`Only users with ${allowedRoles.join(", ")} roles can be assigned stations. Current role: ${userRole || "none"}`);
      return;
    }

    setStationError("");
    try {
      const result = await apiCall(`/api/users/${selectedUser.id}/stations`, {
        method: "POST",
        body: JSON.stringify({
          station: selectedStationId,
        }),
      });
      if (result.status === 200) {
        await fetchUserStations(selectedUser.id);
        setShowAddStationModal(false);
        setSelectedStationId("");
      } else {
        setStationError(result.error || "Failed to add station");
        setErrorDetails(result.errorDetails);
      }
    } catch (error) {
      setStationError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleSetDefaultStation = async (stationId: number) => {
    if (!selectedUser) return;

    setStationError("");
    try {
      const result = await apiCall(`/api/users/${selectedUser.id}/stations`, {
        method: "PATCH",
        body: JSON.stringify({
          stationId: stationId,
        }),
      });
      if (result.status === 200) {
        await fetchUserStations(selectedUser.id);
      } else {
        setStationError(result.error || "Failed to set default station");
        setErrorDetails(result.errorDetails);
      }
    } catch (error) {
      setStationError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleRemoveStation = async (userStationId: number) => {
    if (!selectedUser) return;

    setStationError("");
    try {
      const result = await apiCall(`/api/users/${selectedUser.id}/stations`, {
        method: "DELETE",
        body: JSON.stringify({
          userStationId: userStationId,
        }),
      });
      if (result.status === 200) {
        await fetchUserStations(selectedUser.id);
      } else {
        setStationError(result.error || "Failed to remove station");
        setErrorDetails(result.errorDetails);
      }
    } catch (error) {
      setStationError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleToggleStationStatus = async (userStationId: number, currentStatus: string) => {
    if (!selectedUser) return;

    setStationError("");
    try {
      const result = await apiCall(`/api/users/${selectedUser.id}/stations`, {
        method: "PATCH",
        body: JSON.stringify({
          userStationId: userStationId,
          action: currentStatus === "active" ? "deactivate" : "activate",
        }),
      });
      if (result.status === 200) {
        await fetchUserStations(selectedUser.id);
      } else {
        setStationError(result.error || "Failed to update station status");
        setErrorDetails(result.errorDetails);
      }
    } catch (error) {
      setStationError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
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

        <ErrorDisplay
          error={errorDetails?.message || null}
          errorDetails={errorDetails}
          onDismiss={() => {
            setErrorDetails(null);
          }}
        />

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
                      placeholder="Search by name or username..."
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      style={{ width: "220px", paddingRight: "2.5rem" }}
                    />
                    <i className="bi bi-search position-absolute top-50 end-0 translate-middle-y me-3 text-muted"></i>
                    {filter && (
                      <button
                        type="button"
                        className="btn btn-sm position-absolute top-50 end-0 translate-middle-y me-1"
                        onClick={() => {
                          setFilter("");
                          setDebouncedFilter("");
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#6b7280",
                          padding: "0.25rem",
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
                        <th className="text-center" style={{ width: "50px" }}>
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
                              <i className="bi bi-search text-muted" style={{ fontSize: "3rem" }}></i>
                              <h5 className="text-muted mt-3 mb-2">No users found</h5>
                              <p className="text-muted mb-0">
                                {filter ? "Try adjusting your search terms" : "No users available"}
                              </p>
                              {filter && (
                                <button
                                  className="btn btn-outline-primary btn-sm mt-2"
                                  onClick={() => {
                                    setFilter("");
                                    setDebouncedFilter("");
                                  }}
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
                            className={`user-row ${selectedUser && selectedUser.id === user.id ? "table-primary selected" : ""}`}
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

                    {/* Station Management Section */}
                    <div className="mt-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0 fw-bold">
                          <i className="bi bi-geo-alt me-2 text-primary"></i>
                          Station Management
                        </h6>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={!selectedUser || !selectedUser.roles || !selectedUser.roles.length || !["sales", "supervisor", "admin"].includes(selectedUser.roles[0].name)}
                          onClick={() => {
                            fetchAvailableStations();
                            setShowAddStationModal(true);
                          }}
                          title={!selectedUser || !selectedUser.roles || !selectedUser.roles.length || !["sales", "supervisor", "admin"].includes(selectedUser.roles[0].name) ? "Only sales, supervisor, and admin roles can be assigned stations" : "Add station to user"}
                        >
                          <i className="bi bi-plus me-1"></i>
                          Add Station
                        </button>
                      </div>

                      {stationError && (
                        <div className="alert alert-danger py-2 mb-3" role="alert">
                          <i className="bi bi-exclamation-triangle me-2"></i>
                          {stationError}
                        </div>
                      )}

                      {loadingStations ? (
                        <div className="text-center py-3">
                          <div className="spinner-border spinner-border-sm text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          <span className="ms-2 text-muted">Loading stations...</span>
                        </div>
                      ) : userStations.length > 0 ? (
                        <div className="list-group">
                          {userStations.map((userStation) => (
                            <div key={userStation.id} className="list-group-item d-flex justify-content-between align-items-center">
                              <div className="d-flex align-items-center">
                                <div className="me-3">
                                  {userStation.isDefault ? (
                                    <span className="badge bg-primary">
                                      <i className="bi bi-star-fill me-1"></i>
                                      Default
                                    </span>
                                  ) : (
                                    <span className="badge bg-light text-dark">
                                      <i className="bi bi-star me-1"></i>
                                      Station
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <div className="fw-semibold">{userStation.station.name}</div>
                                  <small className="text-muted">
                                    Status:
                                    <span className={`badge ms-1 ${userStation.status === "active" ? "bg-success" : "bg-secondary"}`}>
                                      {userStation.status}
                                    </span>
                                  </small>
                                </div>
                              </div>
                              <div className="dropdown">
                                <button
                                  className="btn btn-outline-secondary btn-sm dropdown-toggle"
                                  type="button"
                                  data-bs-toggle="dropdown"
                                  aria-expanded="false"
                                  title="Station actions"
                                >
                                  <i className="bi bi-three-dots-vertical"></i>
                                </button>
                                <ul className="dropdown-menu dropdown-menu-end">
                                  {!userStation.isDefault && (
                                    <li>
                                      <button
                                        className="dropdown-item"
                                        onClick={() => handleSetDefaultStation(userStation.station.id)}
                                      >
                                        <i className="bi bi-star me-2"></i>
                                        Set as Default
                                      </button>
                                    </li>
                                  )}
                                  <li>
                                    <button
                                      className={`dropdown-item ${userStation.status === "active" ? "text-warning" : "text-success"}`}
                                      onClick={() => handleToggleStationStatus(userStation.id, userStation.status)}
                                    >
                                      <i className={`bi ${userStation.status === "active" ? "bi-pause" : "bi-play"} me-2`}></i>
                                      {userStation.status === "active" ? "Deactivate" : "Activate"}
                                    </button>
                                  </li>
                                </ul>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-3">
                          <i className="bi bi-geo-alt text-muted" style={{ fontSize: "2rem" }}></i>
                          <p className="text-muted mt-2 mb-0">No stations assigned</p>
                          <small className="text-muted">Click "Add Station" to assign stations to this user</small>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <i className="bi bi-person text-muted" style={{ fontSize: "3rem" }}></i>
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

      {/* Add Station Modal */}
      {showAddStationModal && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add Station to User</h5>
              </div>
              <div className="modal-body">
                {stationError && <div className="alert alert-danger py-1 my-2">{stationError}</div>}
                <form>
                  <div className="form-group">
                    <label htmlFor="stationSelect">Select Station</label>
                    <select
                      className="form-control"
                      id="stationSelect"
                      value={selectedStationId}
                      onChange={(e) => setSelectedStationId(e.target.value)}
                    >
                      <option value="">Select a station</option>
                      {availableStations.map((station) => (
                        <option key={station.id} value={station.id}>
                          {station.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddStationModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleAddStation} disabled={!selectedStationId}>
                  Add Station
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

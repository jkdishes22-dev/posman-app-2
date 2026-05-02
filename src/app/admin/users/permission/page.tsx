"use client";

import React, { useState, useEffect } from "react";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import AsyncSelect from "react-select/async";
import { AuthError, Role, Scope } from "src/app/types/types";
import { decodeJwt } from "../../../utils/tokenUtils";
import ErrorDisplay from "src/app/components/ErrorDisplay";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import { useTooltips } from "../../../hooks/useTooltips";

type ErrorState = {
  message: string;
  missingPermissions?: string[];
  isAdmin?: boolean;
  userRoles?: string[];
  requiredPermissions?: string[];
} | null;

export default function UsersPage() {
  const apiCall = useApiCall();
  useTooltips();
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedScope, setSelectedScope] = useState<Scope | null>(null);
  const [permissionsByScope, setPermissionsByScope] = useState({});
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [error, setError] = useState<ErrorState>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [permissionToDelete, setPermissionToDelete] = useState<{ id: string, name: string } | null>(
    null,
  );
  const [availablePermissions, setAvailablePermissions] = useState<string[]>(
    [],
  );
  const [selectedPermission, setSelectedPermission] = useState(null);
  const [authError, setAuthError] = useState<AuthError>(null);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    // Fetch roles and scopes in parallel for faster page load
    Promise.all([fetchRoles(), fetchScopes()]).catch((error) => {
      setError({ message: "Failed to load initial data: " + error.message });
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    });
  }, []);

  const fetchRoles = async () => {
    try {
      const result = await apiCall("/api/roles");
      if (result.status === 200) {
        setRoles(result.data);
        setError(null);
      } else {
        setError({
          message: result.error || "Failed to fetch roles",
          missingPermissions: result.errorDetails?.missingPermissions || [],
          isAdmin: result.errorDetails?.isAdmin || false,
          userRoles: result.errorDetails?.userRoles || [],
          requiredPermissions: result.errorDetails?.requiredPermissions || []
        });
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError({ message: "An unexpected error occurred: " + error.message });
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const fetchScopes = async () => {
    try {
      const result = await apiCall("/api/roles/scopes");
      if (result.status === 200) {
        setScopes(result.data);
        // Initialize with scope.name as key to match fetchPermissions
        const emptyPermissionsByScope = result.data.reduce((acc, scope) => {
          acc[scope.name] = [];
          return acc;
        }, {});
        setPermissionsByScope(emptyPermissionsByScope);
        setError(null);
      } else {
        setError({ message: result.error || "Failed to fetch scopes" });
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError({ message: "An unexpected error occurred: " + error.message });
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };
  const fetchPermissions = async (role: Role) => {
    try {
      setSelectedRole(role);
      const result = await apiCall(`/api/roles/${role.id}/permissions`);
      if (result.status === 200) {
        setError(null);
        // Initialize all scopes with empty arrays first
        const updatedPermissionsByScope = scopes.reduce((acc, scope) => {
          acc[scope.name] = [];
          return acc;
        }, {});
        // Populate with actual permissions
        result.data.forEach((perm) => {
          if (!updatedPermissionsByScope[perm.scope]) {
            updatedPermissionsByScope[perm.scope] = [];
          }
          updatedPermissionsByScope[perm.scope].push({
            id: perm.id,
            name: perm.name
          });
        });
        setPermissionsByScope(updatedPermissionsByScope);
      } else {
        setError({
          message: result.error || "Failed to fetch permissions",
          missingPermissions: result.errorDetails?.missingPermissions || [],
          isAdmin: result.errorDetails?.isAdmin || false,
          userRoles: result.errorDetails?.userRoles || [],
          requiredPermissions: result.errorDetails?.requiredPermissions || []
        });
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError({ message: "An unexpected error occurred: " + error.message });
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleDeletePermission = (scope, permission) => {
    setPermissionToDelete(permission);
    setShowDeleteModal(true);
  };

  const confirmDeletePermission = async () => {
    if (!permissionToDelete || !selectedRole) {
      setShowDeleteModal(false);
      return;
    }

    try {
      const result = await apiCall(`/api/roles/${selectedRole.id}/permissions`, {
        method: "DELETE",
        body: JSON.stringify({
          roleId: selectedRole.id,
          permissionId: permissionToDelete.id,
        }),
      });

      if (result.status === 200) {
        // Refresh the permissions for the current role
        await fetchPermissions(selectedRole);
        setShowDeleteModal(false);
        setPermissionToDelete(null);
      } else {
        setError({
          message: result.error || "Failed to delete permission",
          missingPermissions: result.errorDetails?.missingPermissions || [],
          isAdmin: result.errorDetails?.isAdmin || false,
          userRoles: result.errorDetails?.userRoles || [],
          requiredPermissions: result.errorDetails?.requiredPermissions || []
        });
        setErrorDetails(result.errorDetails);
        setShowDeleteModal(false);
      }
    } catch (error: any) {
      setError({ message: error.message || "Failed to delete permission" });
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      setShowDeleteModal(false);
    }
  };

  const handleShowAddModal = (scope) => {
    setSelectedScope(scope);
    setShowAddModal(true);
  };

  const fetchAvailablePermissions = async (inputValue: string = "") => {
    if (!selectedScope) {
      return [];
    }
    try {
      const result = await apiCall(`/api/roles/scopes/${selectedScope.id}/permissions`);
      if (result.status === 200) {
        // Handle both array and object response formats
        const scopeData = Array.isArray(result.data) ? result.data[0] : result.data;
        const allPermissions = scopeData?.permissions || [];
        const existingPermissions = permissionsByScope[selectedScope.name] || [];
        const existingPermissionNames = existingPermissions.map((p: any) => p.name || p);

        // Filter out already assigned permissions
        let filteredPermissions = allPermissions.filter(
          (permission: any) => !existingPermissionNames.includes(permission.name),
        );

        // Filter by search input if provided
        if (inputValue && inputValue.trim().length > 0) {
          const searchTerm = inputValue.toLowerCase().trim();
          filteredPermissions = filteredPermissions.filter((permission: any) =>
            permission.name.toLowerCase().includes(searchTerm)
          );
        }

        const formattedPermissions = filteredPermissions.map((permission: any) => ({
          label: permission.name,
          value: permission.id,
        }));

        setAvailablePermissions(formattedPermissions.map((p: any) => p.label));
        return formattedPermissions;
      } else {
        setError({ message: result.error || "Failed to fetch available permissions" });
        setErrorDetails(result.errorDetails);
        return [];
      }
    } catch (error) {
      setError({ message: "Network error occurred" });
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      return [];
    }
  };


  const handleAddPermission = async () => {
    if (!selectedScope || !selectedRole || !selectedPermission) {
      return;
    }

    try {
      const result = await apiCall(`/api/roles/${selectedRole.id}/permissions`, {
        method: "POST",
        body: JSON.stringify({
          roleId: selectedRole.id,
          permissionId: selectedPermission.value,
        }),
      });

      if (result.status !== 200) {
        setError({
          message: result.error || "Failed to add permission",
          missingPermissions: result.errorDetails?.missingPermissions || [],
          isAdmin: result.errorDetails?.isAdmin || false,
          userRoles: result.errorDetails?.userRoles || [],
          requiredPermissions: result.errorDetails?.requiredPermissions || []
        });
        setErrorDetails(result.errorDetails);
        return;
      }

      // If the current user has this role, refresh their token
      const userToken = localStorage.getItem("token");
      if (userToken) {
        const decoded = decodeJwt<any>(userToken);
        if (
          decoded &&
          typeof decoded === "object" &&
          "roles" in decoded &&
          Array.isArray((decoded as any).roles) &&
          (decoded as any).roles.includes(selectedRole.name)
        ) {
          // Call refresh endpoint
          try {
            const refreshResult = await apiCall("/api/auth/refresh", { method: "POST" });
            if (refreshResult.status === 200) {
              localStorage.setItem("token", refreshResult.data.token);
            } else {
              setSessionError("Session updated, but failed to refresh your token. Please re-login.");
            }
          } catch {
            setSessionError("Session updated, but failed to refresh your token. Please re-login.");
          }
        }
      }

      setShowAddModal(false);
      // Refresh the permissions list to show the newly added permission
      await fetchPermissions(selectedRole);
    } catch (error: any) {
      setError({ message: error.message || "An unexpected error occurred while adding permission" });
    }
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        {/* Header */}
        <div className="bg-primary text-white p-3 mb-4">
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-shield-check me-2"></i>
            User Roles & Permissions
            <i
              className="bi bi-question-circle ms-2"
              style={{ cursor: "help", fontSize: "0.9rem" }}
              data-bs-toggle="tooltip"
              data-bs-placement="bottom"
              title="Manage role-based permissions for users"
            ></i>
          </h1>
        </div>

        {/* Error Display */}
        <ErrorDisplay
          error={error?.message || null}
          onDismiss={() => setError(null)}
          errorDetails={error ? {
            missingPermissions: error.missingPermissions,
            isAdmin: error.isAdmin,
            userRoles: error.userRoles,
            requiredPermissions: error.requiredPermissions
          } : undefined}
        />
        <ErrorDisplay
          error={errorDetails?.message || null}
          errorDetails={errorDetails}
          onDismiss={() => setErrorDetails(null)}
        />
        {sessionError && (
          <div className="alert alert-warning alert-dismissible fade show mb-4" role="alert">
            {sessionError}
            <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close" onClick={() => setSessionError("")}></button>
          </div>
        )}

        {/* Main Content */}
        <div className="row g-4">
          <div className="col-4">
            <div className="card shadow-sm">
              <div className="card-header bg-light">
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-people me-2 text-primary"></i>
                  Roles
                  <i
                    className="bi bi-question-circle ms-2 text-muted"
                    style={{ cursor: "help", fontSize: "0.85rem" }}
                    data-bs-toggle="tooltip"
                    data-bs-placement="right"
                    title="Select a role to view or edit its permissions"
                  ></i>
                </h5>
              </div>
              <div className="card-body p-0">
                <div className="list-group list-group-flush">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className={`list-group-item list-group-item-action ${selectedRole?.id === role.id ? "active" : ""}`}
                      onClick={() => fetchPermissions(role)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="d-flex align-items-center">
                        <i className="bi bi-shield me-2"></i>
                        <span className="fw-medium">{role.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="col-8">
            <div className="card shadow-sm">
              <div className="card-header bg-light">
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-list-ul me-2 text-primary"></i>
                  Scopes: {selectedRole ? selectedRole.name : "Select a role"}
                </h5>
              </div>
              <div className="card-body">
                {selectedRole ? (
                  scopes.length > 0 ? (
                    <>
                      <div className="mb-3">
                        <ul className="nav nav-pills">
                          {scopes.map((scope) => (
                            <li key={scope.id} className="nav-item">
                              <button
                                className={`nav-link ${selectedScope?.id === scope.id ? "active" : ""}`}
                                onClick={() => setSelectedScope(scope)}
                                data-bs-toggle="tooltip"
                                data-bs-placement="top"
                                title={`View permissions for ${scope.name} category`}
                              >
                                <i className="bi bi-tag me-1"></i>
                                {scope.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {selectedScope && (
                        <div className="card">
                          <div className="card-header bg-light">
                            <div className="d-flex justify-content-between align-items-center">
                              <h6 className="mb-0 fw-bold">
                                <i className="bi bi-key me-2 text-primary"></i>
                                {selectedRole.name}-{selectedScope.name} Permissions
                              </h6>
                              <button
                                onClick={() => handleShowAddModal(selectedScope)}
                                className="btn btn-primary btn-sm"
                              >
                                <i className="bi bi-plus-circle me-1"></i>
                                Add Permission
                              </button>
                            </div>
                          </div>
                          <div className="card-body">
                            {permissionsByScope[selectedScope.name] && permissionsByScope[selectedScope.name].length > 0 ? (
                              <div className="row g-2">
                                {permissionsByScope[selectedScope.name].map((perm) => (
                                  <div key={perm.id || perm} className="col-md-6 col-lg-4">
                                    <div className="permission-item d-flex align-items-center justify-content-between p-2 border rounded">
                                      <span className="fw-medium">{perm.name || perm}</span>
                                      <button
                                        className="btn btn-outline-danger btn-sm"
                                        onClick={() => handleDeletePermission(selectedScope, perm)}
                                        title="Remove permission"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-x-circle" viewBox="0 0 16 16">
                                          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
                                          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <i className="bi bi-key text-muted" style={{ fontSize: "3rem" }}></i>
                                <p className="text-muted mt-3 mb-0">No permissions added for this scope</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <i className="bi bi-exclamation-circle text-muted" style={{ fontSize: "3rem" }}></i>
                      <p className="text-muted mt-3 mb-0">No scopes available for the selected role</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-4">
                    <i className="bi bi-cursor text-muted" style={{ fontSize: "3rem" }}></i>
                    <p className="text-muted mt-3 mb-0">Please select a role to see the available scopes</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Permission</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the permission "{typeof permissionToDelete === "string" ? permissionToDelete : permissionToDelete?.name || permissionToDelete?.id}
          "?
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeletePermission}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Permission Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add permission</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Scope: {selectedScope?.name || ""}</p>
          <p>Role: {selectedRole?.name || ""}</p>
          <Form.Group className="mb-3">
            <Form.Label>Permission</Form.Label>
            <AsyncSelect
              loadOptions={(inputValue) => fetchAvailablePermissions(inputValue)}
              defaultOptions
              onChange={setSelectedPermission}
              placeholder="Search permissions..."
              isSearchable={true}
              cacheOptions={false}
              noOptionsMessage={({ inputValue }) =>
                inputValue.length > 0
                  ? `No permissions found for "${inputValue}"`
                  : "Type to search permissions"
              }
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddPermission}>
            Add Permission
          </Button>
        </Modal.Footer>
      </Modal>
    </RoleAwareLayout>
  );
}

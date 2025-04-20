"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "../../../shared/AdminLayout";
import Image from "next/image";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import AsyncSelect from "react-select/async";
import { AuthError, Role, Scope } from "src/app/types/types";

type ErrorState = {
  message: string;
  missingPermissions?: string[];
} | null;

export default function UsersPage() {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedScope, setSelectedScope] = useState<Scope | null>(null);
  const [permissionsByScope, setPermissionsByScope] = useState({});
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [error, setError] = useState<ErrorState>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [permissionToDelete, setPermissionToDelete] = useState<string | null>(
    null,
  );
  const [availablePermissions, setAvailablePermissions] = useState<string[]>(
    [],
  );
  const [selectedPermission, setSelectedPermission] = useState(null);
  const [authError, setAuthError] = useState<AuthError>(null);

  useEffect(() => {
    fetchRoles();
    fetchScopes();
  }, []);

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/roles", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data);
      } else if (response.status === 403) {
        setAuthError(data);
      } else {
        setRoles(data);
        setError(null);
      }
    } catch (error: any) {
      setError({ message: "An unexpected error occurred: " + error.message });
    }
  };

  const fetchScopes = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/roles/scopes", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data);
      } else {
        setScopes(data);
        const emptyPermissionsByScope = data.reduce((acc, scope) => {
          acc[scope.id] = [];
          return acc;
        }, {});
        setPermissionsByScope(emptyPermissionsByScope);
        setError(null);
      }
    } catch (error: any) {
      setError({ message: "An unexpected error occurred: " + error.message });
    }
  };
  const fetchPermissions = async (role: Role) => {
    try {
      setSelectedRole(role);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/roles/${role.id}/permissions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data);
      } else {
        const permissions = await response.json();
        setError(null);
        const updatedPermissionsByScope = scopes.reduce((acc, scope) => {
          acc[scope.name] = [];
          return acc;
        }, {});
        permissions.forEach((perm) => {
          if (!updatedPermissionsByScope[perm.scope]) {
            updatedPermissionsByScope[perm.scope] = [];
          }
          updatedPermissionsByScope[perm.scope].push(perm.name);
        });
        setPermissionsByScope(updatedPermissionsByScope);
      }
    } catch (error: any) {
      setError({ message: "An unexpected error occurred: " + error.message });
    }
  };

  const handleDeletePermission = (scope, permission) => {
    setPermissionToDelete(permission);
    setShowDeleteModal(true);
  };

  const confirmDeletePermission = () => {
    setShowDeleteModal(false);
  };

  const handleShowAddModal = (scope) => {
    setSelectedScope(scope);
    setShowAddModal(true);
  };

  const fetchAvailablePermissions = async () => {
    if (!selectedScope) {
      console.log("No selected scope!");
      return [];
    }
    const token = localStorage.getItem("token");
    const response = await fetch(
      `/api/roles/scopes/${selectedScope.id}/permissions`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const data = await response.json();

    const allPermissions = data[0].permissions;
    const existingPermissions = permissionsByScope[selectedScope.name] || [];

    const filteredPermissions = allPermissions.filter(
      (permission) => !existingPermissions.includes(permission.name),
    );
    const formattedPermissions = filteredPermissions.map((permission) => ({
      label: permission.name,
      value: permission.id,
    }));

    setAvailablePermissions(formattedPermissions);
    return formattedPermissions;
  };

  const handleAddPermission = async () => {
    if (!selectedScope || !selectedRole || !selectedPermission) {
      console.log("Scope, Role, or Permission not selected!");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/roles/${selectedRole.id}/permissions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            roleId: selectedRole.id,
            permissionId: selectedPermission.value,
          }),
        },
      );

      if (!response.ok) {
        console.error("Failed to add permission");
        return;
      }

      console.log("Permission added successfully!");
      setShowAddModal(false);
      // Update the permissions list if necessary
    } catch (error: any) {
      console.error("An unexpected error occurred:", error.message);
    }
  };

  return (
    <AdminLayout authError={authError}>
      <div>
        {error && (
          <div className="alert alert-danger">
            <strong>Error:</strong> {error.message}
            {error.missingPermissions && (
              <ul>
                {error.missingPermissions.map((perm) => (
                  <li key={perm}>{perm}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="container">
          <div className="row">
            <div className="col-4">
              <h3>Roles</h3>
              <ul className="list-group">
                {roles.map((role) => (
                  <li
                    key={role.id}
                    className="list-group-item"
                    onClick={() => fetchPermissions(role)}
                  >
                    {role.name}
                  </li>
                ))}
              </ul>
            </div>
            <div className="col-8">
              <h3>Scopes: {selectedRole && selectedRole.name}</h3>
              {selectedRole ? (
                scopes.length > 0 ? (
                  <ul className="nav nav-underline">
                    {scopes.map((scope) => (
                      <li key={scope.id} className="nav-item">
                        <a
                          className={`nav-link ${selectedScope?.id === scope.id ? "active" : ""}`}
                          href="#"
                          onClick={() => setSelectedScope(scope)}
                        >
                          {scope.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No scopes available for the selected role.</p>
                )
              ) : (
                <p>Please select a role to see the available scopes.</p>
              )}

              <div>
                {selectedScope && (
                  <div key={selectedScope.id} className="card mb-3">
                    <div className="card-header">
                      <h4>
                        {selectedRole.name}-{selectedScope.name} Permissions
                      </h4>
                    </div>
                    <div className="card-body">
                      <ul className="list-unstyled">
                        {permissionsByScope[selectedScope.name].length > 0 ? (
                          permissionsByScope[selectedScope.name].map((perm) => (
                            <li key={perm} className="p-1">
                              <span>{perm}</span>
                              <Image
                                src="/icons/x-circle.svg"
                                alt="Delete Permission"
                                width={24}
                                height={24}
                                className="m-2"
                                onClick={() =>
                                  handleDeletePermission(selectedScope, perm)
                                }
                              />
                            </li>
                          ))
                        ) : (
                          <li>No permissions added</li>
                        )}
                      </ul>
                      <button
                        onClick={() => handleShowAddModal(selectedScope)}
                        className="border bg-primary-subtle border-0 border-primary-subtle"
                      >
                        <Image
                          src="/icons/plus-circle.svg"
                          alt="Add Permission"
                          width={24}
                          height={24}
                          className="m-2"
                        />
                        Add Permission
                      </button>
                    </div>
                  </div>
                )}
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
            Are you sure you want to delete the permission "{permissionToDelete}
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
                loadOptions={fetchAvailablePermissions}
                defaultOptions
                onChange={setSelectedPermission} // Update the selected permission
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
      </div>
    </AdminLayout>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "../../../shared/AdminLayout";
import Image from "next/image";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import AsyncSelect from "react-select/async";

type ErrorState = {
  message: string;
  missingPermissions?: string[];
} | null;

export default function UsersPage() {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedScope, setSelectedScope] = useState<string | null>(null);
  const [permissionsByScope, setPermissionsByScope] = useState({});
  const [scopes, setScopes] = useState([]);
  const [error, setError] = useState<ErrorState>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [permissionToDelete, setPermissionToDelete] = useState<string | null>(
    null,
  );
  const [availablePermissions, setAvailablePermissions] = useState<string[]>(
    [],
  );

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
      if (!response.ok) {
        const data = await response.json();
        setError(data);
      } else {
        const data = await response.json();
        setRoles(data);
        setError(null);
      }
    } catch (error) {
      setError({ message: "An unexpected error occurred." + error.message });
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
      if (!response.ok) {
        const data = await response.json();
        setError(data);
      } else {
        const data = await response.json();
        setScopes(data);
        const emptyPermissionsByScope = data.reduce((acc, scope) => {
          acc[scope.name] = [];
          return acc;
        }, {});
        setPermissionsByScope(emptyPermissionsByScope);
        setError(null);
      }
    } catch (error) {
      setError({ message: "An unexpected error occurred." + error.message });
    }
  };

  const fetchPermissions = async (role) => {
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
          const scopeName = perm.scope || "Unscoped";
          if (!updatedPermissionsByScope[scopeName]) {
            updatedPermissionsByScope[scopeName] = [];
          }
          updatedPermissionsByScope[scopeName].push(perm.name);
        });
        setPermissionsByScope(updatedPermissionsByScope);
      }
    } catch (error) {
      setError({ message: "An unexpected error occurred." + error.message });
    }
  };

  const displayPermissionsByScope = (scope) => {
    const permissions = permissionsByScope[scope] || [];
    return (
      <div key={scope} className="card mb-3">
        <div className="card-header">
          <h3>Scope: {scope}</h3>
        </div>
        <div className="card-body">
          <ul className="list-unstyled">
            {permissions.length > 0 ? (
              permissions.map((perm) => (
                <li key={perm} className="p-1">
                  <span>{perm}</span>
                  <Image
                    src="/icons/x-circle.svg"
                    alt="Delete Permission"
                    width={24}
                    height={24}
                    className="m-2"
                    onClick={() => handleDeletePermission(scope, perm)}
                  />
                </li>
              ))
            ) : (
              <li>No permissions added</li>
            )}
          </ul>
          <button
            onClick={() => handleShowAddModal(scope)}
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
    );
  };

  const handleDeletePermission = (scope, permission) => {
    setPermissionToDelete(permission);
    setShowDeleteModal(true);
  };

  const confirmDeletePermission = () => {
    // Implement delete functionality
    setShowDeleteModal(false);
  };

  const handleShowAddModal = (scope) => {
    setSelectedScope(scope);
    setShowAddModal(true);
  };

  const fetchAvailablePermissions = async () => {
    if (availablePermissions.length > 0) return availablePermissions;

    const token = localStorage.getItem("token");
    const response = await fetch(`/api/scopes/${selectedScope}/permissions`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    setAvailablePermissions(data);
    return data;
  };

  const handleAddPermission = () => {
    // Implement the logic to add permission to the selected role and scope
    setShowAddModal(false);
  };

  return (
    <AdminLayout>
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
              <h3>Role: {selectedRole && selectedRole.name}</h3>
              <ul className="nav nav-underline">
                {scopes.map((scope) => (
                  <li key={scope.name} className="nav-item">
                    <a
                      className={`nav-link ${selectedScope === scope.name ? "active" : ""}`}
                      href="#"
                      onClick={() => setSelectedScope(scope.name)}
                    >
                      {scope.name}
                    </a>
                  </li>
                ))}
              </ul>
              <div>
                {selectedScope && displayPermissionsByScope(selectedScope)}
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
            <Modal.Title>Add Permission</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Control
                type="text"
                value={selectedRole?.name || ""}
                readOnly
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Scope</Form.Label>
              <Form.Control type="text" value={selectedScope || ""} readOnly />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Permission</Form.Label>
              <AsyncSelect
                loadOptions={fetchAvailablePermissions}
                defaultOptions
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

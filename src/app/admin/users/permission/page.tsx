"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "../../../shared/AdminLayout";

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
      console.error(error);
      setError({ message: "An unexpected error occurred." });
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
      console.error(error);
      setError({ message: "An unexpected error occurred." });
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
      console.error(error);
      setError({ message: "An unexpected error occurred." });
    }
  };

  const displayPermissionsByScope = (scope) => {
    const permissions = permissionsByScope[scope] || [];
    return (
      <div key={scope}>
        <ul>
          {permissions.length > 0 ? (
            permissions.map((perm) => <li key={perm}>{perm}</li>)
          ) : (
            <li>No permissions added</li>
          )}
        </ul>
      </div>
    );
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
              <h2>Roles</h2>
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
              <h2>Role: {selectedRole && selectedRole.name}</h2>
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
      </div>
    </AdminLayout>
  );
}

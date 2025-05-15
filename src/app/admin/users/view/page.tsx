"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import AdminLayout from "../../../shared/AdminLayout";
import NewUser from "../register/new-user";
import { AuthError, User } from "../../../types/types";

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [authError, setAuthError] = useState<AuthError>(null);
  const [fetchUserError, setFetchUserError] = useState<string>("");


  const handleClose = () => {
    setShowModal(false);
  };

  const handleShow = () => {
    setShowModal(true);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    const token = localStorage.getItem("token");
    const response = await fetch("/api/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (response.ok) {
      setUsers(data);
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

  return (
    <AdminLayout authError={null}>
      <div className="container-fluid">
        <div className="row">
          <div className="col-6">
            <button
              type="button"
              className="btn btn-primary d-flex align-items-center"
              onClick={handleShow}
            >
              <Image
                src="/icons/person-add.svg"
                alt="Add user"
                width={12}
                height={12}
                className="m-2"
              />
              Add
            </button>
            <input
              type="text"
              className="form-control mt-3"
              placeholder="Filter users"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <table className="table table-striped">
              <thead>
                <tr>
                  <th scope="col">First Name</th>
                  <th scope="col">Last Name</th>
                  <th scope="col">Username</th>
                  <th scope="col">Locked</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} onClick={() => handleUserSelect(user)}>
                    <td>{user.firstName}</td>
                    <td>{user.lastName}</td>
                    <td>{user.username}</td>
                    <td>{user.locked ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="col-6 mt-5">
            {selectedUser ? (
              <div>
                <h3>User Details: {selectedUser.firstName}</h3>
                <h3>Role: {selectedUser.role_name}</h3>

                <button
                  type="button"
                  className=" btn btn-outline-warning btn-sm mr-5"
                  onClick={() => console.log("Update User", selectedUser)}
                >
                  Update
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => console.log("Delete User", selectedUser)}
                >
                  Delete
                </button>
                <button
                  className="btn btn-outline-info btn-sm"
                  onClick={() => console.log("Lock User", selectedUser)}
                >
                  Lock
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => console.log("Assign Role", selectedUser)}
                >
                  Assign Role
                </button>

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
                        {selectedUser.locked ? "Yes" : "No"}
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
    </AdminLayout>
  );
}

"use client";
import Image from "next/image";
import DashboardLayout from "../../shared/DashboardLayout";
import React, { useState, useEffect } from "react";

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleClose = async () => {
    setShowModal(false);
    resetForm();
    await fetchUsers(); // Update users when modal is closed
  };

  const handleShow = () => {
    resetForm();
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

    if (response.ok) {
      const data = await response.json();
      setUsers(data);
    } else {
      console.error("Failed to fetch users");
    }
  }

  function resetForm() {
    setFirstName("");
    setLastName("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setError("");
  }

  async function handleCreateUser(): Promise<void> {
    setError("");

    if (!username || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const formData = {
      firstName,
      lastName,
      username,
      password,
    };

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

      if (response.status === 201) {
        setError("");
        const newUser = await response.json();
        setUsers((prevUsers) => [...prevUsers, newUser]);
        handleClose();
      } else {
        setError("User registration failed");
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <DashboardLayout>
      <div className="container-fluid">
        <button
          type="button"
          className="btn btn-primary d-flex align-items-center"
          onClick={handleShow}
        >
          <Image
            src="/icons/person-add.svg"
            alt="Add user"
            width={16}
            height={16}
            className="m-2"
          />
          Add User
        </button>
      </div>
      <div className="container-fluid">
        <table className="table mt-3">
          <thead>
            <tr>
              <th scope="col">First Name</th>
              <th scope="col">Last Name</th>
              <th scope="col">Username</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.firstName}</td>
                <td>{user.lastName}</td>
                <td>{user.username}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add new user</h5>
              </div>
              <div className="modal-body">
                {error && <p style={{ color: "red" }}>{error}</p>}
                <form>
                  <div className="form-group row m-2">
                    <label
                      htmlFor="firstName"
                      className="col-sm-4 col-form-label"
                    >
                      First Name
                    </label>
                    <div className="col-sm-8">
                      <input
                        type="text"
                        className="form-control"
                        id="firstName"
                        name="firstName"
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group row m-2">
                    <label
                      htmlFor="lastName"
                      className="col-sm-4 col-form-label"
                    >
                      Last Name
                    </label>
                    <div className="col-sm-8">
                      <input
                        type="text"
                        className="form-control"
                        id="lastName"
                        name="lastName"
                        placeholder="Last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group row m-2">
                    <label
                      htmlFor="username"
                      className="col-sm-4 col-form-label"
                    >
                      User name
                    </label>
                    <div className="col-sm-8">
                      <input
                        type="text"
                        className="form-control"
                        id="username"
                        name="username"
                        placeholder="Username"
                        autoComplete="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group row m-2">
                    <label
                      htmlFor="password"
                      className="col-sm-4 col-form-label"
                    >
                      Password
                    </label>
                    <div className="col-sm-8">
                      <input
                        type="password"
                        className="form-control"
                        id="password"
                        name="password"
                        placeholder="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group row m-2">
                    <label
                      htmlFor="confirmPassword"
                      className="col-sm-4 col-form-label"
                    >
                      Confirm Password
                    </label>
                    <div className="col-sm-8">
                      <input
                        type="password"
                        className="form-control"
                        id="confirmPassword"
                        name="confirmPassword"
                        placeholder="confirm Password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClose}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleCreateUser}
                  className="btn btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

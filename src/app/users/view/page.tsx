"use client";
import Image from "next/image";
import DashboardLayout from "../../shared/DashboardLayout";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false);

  const handleClose = () => setShowModal(false);
  const handleShow = () => setShowModal(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const router = useRouter();

  async function handleCreateUser(): Promise<void> {
    if(!password || !confirmPassword){
    if ( password !== confirmPassword) {
      setError("passwords do not match");
      return;
    }
  } else {
    setError("passwords not provided");
  }

    const formData = {
      firstName,
      lastName,
      username,
      password,
    };

    try {
      const response = await fetch("/api/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("User registration failed");
      }
      setError("");
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    }
  }
  return (
    <DashboardLayout>
      <div>
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

      {showModal && (
        <div
          className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal show d-block"
          tabIndex="-1"
          role="dialog"
        >
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add new user</h5>
              </div>
              <div className="modal-body">
              {error && <p style={{ color: 'red' }}>{error}</p>}
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
                        placeholder="confirm Password "
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
                <button type="button" onClick={handleCreateUser} className="btn btn-primary">
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

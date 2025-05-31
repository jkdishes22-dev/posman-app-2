"use client";
import React, { useEffect, useState } from "react";
import HomePageLayout from "../shared/HomePageLayout";
import SecureRoute from "../components/SecureRoute";

const ProfilePage = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [pwForm, setPwForm] = useState({ current: "", new: "", confirm: "" });
    const [pwError, setPwError] = useState("");
    const [pwSuccess, setPwSuccess] = useState("");
    const [pwLoading, setPwLoading] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            setError("");
            try {
                const token = localStorage.getItem("token");
                const res = await fetch("/api/users/me", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (!res.ok) {
                    setError(data.error || "Failed to fetch profile");
                    return;
                }
                setUser(data);
            } catch (err: any) {
                setError(err.message || "Failed to fetch profile");
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handlePwChange = (e) => {
        setPwForm({ ...pwForm, [e.target.name]: e.target.value });
    };

    const handlePwSubmit = async (e) => {
        e.preventDefault();
        setPwError("");
        setPwSuccess("");
        if (!pwForm.current || !pwForm.new || !pwForm.confirm) {
            setPwError("All fields are required");
            return;
        }
        if (pwForm.new !== pwForm.confirm) {
            setPwError("New passwords do not match");
            return;
        }
        setPwLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/users/me", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    currentPassword: pwForm.current,
                    newPassword: pwForm.new,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update password");
            setPwSuccess("Password updated successfully");
            setPwForm({ current: "", new: "", confirm: "" });
        } catch (err: any) {
            setPwError(err.message || "Failed to update password");
        } finally {
            setPwLoading(false);
        }
    };

    return (
        <SecureRoute allowAnyAuthenticated roleRequired={null}>
            <HomePageLayout>
                <div className="container mt-4">
                    {loading ? (
                        <div>Loading...</div>
                    ) : error ? (
                        <div className="alert alert-danger">{error}</div>
                    ) : user ? (
                        <div className="row">
                            <div className="col-md-6">
                                <div className="card mb-4">
                                    <div className="card-header">Personal Details</div>
                                    <div className="card-body">
                                        <div className="row">
                                            <div className="col-6">
                                                <p><strong>First Name:</strong> {user.firstName}</p>
                                                <p><strong>Last Name:</strong> {user.lastName}</p>
                                                <p><strong>Username:</strong> {user.username}</p>
                                                <p><strong>Email:</strong> {user.email || <span className="text-muted">N/A</span>}</p>
                                                <p><strong>Status:</strong> {user.status || <span className="text-muted">N/A</span>}</p>
                                            </div>
                                            <div className="col-6">
                                                <p><strong>Locked:</strong> {user.is_locked ? "Yes" : "No"}</p>
                                                <p><strong>Created At:</strong> {user.created_at ? new Date(user.created_at).toLocaleString() : <span className="text-muted">N/A</span>}</p>
                                                <p><strong>Updated At:</strong> {user.updated_at ? new Date(user.updated_at).toLocaleString() : <span className="text-muted">N/A</span>}</p>
                                                <p><strong>Created By (User ID):</strong> {user.created_by || <span className="text-muted">N/A</span>}</p>
                                                <p><strong>Updated By (User ID):</strong> {user.updated_by || <span className="text-muted">N/A</span>}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="card mb-4">
                                    <div className="card-header">Roles</div>
                                    <div className="card-body">
                                        {user.roles && user.roles.length > 0 ? (
                                            <ul>
                                                {user.roles.map((role) => (
                                                    <li key={role.id}>{role.name}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <span className="text-muted">No roles assigned</span>
                                        )}
                                    </div>
                                </div>
                                <div className="card mb-4">
                                    <div className="card-header">Stations</div>
                                    <div className="card-body">
                                        {user.stations && user.stations.length > 0 ? (
                                            <ul>
                                                {user.stations.map((station) => (
                                                    <li key={station.id}>
                                                        {station.name} {station.isDefault && <span className="badge bg-primary ms-2">Default</span>} <span className="badge bg-secondary ms-2">{station.status}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <span className="text-muted">No stations assigned</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="card mb-4">
                                    <div className="card-header">Change Password</div>
                                    <div className="card-body">
                                        {pwError && <div className="alert alert-danger py-1">{pwError}</div>}
                                        {pwSuccess && <div className="alert alert-success py-1">{pwSuccess}</div>}
                                        <form onSubmit={handlePwSubmit}>
                                            <div className="mb-3">
                                                <label className="form-label">Current Password</label>
                                                <input type="password" className="form-control" name="current" value={pwForm.current} onChange={handlePwChange} />
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label">New Password</label>
                                                <input type="password" className="form-control" name="new" value={pwForm.new} onChange={handlePwChange} />
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label">Confirm New Password</label>
                                                <input type="password" className="form-control" name="confirm" value={pwForm.confirm} onChange={handlePwChange} />
                                            </div>
                                            <button type="submit" className="btn btn-primary" disabled={pwLoading}>
                                                {pwLoading ? "Updating..." : "Update Password"}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </HomePageLayout>
        </SecureRoute>
    );
};

export default ProfilePage; 
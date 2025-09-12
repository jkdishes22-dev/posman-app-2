"use client";
import React, { useEffect, useState } from "react";
import RoleAwareLayout from "../shared/RoleAwareLayout";
import { withSecureRoute } from "../components/withSecureRoute";

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
        <RoleAwareLayout>
            <div className="container mt-4" style={{
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                minHeight: '100vh',
                padding: '2rem 0'
            }}>
                {loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-3 text-muted">Loading profile...</p>
                    </div>
                ) : error ? (
                    <div className="alert alert-danger shadow-sm">{error}</div>
                ) : user ? (
                    <div className="row g-4">
                        <div className="col-md-6">
                            <div className="card mb-4 shadow-lg border-0" style={{ borderRadius: '12px' }}>
                                <div className="card-header bg-gradient text-white border-0" style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    borderRadius: '12px 12px 0 0'
                                }}>
                                    <h5 className="mb-0">
                                        <i className="bi bi-person-circle me-2"></i>
                                        Personal Details
                                    </h5>
                                </div>
                                <div className="card-body">
                                    <div className="row">
                                        <div className="col-6">
                                            <p><strong>First Name:</strong> {user.firstName}</p>
                                            <p><strong>Last Name:</strong> {user.lastName}</p>
                                            <p><strong>Username:</strong> {user.username}</p>
                                            <p><strong>Email:</strong> {user.email || <span className="text-muted">N/A</span>}</p>
                                            <p><strong>Status:</strong> {user.status || <span className="text-muted">N/A</span>}</p>
                                            <p><strong>User Role:</strong> {user.roles && user.roles.length > 0 ? (
                                                <span className="badge bg-primary ms-2">{user.roles[0].name}</span>
                                            ) : <span className="text-muted">N/A</span>}</p>
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
                            <div className="card mb-4 shadow-lg border-0" style={{ borderRadius: '12px' }}>
                                <div className="card-header bg-gradient text-white border-0" style={{
                                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                    borderRadius: '12px 12px 0 0'
                                }}>
                                    <h5 className="mb-0">
                                        <i className="bi bi-hdd-stack me-2"></i>
                                        Stations
                                    </h5>
                                </div>
                                <div className="card-body">
                                    {user.stations && user.stations.length > 0 ? (
                                        <ul className="list-unstyled">
                                            {user.stations.map((station) => (
                                                <li key={station.id} className="mb-3 p-3 border rounded shadow-sm hover-shadow" style={{
                                                    transition: 'all 0.3s ease',
                                                    borderRadius: '8px',
                                                    backgroundColor: '#f8f9fa'
                                                }}>
                                                    <div className="d-flex justify-content-between align-items-start">
                                                        <div className="flex-grow-1">
                                                            <h6 className="mb-2 fw-semibold text-primary">
                                                                <i className="bi bi-hdd me-2"></i>
                                                                {station.name}
                                                            </h6>
                                                            <div className="d-flex gap-2 mb-2">
                                                                {station.isDefault && (
                                                                    <span className="badge bg-primary">
                                                                        <i className="bi bi-star-fill me-1"></i>
                                                                        Default Station
                                                                    </span>
                                                                )}
                                                                <span className={`badge ${station.status === 'enabled' ? 'bg-success' : 'bg-secondary'}`}>
                                                                    <i className={`bi ${station.status === 'enabled' ? 'bi-check-circle' : 'bi-pause-circle'} me-1`}></i>
                                                                    {station.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {station.defaultPricelist && (
                                                        <div className="mt-2">
                                                            <span className="badge bg-info text-dark">
                                                                <i className="bi bi-tag me-1"></i>
                                                                Default Pricelist: {station.defaultPricelist.name}
                                                            </span>
                                                        </div>
                                                    )}
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
                            <div className="card mb-4 shadow-lg border-0" style={{ borderRadius: '12px' }}>
                                <div className="card-header bg-gradient text-white border-0" style={{
                                    background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                                    borderRadius: '12px 12px 0 0'
                                }}>
                                    <h5 className="mb-0">
                                        <i className="bi bi-key me-2"></i>
                                        Change Password
                                    </h5>
                                </div>
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
        </RoleAwareLayout>
    );
};

export default withSecureRoute(ProfilePage, { allowAnyAuthenticated: true }); 
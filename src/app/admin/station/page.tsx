"use client";
import React, { useState, useEffect } from "react";
import AdminLayout from "src/app/shared/AdminLayout";
import StationNew from "./station-new";
import "bootstrap/dist/css/bootstrap.min.css";
import { Button } from "react-bootstrap";
import { AuthError } from "src/app/types/types";

export default function StationPage() {
  const [stations, setStations] = useState([]);
  const [pricelists, setPricelists] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [authError, setAuthError] = useState<AuthError>(null);
  const [fetchStationsError, setFetchStationsError] = useState(null);
  const [fetchPricelistsError, setFetchPricelistsError] = useState(null);
  const [fetchUsersError, setFetchUsersError] = useState(null);
  const [isLoadingPricelists, setIsLoadingPricelists] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [availablePricelists, setAvailablePricelists] = useState([]);
  const [showPricelistModal, setShowPricelistModal] = useState(false);
  const [linkPricelistError, setLinkPricelistError] = useState(null);
  const [setDefaultError, setSetDefaultError] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [addUserError, setAddUserError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await fetch("/api/stations", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (response.ok) {
          setStations(response.ok ? data : []);
        } else if (response.status === 403) {
          setAuthError(data);
        } else {
          setFetchStationsError(
            "Failed to fetch items " + JSON.stringify(data),
          );
        }
      } catch (error: any) {
        console.error("Failed to fetch stations", error);
        setStations([]);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (selectedStationId) {
      fetchStationPricelist(selectedStationId);
      fetchStationUsers(selectedStationId);
    }
  }, [selectedStationId]);

  const fetchStationPricelist = async (stationId: number) => {
    const token = localStorage.getItem("token");
    setIsLoadingPricelists(true);
    setFetchPricelistsError(null);

    try {
      const response = await fetch(`/api/stations/${stationId}/pricelists?t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch station pricelists");
      } else {
        const pricelistData = await response.json();
        setPricelists(pricelistData.pricelists || []);
        setFetchPricelistsError(null);
      }
    } catch (error: any) {
      console.error("Failed to fetch station pricelists", error);
      setFetchPricelistsError(error.message || "Failed to fetch station pricelists");
      setPricelists([]);
    } finally {
      setIsLoadingPricelists(false);
    }
  };

  const fetchStationUsers = async (stationId: number) => {
    const token = localStorage.getItem("token");
    setIsLoadingUsers(true);
    setFetchUsersError(null);

    try {
      const response = await fetch(`/api/stations/${stationId}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch station users");
      } else {
        const dataUsers = await response.json();
        setUsers(dataUsers);
        setFetchUsersError(null);
      }
    } catch (error: any) {
      console.error("Failed to fetch station users", error);
      setFetchUsersError(error.message || "Failed to fetch station users");
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleAddStation = async (name: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/station", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        const newStation = await response.json();
        setStations([...stations, newStation]);
        setShowModal(false);
      } else {
        console.error("Failed to add station");
      }
    } catch (error: any) {
      console.error("Failed to add station", error);
    }
  };

  const fetchAvailablePricelists = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/pricelists/available", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailablePricelists(data.pricelists || []);
      }
    } catch (error: any) {
      console.error("Failed to fetch available pricelists", error);
    }
  };

  const handleLinkPricelist = async (pricelistId: number) => {
    if (!selectedStationId) return;

    // Clear any previous errors
    setLinkPricelistError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/stations/${selectedStationId}/pricelists`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pricelistId }),
      });

      if (response.ok) {
        // Refresh pricelists for the station
        await fetchStationPricelist(selectedStationId);
        // Refresh available pricelists
        await fetchAvailablePricelists();
        setShowPricelistModal(false);
        setLinkPricelistError(null);
      } else {
        const errorData = await response.json();
        if (response.status === 403) {
          setLinkPricelistError({
            message: "Missing permissions to link pricelist",
            details: errorData.missingPermissions || ["CAN_MANAGE_PRICELIST"],
            status: 403
          });
        } else {
          setLinkPricelistError({
            message: errorData.message || "Failed to link pricelist",
            details: [],
            status: response.status
          });
        }
      }
    } catch (error: any) {
      setLinkPricelistError({
        message: "Network error occurred while linking pricelist",
        details: [],
        status: 0
      });
    }
  };

  const handleUnlinkPricelist = async (pricelistId: number) => {
    if (!selectedStationId) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/stations/${selectedStationId}/pricelists?pricelistId=${pricelistId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        // Refresh pricelists for the station
        fetchStationPricelist(selectedStationId);
        // Refresh available pricelists
        fetchAvailablePricelists();
      } else {
        console.error("Failed to unlink pricelist");
      }
    } catch (error: any) {
      console.error("Failed to unlink pricelist", error);
    }
  };

  const handleSetDefaultPricelist = async (pricelistId: number) => {
    if (!selectedStationId) return;

    setSetDefaultError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/stations/${selectedStationId}/default-pricelist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pricelistId }),
      });

      if (response.ok) {
        // Refresh pricelists for the station
        await fetchStationPricelist(selectedStationId);
        setSetDefaultError(null);
      } else {
        const errorData = await response.json();
        setSetDefaultError({
          message: errorData.message || "Failed to set default pricelist",
          status: response.status
        });
      }
    } catch (error: any) {
      setSetDefaultError({
        message: "Network error occurred while setting default pricelist",
        status: 0
      });
    }
  };

  // User management functions
  const fetchAvailableUsers = async () => {
    if (!selectedStationId) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/stations/${selectedStationId}/available-users`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data.users || []);
      } else {
        console.error("Failed to fetch available users");
        setAvailableUsers([]);
      }
    } catch (error) {
      console.error("Error fetching available users:", error);
      setAvailableUsers([]);
    }
  };

  const handleAddUser = async (userId: number) => {
    if (!selectedStationId) return;

    setAddUserError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/stations/${selectedStationId}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        // Refresh users for the station
        await fetchStationUsers(selectedStationId);
        // Refresh available users
        await fetchAvailableUsers();
        setShowUserModal(false);
        setAddUserError(null);
      } else {
        const errorData = await response.json();
        setAddUserError({
          message: errorData.message || "Failed to add user to station",
          details: errorData.details || [],
          status: response.status
        });
      }
    } catch (error: any) {
      setAddUserError({
        message: "Network error occurred while adding user",
        details: [],
        status: 0
      });
    }
  };

  const handleRemoveUser = async (userId: number) => {
    if (!selectedStationId) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/stations/${selectedStationId}/users?userId=${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        // Refresh users for the station
        await fetchStationUsers(selectedStationId);
        // Refresh available users
        await fetchAvailableUsers();
      } else {
        console.error("Failed to remove user from station");
      }
    } catch (error) {
      console.error("Error removing user from station:", error);
    }
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: string) => {
    if (!selectedStationId) return;

    try {
      const token = localStorage.getItem("token");
      const action = currentStatus === "enabled" ? "disable" : "enable";

      const response = await fetch(`/api/stations/${selectedStationId}/users`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, action }),
      });

      if (response.ok) {
        // Refresh users for the station
        await fetchStationUsers(selectedStationId);
      } else {
        console.error(`Failed to ${action} user for station`);
      }
    } catch (error) {
      console.error(`Error ${currentStatus === "enabled" ? "disabling" : "enabling"} user for station:`, error);
    }
  };

  return (
    <AdminLayout authError={authError}>
      <div className="container-fluid py-4 bg-gradient min-vh-100" style={{
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
      }}>
        <div className="row g-4">
          {/* Stations List Section */}
          <div className="col-lg-4">
            <div className="card h-100 shadow-lg border-0" style={{ borderRadius: '12px' }}>
              <div className="card-header bg-gradient text-white border-0 d-flex justify-content-between align-items-center" style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px 12px 0 0'
              }}>
                <h4 className="mb-0">
                  <i className="bi bi-building me-2"></i>
                  Stations
                </h4>
                <Button
                  variant="primary"
                  onClick={() => setShowModal(true)}
                  className="btn-sm rounded-pill shadow-sm"
                >
                  <i className="bi bi-plus-circle me-1"></i>
                  Add Station
                </Button>
              </div>
              <div className="card-body p-0">
                <StationNew
                  show={showModal}
                  handleClose={() => setShowModal(false)}
                  handleAddStation={handleAddStation}
                />
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
                      <tr>
                        <th className="px-3 fw-semibold text-primary">ID</th>
                        <th className="px-3 fw-semibold text-primary">Name</th>
                        <th className="px-3 text-center fw-semibold text-primary">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stations.map((station) => (
                        <tr
                          key={station.id}
                          onClick={() => setSelectedStationId(station.id)}
                          className={`cursor-pointer transition-all ${selectedStationId === station.id ? 'table-primary' : ''}`}
                          style={{
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            borderRadius: '8px'
                          }}
                        >
                          <td className="px-3 fw-medium">{station.id}</td>
                          <td className="px-3">{station.name}</td>
                          <td className="px-3 text-center">
                            {(!station.status || station.status === "disabled") && (
                              <Button variant="outline-primary" size="sm" className="me-1">
                                <i className="bi bi-play-circle me-1"></i>
                                Enable
                              </Button>
                            )}
                            {station.status === "enabled" && (
                              <Button variant="outline-secondary" size="sm">
                                <i className="bi bi-pause-circle me-1"></i>
                                Disable
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Station Details Section */}
          <div className="col-lg-8">
            <div className="row g-4">
              {/* Linked Pricelists */}
              <div className="col-md-6">
                <div className="card h-100 shadow-lg border-0" style={{ borderRadius: '12px' }}>
                  <div className="card-header bg-gradient text-white border-0" style={{
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    borderRadius: '12px 12px 0 0'
                  }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h5 className="mb-0">
                        <i className="bi bi-list-ul me-2"></i>
                        Linked Pricelists
                      </h5>
                      {selectedStationId && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            fetchAvailablePricelists();
                            setLinkPricelistError(null);
                            setShowPricelistModal(true);
                          }}
                          className="rounded-pill shadow-sm"
                          disabled={!selectedStationId || stations.find(s => s.id === selectedStationId)?.status === 'disabled'}
                          title={stations.find(s => s.id === selectedStationId)?.status === 'disabled' ? 'Cannot add pricelists to disabled station' : 'Add pricelist to station'}
                        >
                          <i className="bi bi-plus-circle me-1"></i>
                          Add
                        </Button>
                      )}
                    </div>
                    <div className="text-muted small">
                      <i className="bi bi-info-circle me-1"></i>
                      The <strong>Default</strong> pricelist is used for billing on this station. Only one pricelist can be default at a time.
                    </div>
                    {selectedStationId && stations.find(s => s.id === selectedStationId)?.status === 'disabled' && (
                      <div className="alert alert-warning alert-sm mt-2 mb-0" role="alert">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        <strong>Station Disabled:</strong> This station is disabled. Cannot add or manage pricelists and users.
                      </div>
                    )}
                  </div>
                  <div className="card-body">
                    {fetchPricelistsError && (
                      <div className="alert alert-danger alert-sm rounded-3" role="alert">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        {fetchPricelistsError}
                      </div>
                    )}
                    {setDefaultError && (
                      <div className="alert alert-danger alert-sm rounded-3" role="alert">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        {setDefaultError.message}
                      </div>
                    )}
                    {isLoadingPricelists ? (
                      <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status" style={{ width: '2rem', height: '2rem' }}>
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="text-muted mt-3 mb-0">Loading pricelists...</p>
                      </div>
                    ) : (
                      <div className="list-group list-group-flush">
                        {pricelists.length > 0 ? (
                          pricelists.map((pricelist) => (
                            <div key={pricelist.id} className="list-group-item d-flex justify-content-between align-items-center px-0 py-3 border-0 border-bottom hover-shadow" style={{
                              transition: 'all 0.3s ease',
                              borderRadius: '8px',
                              margin: '4px 0'
                            }}>
                              <div className="flex-grow-1">
                                <h6 className="mb-1 fw-semibold">
                                  {pricelist.name}
                                  {pricelist.is_default && (
                                    <span className="badge bg-primary text-white ms-2">
                                      <i className="bi bi-star-fill me-1"></i>Default
                                    </span>
                                  )}
                                </h6>
                                {pricelist.is_default && (
                                  <div className="mt-1">
                                    <small className="text-primary">
                                      <i className="bi bi-info-circle me-1"></i>
                                      This pricelist is used for billing on this station
                                    </small>
                                  </div>
                                )}
                              </div>
                              <div className="d-flex gap-1 flex-wrap">
                                {!pricelist.is_default && (
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => handleSetDefaultPricelist(pricelist.id)}
                                    title={stations.find(s => s.id === selectedStationId)?.status === 'disabled' ? 'Cannot modify disabled station' : 'Set as default pricelist for billing'}
                                    className="flex-shrink-0"
                                    disabled={stations.find(s => s.id === selectedStationId)?.status === 'disabled'}
                                  >
                                    <i className="bi bi-star me-1"></i>
                                    Set Default
                                  </Button>
                                )}
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={() => handleUnlinkPricelist(pricelist.id)}
                                  title={stations.find(s => s.id === selectedStationId)?.status === 'disabled' ? 'Cannot modify disabled station' : 'Remove pricelist from station'}
                                  className="flex-shrink-0"
                                  disabled={stations.find(s => s.id === selectedStationId)?.status === 'disabled'}
                                >
                                  <i className="bi bi-trash me-1"></i>
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-5">
                            <i className="bi bi-inbox text-muted" style={{ fontSize: '3rem' }}></i>
                            <p className="text-muted mt-3 mb-0">No pricelists linked to this station</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Linked Users */}
              <div className="col-md-6">
                <div className="card h-100 shadow-lg border-0" style={{ borderRadius: '12px' }}>
                  <div className="card-header bg-gradient text-white border-0 d-flex justify-content-between align-items-center" style={{
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    borderRadius: '12px 12px 0 0'
                  }}>
                    <h5 className="mb-0">
                      <i className="bi bi-people me-2"></i>
                      Linked Users
                    </h5>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setShowUserModal(true);
                        fetchAvailableUsers();
                      }}
                      className="btn-sm rounded-pill shadow-sm"
                      disabled={!selectedStationId || stations.find(s => s.id === selectedStationId)?.status === 'disabled'}
                      title={stations.find(s => s.id === selectedStationId)?.status === 'disabled' ? 'Cannot add users to disabled station' : 'Add user to station'}
                    >
                      <i className="bi bi-plus-circle me-1"></i>
                      Add
                    </Button>
                  </div>
                  <div className="card-body">
                    {selectedStationId && stations.find(s => s.id === selectedStationId)?.status === 'disabled' && (
                      <div className="alert alert-warning alert-sm rounded-3 mb-3" role="alert">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        <strong>Station Disabled:</strong> This station is disabled. Cannot add or manage users.
                      </div>
                    )}
                    {fetchUsersError && (
                      <div className="alert alert-danger alert-sm rounded-3" role="alert">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        {fetchUsersError}
                      </div>
                    )}
                    {isLoadingUsers ? (
                      <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status" style={{ width: '2rem', height: '2rem' }}>
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="text-muted mt-3 mb-0">Loading users...</p>
                      </div>
                    ) : (
                      <div className="list-group list-group-flush">
                        {users.length > 0 ? (
                          users.map((user) => (
                            <div key={user.id} className="list-group-item d-flex justify-content-between align-items-center px-0 py-3 border-0 border-bottom hover-shadow" style={{
                              transition: 'all 0.3s ease',
                              borderRadius: '8px',
                              margin: '4px 0'
                            }}>
                              <div>
                                <h6 className="mb-1 fw-semibold">{user.firstName} {user.lastName}</h6>
                                <small className="text-muted">@{user.username}</small>
                              </div>
                              <div className="d-flex gap-1">
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={() => handleToggleUserStatus(user.id, user.status)}
                                  title={stations.find(s => s.id === selectedStationId)?.status === 'disabled' ? 'Cannot modify disabled station' : (user.status === "enabled" ? "Disable user from this station" : "Enable user for this station")}
                                  className="flex-shrink-0"
                                  disabled={stations.find(s => s.id === selectedStationId)?.status === 'disabled'}
                                >
                                  <i className={`bi ${user.status === "enabled" ? "bi-pause-circle" : "bi-play-circle"} me-1`}></i>
                                  {user.status === "enabled" ? "Disable" : "Enable"}
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleRemoveUser(user.id)}
                                  title={stations.find(s => s.id === selectedStationId)?.status === 'disabled' ? 'Cannot modify disabled station' : 'Remove user from station completely'}
                                  className="flex-shrink-0"
                                  disabled={stations.find(s => s.id === selectedStationId)?.status === 'disabled'}
                                >
                                  <i className="bi bi-trash me-1"></i>
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-5">
                            <i className="bi bi-person-x text-muted" style={{ fontSize: '3rem' }}></i>
                            <p className="text-muted mt-3 mb-0">No users linked to this station</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricelist Selection Modal */}
      {showPricelistModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '500px', margin: 'auto' }}>
            <div className="modal-content">
              <div className="modal-header py-3">
                <div className="flex-grow-1">
                  <h5 className="modal-title mb-0">
                    <i className="bi bi-list-ul me-2"></i>
                    Link Pricelist to Station
                  </h5>
                  {selectedStationId && (
                    <div className="mt-1">
                      <small className="text-muted">
                        <i className="bi bi-hdd me-1"></i>
                        Station: <strong>{stations.find(s => s.id === selectedStationId)?.name}</strong>
                      </small>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowPricelistModal(false)}
                ></button>
              </div>

              {/* Error Display */}
              {linkPricelistError && (
                <div className="alert alert-danger mx-3 mt-2 mb-0" role="alert">
                  <div className="d-flex align-items-start">
                    <i className="bi bi-exclamation-triangle-fill me-2 mt-1"></i>
                    <div className="flex-grow-1">
                      <strong>{linkPricelistError.message}</strong>
                      {linkPricelistError.details && linkPricelistError.details.length > 0 && (
                        <div className="mt-2">
                          <small className="text-muted">Missing permissions:</small>
                          <ul className="mb-0 mt-1">
                            {linkPricelistError.details.map((permission, index) => (
                              <li key={index} className="small">
                                <code className="bg-light px-1 rounded">{permission}</code>
                              </li>
                            ))}
                          </ul>
                          <small className="text-muted d-block mt-2">
                            <i className="bi bi-info-circle me-1"></i>
                            Contact your administrator to add these permissions to your role.
                          </small>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn-close btn-close-sm"
                      onClick={() => setLinkPricelistError(null)}
                      aria-label="Close error"
                    ></button>
                  </div>
                </div>
              )}

              <div className="modal-body p-0" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {availablePricelists.length > 0 ? (
                  <div className="list-group list-group-flush">
                    {availablePricelists.map((pricelist) => (
                      <div key={pricelist.id} className="list-group-item d-flex justify-content-between align-items-center py-2 px-3">
                        <div className="flex-grow-1 me-2">
                          <h6 className="mb-1 text-truncate" style={{ fontSize: '0.9rem' }}>{pricelist.name}</h6>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleLinkPricelist(pricelist.id)}
                          className="flex-shrink-0"
                          style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                        >
                          <i className="bi bi-plus-circle me-1"></i>
                          Link
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <i className="bi bi-inbox text-muted" style={{ fontSize: '2rem' }}></i>
                    <p className="text-muted mt-2 mb-0">No available pricelists to link</p>
                  </div>
                )}
              </div>
              <div className="modal-footer py-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowPricelistModal(false)}
                  size="sm"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Selection Modal */}
      {showUserModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '500px', margin: 'auto' }}>
            <div className="modal-content">
              <div className="modal-header py-3">
                <h5 className="modal-title mb-0">
                  <i className="bi bi-person-plus me-2"></i>
                  Add User to Station
                </h5>
                <small className="text-muted">
                  <i className="bi bi-info-circle me-1"></i>
                  Adding a user gives them permission to bill at this station
                </small>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowUserModal(false)}
                ></button>
              </div>
              <div className="modal-body py-3">
                {addUserError && (
                  <div className="alert alert-danger alert-sm rounded-3 mb-3" role="alert">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    <strong>Error:</strong> {addUserError.message}
                    {addUserError.status === 403 && (
                      <div className="mt-2">
                        <small>
                          <strong>Missing Permission:</strong> CAN_EDIT_USER_STATION<br />
                          <em>Contact your administrator to assign this permission to your role.</em>
                        </small>
                      </div>
                    )}
                  </div>
                )}
                {availableUsers.length > 0 ? (
                  <div>
                    <div className="alert alert-info alert-sm rounded-3 mb-3" role="alert">
                      <i className="bi bi-info-circle me-1"></i>
                      <small>
                        Only users with <span className="badge bg-primary text-white ms-1 me-1">waiter</span>
                        or <span className="badge bg-danger text-white ms-1 me-1">admin</span> roles who are not locked can be added to stations
                      </small>
                    </div>
                    <div className="list-group list-group-flush">
                      {availableUsers.map((user) => (
                        <div key={user.id} className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-0 border-bottom">
                          <div className="flex-grow-1">
                            <h6 className="mb-1 fw-semibold">{user.firstName} {user.lastName}</h6>
                            <small className="text-muted">@{user.username}</small>
                            {user.role_name && (
                              <span className={`badge ms-2 ${user.role_name === 'admin' ? 'bg-danger' : 'bg-primary'
                                } text-white`} style={{ fontSize: '0.7rem' }}>
                                {user.role_name}
                              </span>
                            )}
                          </div>
                          <div className="d-flex gap-1">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleAddUser(user.id)}
                              className="flex-shrink-0 rounded-pill"
                              style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                              title="Add user to this station (gives billing permission)"
                            >
                              <i className="bi bi-plus-circle me-1"></i>
                              Add
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <i className="bi bi-person-x text-muted" style={{ fontSize: '2rem' }}></i>
                    <p className="text-muted mt-2 mb-0">No available users to add</p>
                    <small className="text-muted">
                      Only users with <span className="badge bg-primary text-white ms-1 me-1">waiter</span>
                      or <span className="badge bg-danger text-white ms-1 me-1">admin</span> roles who are not locked can be added to stations
                    </small>
                  </div>
                )}
              </div>
              <div className="modal-footer py-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowUserModal(false)}
                  size="sm"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

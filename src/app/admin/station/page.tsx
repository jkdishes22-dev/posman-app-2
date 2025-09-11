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
      const response = await fetch(`/api/stations/${stationId}/pricelists`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch station pricelists");
      } else {
        const pricelistData = await response.json();
        setPricelists(pricelistData);
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
        fetchStationPricelist(selectedStationId);
        // Refresh available pricelists
        fetchAvailablePricelists();
        setShowPricelistModal(false);
      } else {
        console.error("Failed to link pricelist");
      }
    } catch (error: any) {
      console.error("Failed to link pricelist", error);
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

  return (
    <AdminLayout authError={authError}>
      <div className="container-fluid py-4 bg-light min-vh-100">
        <div className="row g-4">
          {/* Stations List Section */}
          <div className="col-lg-4">
            <div className="card h-100 shadow-sm border-0">
              <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center">
                <h4 className="mb-0 text-dark">
                  <i className="bi bi-building me-2 text-primary"></i>
                  Stations
                </h4>
                <Button
                  variant="primary"
                  onClick={() => setShowModal(true)}
                  className="btn-sm"
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
                    <thead className="table-light">
                      <tr>
                        <th className="px-3 fw-semibold">ID</th>
                        <th className="px-3 fw-semibold">Name</th>
                        <th className="px-3 text-center fw-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stations.map((station) => (
                        <tr
                          key={station.id}
                          onClick={() => setSelectedStationId(station.id)}
                          className={`cursor-pointer ${selectedStationId === station.id ? 'table-primary' : ''}`}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="px-3 fw-medium">{station.id}</td>
                          <td className="px-3">{station.name}</td>
                          <td className="px-3 text-center">
                            {(!station.status || station.status === "disabled") && (
                              <Button variant="success" size="sm" className="me-1">
                                <i className="bi bi-check-circle me-1"></i>
                                Enable
                              </Button>
                            )}
                            {station.status === "enabled" && (
                              <Button variant="danger" size="sm">
                                <i className="bi bi-x-circle me-1"></i>
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
                <div className="card h-100 shadow-sm border-0">
                  <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 text-dark">
                      <i className="bi bi-list-ul me-2 text-primary"></i>
                      Linked Pricelists
                    </h5>
                    {selectedStationId && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => {
                          fetchAvailablePricelists();
                          setShowPricelistModal(true);
                        }}
                      >
                        <i className="bi bi-plus-circle me-1"></i>
                        Add
                      </Button>
                    )}
                  </div>
                  <div className="card-body">
                    {fetchPricelistsError && (
                      <div className="alert alert-danger alert-sm rounded-3" role="alert">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        {fetchPricelistsError}
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
                            <div key={pricelist.id} className="list-group-item d-flex justify-content-between align-items-center px-0 py-3 border-0 border-bottom">
                              <div>
                                <h6 className="mb-1 fw-semibold">
                                  {pricelist.name}
                                  {pricelist.is_default && (
                                    <span className="badge bg-warning text-dark ms-2">Default</span>
                                  )}
                                </h6>
                                <small className="text-muted">ID: {pricelist.id}</small>
                              </div>
                              <div className="d-flex gap-1">
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleUnlinkPricelist(pricelist.id)}
                                  title="Remove from station"
                                >
                                  <i className="bi bi-trash"></i>
                                </Button>
                                {(!pricelist.status || pricelist.status === "inactive") && (
                                  <Button variant="success" size="sm" className="rounded-pill">
                                    <i className="bi bi-check-circle me-1"></i>
                                    Enable
                                  </Button>
                                )}
                                {pricelist.status === "active" && (
                                  <Button variant="danger" size="sm" className="rounded-pill">
                                    <i className="bi bi-x-circle me-1"></i>
                                    Disable
                                  </Button>
                                )}
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
                <div className="card h-100 shadow-sm border-0">
                  <div className="card-header bg-white border-bottom">
                    <h5 className="mb-0 text-dark">
                      <i className="bi bi-people me-2 text-primary"></i>
                      Linked Users
                    </h5>
                  </div>
                  <div className="card-body">
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
                            <div key={user.id} className="list-group-item d-flex justify-content-between align-items-center px-0 py-3 border-0 border-bottom">
                              <div>
                                <h6 className="mb-1 fw-semibold">{user.firstName} {user.lastName}</h6>
                                <small className="text-muted">@{user.username}</small>
                              </div>
                              <div className="btn-group" role="group">
                                <Button
                                  variant="danger"
                                  size="sm"
                                  className="me-1 rounded-pill"
                                >
                                  <i className="bi bi-x-circle me-1"></i>
                                  Disable
                                </Button>
                                <Button
                                  variant="success"
                                  size="sm"
                                  className="rounded-pill"
                                >
                                  <i className="bi bi-check-circle me-1"></i>
                                  Enable
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
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-list-ul me-2"></i>
                  Link Pricelist to Station
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowPricelistModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {availablePricelists.length > 0 ? (
                  <div className="list-group">
                    {availablePricelists.map((pricelist) => (
                      <div key={pricelist.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">{pricelist.name}</h6>
                          <small className="text-muted">ID: {pricelist.id}</small>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleLinkPricelist(pricelist.id)}
                        >
                          <i className="bi bi-plus-circle me-1"></i>
                          Link
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <i className="bi bi-inbox text-muted" style={{ fontSize: '3rem' }}></i>
                    <p className="text-muted mt-3 mb-0">No available pricelists to link</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <Button variant="secondary" onClick={() => setShowPricelistModal(false)}>
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

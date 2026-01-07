"use client";
import React, { useState, useEffect } from "react";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import StationNew from "./station-new";
import "bootstrap/dist/css/bootstrap.min.css";
import { Button } from "react-bootstrap";
import { AuthError } from "src/app/types/types";
import { useApiCall } from "src/app/utils/apiUtils";
import { ApiErrorResponse } from "src/app/utils/errorUtils";
import ErrorDisplay from "src/app/components/ErrorDisplay";
import { useTooltips } from "src/app/hooks/useTooltips";

export default function StationPage() {
  useTooltips();
  const [stations, setStations] = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);
  const [pricelists, setPricelists] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "activate" | "deactivate", stationId: number, stationName: string } | null>(null);
  const [authError, setAuthError] = useState<AuthError>(null);
  const [fetchStationsError, setFetchStationsError] = useState(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const apiCall = useApiCall();
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await apiCall("/api/stations");
        if (result.status >= 200 && result.status < 300) {
          setStations(result.data || []);
          setFilteredStations(result.data || []);
          setFetchStationsError(null);
        } else if (result.status === 403) {
          setAuthError({ message: result.error || "Access denied" });
          setErrorDetails(result.errorDetails);
        } else {
          setFetchStationsError(result.error || "Failed to fetch stations");
          setErrorDetails(result.errorDetails);
        }
      } catch (error: any) {
        setFetchStationsError("Network error occurred while fetching stations");
        setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
        setStations([]);
      }
    };

    fetchData();
  }, []);

  // Filter stations by status
  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredStations(stations);
    } else {
      const filtered = stations.filter(station => station.status === statusFilter);
      setFilteredStations(filtered);
    }
  }, [stations, statusFilter]);

  useEffect(() => {
    if (selectedStationId) {
      // Make calls sequential to avoid database connection conflicts
      const fetchStationData = async () => {
        await fetchStationPricelist(selectedStationId);
        await fetchStationUsers(selectedStationId);
      };
      fetchStationData();
    }
  }, [selectedStationId]);

  const fetchStationPricelist = async (stationId: number) => {
    setIsLoadingPricelists(true);
    setFetchPricelistsError(null);

    try {
      const result = await apiCall(`/api/stations/${stationId}/pricelists?t=${Date.now()}`);
      if (result.status === 200) {
        setPricelists(result.data?.pricelists || []);
        setFetchPricelistsError(null);
      } else {
        setFetchPricelistsError(result.error || "Failed to fetch station pricelists");
        setErrorDetails(result.errorDetails);
        setPricelists([]);
      }
    } catch (error: any) {
      console.error("Failed to fetch station pricelists", error);
      setFetchPricelistsError("Network error occurred while fetching station pricelists");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      setPricelists([]);
    } finally {
      setIsLoadingPricelists(false);
    }
  };

  const fetchStationUsers = async (stationId: number) => {
    setIsLoadingUsers(true);
    setFetchUsersError(null);

    try {
      const result = await apiCall(`/api/stations/${stationId}/users`);
      if (result.status === 200) {
        setUsers(result.data || []);
        setFetchUsersError(null);
      } else {
        setFetchUsersError(result.error || "Failed to fetch station users");
        setErrorDetails(result.errorDetails);
        setUsers([]);
      }
    } catch (error: any) {
      console.error("Failed to fetch station users", error);
      setFetchUsersError("Network error occurred while fetching station users");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleAddStation = async (name: string, description: string) => {
    try {
      const result = await apiCall("/api/stations", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      });

      if (result.status >= 200 && result.status < 300) {
        setShowModal(false);
        setError(null);
        // Refresh the full list from server to ensure consistency
        const refreshResult = await apiCall("/api/stations");
        if (refreshResult.status >= 200 && refreshResult.status < 300) {
          setStations(refreshResult.data || []);
          setFilteredStations(refreshResult.data || []);
        }
      } else {
        setError(result.error || "Failed to add station");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError("Network error occurred while adding station");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const fetchAvailablePricelists = async () => {
    try {
      const result = await apiCall("/api/menu/pricelists");
      if (result.status === 200) {
        setAvailablePricelists(result.data || []);
      } else {
        console.error("Failed to fetch available pricelists:", result.error);
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      console.error("Failed to fetch available pricelists", error);
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleLinkPricelist = async (pricelistId: number) => {
    if (!selectedStationId) return;

    // Clear any previous errors
    setLinkPricelistError(null);

    try {
      const result = await apiCall(`/api/stations/${selectedStationId}/pricelists`, {
        method: "POST",
        body: JSON.stringify({ pricelistId }),
      });

      if (result.status === 200) {
        // Refresh pricelists for the station
        await fetchStationPricelist(selectedStationId);
        // Refresh available pricelists
        await fetchAvailablePricelists();
        setShowPricelistModal(false);
        setLinkPricelistError(null);
      } else if (result.status === 403) {
        setLinkPricelistError({
          message: "Missing permissions to link pricelist",
          details: result.errorDetails?.missingPermissions || ["CAN_MANAGE_PRICELIST"],
          status: 403
        });
        setErrorDetails(result.errorDetails);
      } else {
        setLinkPricelistError({
          message: result.error || "Failed to link pricelist",
          details: [],
          status: result.status
        });
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setLinkPricelistError({
        message: "Network error occurred while linking pricelist",
        details: [],
        status: 0
      });
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleUnlinkPricelist = async (pricelistId: number) => {
    if (!selectedStationId) return;

    try {
      const result = await apiCall(`/api/stations/${selectedStationId}/pricelists?pricelistId=${pricelistId}`, {
        method: "DELETE",
      });

      if (result.status === 200) {
        // Refresh pricelists for the station
        fetchStationPricelist(selectedStationId);
        // Refresh available pricelists
        fetchAvailablePricelists();
      } else {
        console.error("Failed to unlink pricelist:", result.error);
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      console.error("Failed to unlink pricelist", error);
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleSetDefaultPricelist = async (pricelistId: number) => {
    if (!selectedStationId) return;

    setSetDefaultError(null);

    try {
      const result = await apiCall(`/api/stations/${selectedStationId}/default-pricelist`, {
        method: "POST",
        body: JSON.stringify({ pricelistId }),
      });

      if (result.status === 200) {
        // Refresh pricelists for the station
        await fetchStationPricelist(selectedStationId);
        setSetDefaultError(null);
      } else {
        setSetDefaultError({
          message: result.error || "Failed to set default pricelist",
          status: result.status
        });
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setSetDefaultError({
        message: "Network error occurred while setting default pricelist",
        status: 0
      });
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  // User management functions
  const fetchAvailableUsers = async () => {
    if (!selectedStationId) return;

    try {
      const result = await apiCall(`/api/stations/${selectedStationId}/available-users`);
      if (result.status === 200) {
        setAvailableUsers(result.data?.users || []);
      } else {
        console.error("Failed to fetch available users:", result.error);
        setErrorDetails(result.errorDetails);
        setAvailableUsers([]);
      }
    } catch (error) {
      console.error("Error fetching available users:", error);
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      setAvailableUsers([]);
    }
  };

  const handleAddUser = async (userId: number) => {
    if (!selectedStationId) return;

    setAddUserError(null);

    try {
      const result = await apiCall(`/api/stations/${selectedStationId}/users`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      });

      if (result.status === 200) {
        // Refresh users for the station
        await fetchStationUsers(selectedStationId);
        // Refresh available users
        await fetchAvailableUsers();
        setShowUserModal(false);
        setAddUserError(null);
      } else {
        setAddUserError({
          message: result.error || "Failed to add user to station",
          details: result.errorDetails?.details || [],
          status: result.status
        });
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setAddUserError({
        message: "Network error occurred while adding user",
        details: [],
        status: 0
      });
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleRemoveUser = async (userId: number) => {
    if (!selectedStationId) return;

    try {
      const result = await apiCall(`/api/stations/${selectedStationId}/users?userId=${userId}`, {
        method: "DELETE",
      });

      if (result.status === 200) {
        // Refresh users for the station
        await fetchStationUsers(selectedStationId);
        // Refresh available users
        await fetchAvailableUsers();
      } else {
        setError(result.error || "Failed to remove user from station");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError("Network error occurred while removing user from station");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: string) => {
    if (!selectedStationId) return;

    try {
      const action = currentStatus === "active" ? "deactivate" : "activate";

      const result = await apiCall(`/api/stations/${selectedStationId}/users`, {
        method: "PATCH",
        body: JSON.stringify({ userId, action }),
      });

      if (result.status === 200) {
        // Refresh users for the station
        await fetchStationUsers(selectedStationId);
      } else {
        setError(result.error || `Failed to ${action} user for station`);
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError(`Network error occurred while ${currentStatus === "active" ? "deactivating" : "activating"} user for station`);
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleToggleStationStatus = (stationId: number, currentStatus: string, stationName: string) => {
    const action = currentStatus === "active" ? "deactivate" : "activate";
    setConfirmAction({ type: action, stationId, stationName });
    setShowConfirmModal(true);
  };

  const confirmToggleStationStatus = async () => {
    if (!confirmAction) return;

    try {
      const result = await apiCall(`/api/stations/${confirmAction.stationId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ action: confirmAction.type }),
      });

      if (result.status === 200) {
        console.log("Station status updated successfully, refreshing data...");
        // Refresh stations list
        const refreshResult = await apiCall("/api/stations");
        console.log("Refreshed stations data:", refreshResult.data);
        if (refreshResult.status === 200) {
          setStations(refreshResult.data || []);
          // Don't set filteredStations here - let the useEffect handle it
          // This ensures proper filtering by status
          console.log("Stations updated, useEffect will handle filtering");
        } else {
          console.error("Failed to refresh stations:", refreshResult.error);
          setErrorDetails(refreshResult.errorDetails);
        }
        setShowConfirmModal(false);
        setConfirmAction(null);
        setError(null);
      } else {
        setError(result.error || `Failed to ${confirmAction.type} station`);
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError(`Network error occurred while ${confirmAction.type === "activate" ? "activating" : "deactivating"} station`);
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        {/* Error Display */}
        {error && (
          <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
            <button
              type="button"
              className="btn-close"
              onClick={() => setError(null)}
              aria-label="Close"
            ></button>
          </div>
        )}

        <ErrorDisplay
          error={errorDetails?.message || null}
          errorDetails={errorDetails}
          onDismiss={() => {
            setErrorDetails(null);
          }}
        />

        {/* Header */}
        <div className="bg-primary text-white p-3 mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="h4 mb-0 fw-bold">
              <i className="bi bi-building me-2"></i>
              Station Management
              <i
                className="bi bi-question-circle ms-2"
                style={{ cursor: "help", fontSize: "0.9rem" }}
                data-bs-toggle="tooltip"
                data-bs-placement="bottom"
                title="Manage POS stations and their configurations"
              ></i>
            </h1>
          </div>
        </div>


        {/* Main Content */}
        <div className="row g-4">
          {/* Stations List Section */}
          <div className="col-lg-4">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold">
                    <i className="bi bi-building me-2 text-primary"></i>
                    Stations
                  </h5>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowModal(true)}
                  >
                    <i className="bi bi-plus-circle me-1"></i>
                    Add Station
                  </Button>
                </div>
              </div>
              <div className="card-body p-0">
                {/* Status Filter */}
                <div className="p-3 border-bottom">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                      <label className="form-label fw-semibold mb-0">
                        <i className="bi bi-funnel me-2 text-primary"></i>
                        Filter by Status
                      </label>
                      <select
                        className="form-select"
                        style={{ width: "auto", minWidth: "150px" }}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      {statusFilter !== "all" && (
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => setStatusFilter("all")}
                        >
                          <i className="bi bi-x-circle me-1"></i>
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <StationNew
                  show={showModal}
                  handleClose={() => setShowModal(false)}
                  handleAddStation={handleAddStation}
                />
                <div className="table-responsive" style={{ maxHeight: "400px", overflowY: "auto" }}>
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="fw-semibold">#</th>
                        <th className="fw-semibold">Name</th>
                        <th className="text-center fw-semibold">Status</th>
                        <th className="text-center fw-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStations.map((station, index) => (
                        <tr
                          key={station.id}
                          onClick={() => setSelectedStationId(station.id)}
                          className={`cursor-pointer ${selectedStationId === station.id ? "table-primary" : ""}`}
                          style={{ cursor: "pointer" }}
                        >
                          <td className="fw-medium">{index + 1}</td>
                          <td>{station.name}</td>
                          <td className="text-center">
                            <span className={`badge ${station.status === "active" ? "bg-success" : "bg-secondary"}`}>
                              {station.status === "active" ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="text-center">
                            {station.status !== "active" && (
                              <Button
                                variant="outline-success"
                                size="sm"
                                className="me-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStationStatus(station.id, station.status || "inactive", station.name);
                                }}
                              >
                                <i className="bi bi-play-circle me-1"></i>
                                Activate
                              </Button>
                            )}
                            {station.status === "active" && (
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStationStatus(station.id, station.status, station.name);
                                }}
                              >
                                <i className="bi bi-pause-circle me-1"></i>
                                Deactivate
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
                <div className="card shadow-sm h-100">
                  <div className="card-header bg-light">
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0 fw-bold">
                        <i className="bi bi-list-ul me-2 text-primary"></i>
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
                          disabled={!selectedStationId || stations.find(s => s.id === selectedStationId)?.status !== "active"}
                        >
                          <i className="bi bi-plus-circle me-1"></i>
                          Add
                        </Button>
                      )}
                    </div>
                    <div className="text-muted small mt-2">
                      <i className="bi bi-info-circle me-1"></i>
                      The <strong>Default</strong> pricelist is used for billing on this station.
                    </div>
                    {selectedStationId && stations.find(s => s.id === selectedStationId)?.status !== "active" && (
                      <div className="alert alert-warning alert-sm mt-2 mb-0" role="alert">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        <strong>Station Inactive:</strong> Cannot add or manage pricelists.
                      </div>
                    )}
                  </div>
                  <div className="card-body">
                    {fetchPricelistsError && (
                      <div className="alert alert-danger alert-sm" role="alert">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        {fetchPricelistsError}
                      </div>
                    )}
                    {setDefaultError && (
                      <div className="alert alert-danger alert-sm" role="alert">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        {setDefaultError.message}
                      </div>
                    )}
                    {isLoadingPricelists ? (
                      <div className="text-center py-4">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="text-muted mt-2 mb-0">Loading pricelists...</p>
                      </div>
                    ) : (
                      <div className="list-group list-group-flush">
                        {Array.isArray(pricelists) && pricelists.length > 0 ? (
                          pricelists.map((pricelist) => (
                            <div key={pricelist.id} className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-0 border-bottom">
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
                                  <small className="text-primary">
                                    <i className="bi bi-info-circle me-1"></i>
                                    Used for billing on this station
                                  </small>
                                )}
                              </div>
                              <div className="d-flex gap-1">
                                {!pricelist.is_default && (
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => handleSetDefaultPricelist(pricelist.id)}
                                    disabled={stations.find(s => s.id === selectedStationId)?.status !== "active"}
                                  >
                                    <i className="bi bi-star me-1"></i>
                                    Set Default
                                  </Button>
                                )}
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={() => handleUnlinkPricelist(pricelist.id)}
                                  disabled={stations.find(s => s.id === selectedStationId)?.status !== "active"}
                                >
                                  <i className="bi bi-trash me-1"></i>
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4">
                            <i className="bi bi-inbox text-muted" style={{ fontSize: "2rem" }}></i>
                            <p className="text-muted mt-2 mb-0">No pricelists linked to this station</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Linked Users */}
              <div className="col-md-6">
                <div className="card shadow-sm h-100">
                  <div className="card-header bg-light">
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0 fw-bold">
                        <i className="bi bi-people me-2 text-primary"></i>
                        Linked Users
                      </h5>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setShowUserModal(true);
                          fetchAvailableUsers();
                        }}
                        disabled={!selectedStationId || stations.find(s => s.id === selectedStationId)?.status !== "active"}
                      >
                        <i className="bi bi-plus-circle me-1"></i>
                        Add
                      </Button>
                    </div>
                    {selectedStationId && stations.find(s => s.id === selectedStationId)?.status !== "active" && (
                      <div className="alert alert-warning alert-sm mt-2 mb-0" role="alert">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        <strong>Station Inactive:</strong> Cannot add or manage users.
                      </div>
                    )}
                  </div>
                  <div className="card-body">
                    {fetchUsersError && (
                      <div className="alert alert-danger alert-sm" role="alert">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        {fetchUsersError}
                      </div>
                    )}
                    {isLoadingUsers ? (
                      <div className="text-center py-4">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="text-muted mt-2 mb-0">Loading users...</p>
                      </div>
                    ) : (
                      <div className="list-group list-group-flush">
                        {users.length > 0 ? (
                          users.map((user) => (
                            <div key={user.id} className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-0 border-bottom">
                              <div>
                                <h6 className="mb-1 fw-semibold">{user.firstName} {user.lastName}</h6>
                                <small className="text-muted">@{user.username}</small>
                              </div>
                              <div className="d-flex gap-1">
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={() => handleToggleUserStatus(user.id, user.status)}
                                  disabled={stations.find(s => s.id === selectedStationId)?.status !== "active"}
                                >
                                  <i className={`bi ${user.status === "active" ? "bi-pause-circle" : "bi-play-circle"} me-1`}></i>
                                  {user.status === "active" ? "Deactivate" : "Activate"}
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleRemoveUser(user.id)}
                                  disabled={stations.find(s => s.id === selectedStationId)?.status !== "active"}
                                >
                                  <i className="bi bi-trash me-1"></i>
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4">
                            <i className="bi bi-person-x text-muted" style={{ fontSize: "2rem" }}></i>
                            <p className="text-muted mt-2 mb-0">No users linked to this station</p>
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
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <div className="flex-grow-1">
                  <h5 className="modal-title">
                    <i className="bi bi-list-ul me-2"></i>
                    Link Pricelist to Station
                  </h5>
                  {selectedStationId && (
                    <small className="text-muted">
                      <i className="bi bi-hdd me-1"></i>
                      Station: <strong>{stations.find(s => s.id === selectedStationId)?.name}</strong>
                    </small>
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

              <div className="modal-body" style={{ maxHeight: "400px", overflowY: "auto" }}>
                {availablePricelists.length > 0 ? (
                  <div className="list-group list-group-flush">
                    {availablePricelists.map((pricelist) => (
                      <div key={pricelist.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div className="flex-grow-1 me-2">
                          <h6 className="mb-1">{pricelist.name}</h6>
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
                    <i className="bi bi-inbox text-muted" style={{ fontSize: "2rem" }}></i>
                    <p className="text-muted mt-2 mb-0">No available pricelists to link</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
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
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
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
              <div className="modal-body" style={{ maxHeight: "400px", overflowY: "auto" }}>
                {addUserError && (
                  <div className="alert alert-danger alert-sm mb-3" role="alert">
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
                    <div className="alert alert-info alert-sm mb-3" role="alert">
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
                              <span className={`badge ms-2 ${user.role_name === "admin" ? "bg-danger" : "bg-primary"
                                } text-white`} style={{ fontSize: "0.7rem" }}>
                                {user.role_name}
                              </span>
                            )}
                          </div>
                          <div className="d-flex gap-1">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleAddUser(user.id)}
                              className="btn-enterprise btn-enterprise-primary flex-shrink-0 rounded-pill"
                              style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}
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
                    <i className="bi bi-person-x text-muted" style={{ fontSize: "2rem" }}></i>
                    <p className="text-muted mt-2 mb-0">No available users to add</p>
                    <small className="text-muted">
                      Only users with <span className="badge bg-primary text-white ms-1 me-1">waiter</span>,
                      <span className="badge bg-warning text-dark ms-1 me-1">supervisor</span>, or
                      <span className="badge bg-danger text-white ms-1 me-1">admin</span> roles who are not locked can be added to stations
                    </small>
                  </div>
                )}
              </div>
              <div className="modal-footer">
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

      {/* Confirmation Modal */}
      {showConfirmModal && confirmAction && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className={`bi ${confirmAction.type === "activate" ? "bi-play-circle text-success" : "bi-pause-circle text-danger"} me-2`}></i>
                  {confirmAction.type === "activate" ? "Activate" : "Deactivate"} Station
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowConfirmModal(false);
                    setConfirmAction(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to <strong>{confirmAction.type}</strong> the station
                  <strong> "{confirmAction.stationName}"</strong>?
                </p>
                {confirmAction.type === "deactivate" && (
                  <div className="alert alert-warning" role="alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    <strong>Warning:</strong> Deactivating this station will prevent users from billing on it and will disable all related operations.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowConfirmModal(false);
                    setConfirmAction(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`btn ${confirmAction.type === "activate" ? "btn-success" : "btn-danger"}`}
                  onClick={confirmToggleStationStatus}
                >
                  <i className={`bi ${confirmAction.type === "activate" ? "bi-play-circle" : "bi-pause-circle"} me-1`}></i>
                  {confirmAction.type === "activate" ? "Activate" : "Deactivate"} Station
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </RoleAwareLayout>
  );
}

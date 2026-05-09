"use client";

import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Card, Button, Form, Modal } from "react-bootstrap";
import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import { AuthError, User } from "../../../types/types";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import ErrorDisplay from "../../../components/ErrorDisplay";
import PageHeaderStrip from "../../../components/PageHeaderStrip";
import { useTooltips } from "../../../hooks/useTooltips";

function StationUsersPage() {
  useTooltips();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState("");
  const [userStations, setUserStations] = useState([]);
  const [authError, setAuthError] = useState<AuthError>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showAddToStationModal, setShowAddToStationModal] = useState(false);
  const [modalSelectedUserId, setModalSelectedUserId] = useState("");
  const [modalSelectedStationId, setModalSelectedStationId] = useState("");
  const [modalUserStations, setModalUserStations] = useState<any[]>([]);
  const [isAddingFromModal, setIsAddingFromModal] = useState(false);

  const apiCall = useApiCall();

  useEffect(() => {
    fetchUsers();
    fetchStations();
  }, []);

  useEffect(() => {
    if (Array.isArray(users)) {
      setFilteredUsers(
        users.filter((user: User) =>
          user.firstName.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      );
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      // Fetch all users with a large page size to get all users
      const result = await apiCall("/api/users?page=1&pageSize=1000");
      if (result.status === 200) {
        // API returns { users, total }, extract users array
        const usersArray = Array.isArray(result.data?.users) ? result.data.users : [];
        setUsers(usersArray);
        setFilteredUsers(usersArray);
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to fetch users");
        setErrorDetails(result.errorDetails);
        // Set empty arrays on error
        setUsers([]);
        setFilteredUsers([]);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      // Set empty arrays on error
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchStations = async () => {
    try {
      const result = await apiCall("/api/stations");
      if (result.status === 200) {
        setStations(result.data);
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to fetch stations");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const fetchUserStations = async (userId: number) => {
    try {
      const result = await apiCall(`/api/users/${userId}/stations`);
      if (result.status === 200) {
        setUserStations(result.data);
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to fetch user stations");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleUserSelect = (userId: number) => {
    if (Array.isArray(users)) {
      const userData = users.find((user: User) => user.id === userId);
      if (userData) {
        setSelectedUser(userData);
        fetchUserStations(userId);
      }
    }
  };

  const handleAddUserToStation = async () => {
    if (!selectedUser || !selectedStation) return;

    // Check if station is already assigned
    const stationId = Number(selectedStation);
    const isAlreadyAssigned = userStations.some(
      (us: any) => (us.station?.id || us.station_id) === stationId && us.status === "active"
    );

    if (isAlreadyAssigned) {
      setError("This station is already assigned to the user");
      setErrorDetails(null);
      return;
    }

    try {
      const result = await apiCall(`/api/users/${selectedUser.id}/stations`, {
        method: "POST",
        body: JSON.stringify({
          station: selectedStation,
        }),
      });
      if (result.status === 200 || result.status === 201) {
        fetchUserStations(selectedUser.id);
        setSelectedStation(""); // Clear selection after successful addition
        setError(null);
        setErrorDetails(null);
      } else {
        const errorMessage = result.error || "Failed to add user to station";
        // Check if it's a duplicate error
        if (errorMessage.toLowerCase().includes("already") || errorMessage.toLowerCase().includes("duplicate")) {
          setError("This station is already assigned to the user");
        } else {
          setError(errorMessage);
        }
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const fetchUserStationsForModal = async (userId: number) => {
    try {
      const result = await apiCall(`/api/users/${userId}/stations`);
      if (result.status === 200) {
        const stationsData = Array.isArray(result.data) ? result.data : [];
        setModalUserStations(stationsData);
      } else {
        setModalUserStations([]);
        setError(result.error || "Failed to fetch user stations");
        setErrorDetails(result.errorDetails);
      }
    } catch (err: any) {
      setModalUserStations([]);
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleModalUserChange = async (userId: string) => {
    setModalSelectedUserId(userId);
    setModalSelectedStationId("");
    if (!userId) {
      setModalUserStations([]);
      return;
    }
    await fetchUserStationsForModal(Number(userId));
  };

  const handleAddUserToStationFromModal = async () => {
    if (!modalSelectedUserId || !modalSelectedStationId) return;

    const stationId = Number(modalSelectedStationId);
    const isAlreadyAssigned = modalUserStations.some(
      (us: any) => (us.station?.id || us.station_id) === stationId && us.status === "active"
    );

    if (isAlreadyAssigned) {
      setError("This station is already assigned to the selected user");
      setErrorDetails(null);
      return;
    }

    setIsAddingFromModal(true);
    try {
      const result = await apiCall(`/api/users/${modalSelectedUserId}/stations`, {
        method: "POST",
        body: JSON.stringify({ station: modalSelectedStationId }),
      });

      if (result.status === 200 || result.status === 201) {
        setError(null);
        setErrorDetails(null);
        setShowAddToStationModal(false);
        setModalSelectedUserId("");
        setModalSelectedStationId("");
        setModalUserStations([]);

        await fetchUsers();
        if (selectedUser) {
          await fetchUserStations(selectedUser.id);
        }
      } else {
        setError(result.error || "Failed to add user to station");
        setErrorDetails(result.errorDetails);
      }
    } catch (err: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setIsAddingFromModal(false);
    }
  };

  const makeDefaultSation = async (stationId: number) => {
    // Validate inputs
    if (!selectedUser) {
      alert("Please select a user");
      return;
    }

    if (!stationId || isNaN(Number(stationId)) || stationId <= 0) {
      console.error("Invalid stationId:", stationId);
      alert("Invalid station ID. Please refresh the page and try again.");
      return;
    }

    try {
      const result = await apiCall(`/api/users/${selectedUser.id}/stations`, {
        method: "PATCH",
        body: JSON.stringify({
          stationId: Number(stationId),
        }),
      });
      if (result.status === 200) {
        fetchUserStations(selectedUser.id);
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to update user station");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const disableUserStation = async (userStationId: number) => {
    if (!selectedUser || !userStationId) {
      alert("Please select user and station");
      return;
    }
    try {
      const result = await apiCall(`/api/users/${selectedUser.id}/stations`, {
        method: "PATCH",
        body: JSON.stringify({
          userStationId: userStationId,
          action: "deactivate",
        }),
      });
      if (result.status === 200) {
        fetchUserStations(selectedUser.id);
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to update user station");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <PageHeaderStrip
          className="py-2"
          actions={
            <Button
              variant="light"
              size="sm"
              onClick={() => {
                setShowAddToStationModal(true);
                setModalSelectedUserId("");
                setModalSelectedStationId("");
                setModalUserStations([]);
              }}
              data-bs-toggle="tooltip"
              data-bs-placement="left"
              title="Open modal to assign a user to a station"
            >
              <i className="bi bi-person-plus me-1"></i>
              Add User to Station
            </Button>
          }
        >
          <h1 className="h5 mb-0 fw-bold">
            <i className="bi bi-people-fill me-2" aria-hidden></i>
            Station Users
            <i
              className="bi bi-question-circle ms-2"
              style={{ cursor: "help", fontSize: "0.85rem" }}
              data-bs-toggle="tooltip"
              data-bs-placement="bottom"
              title="Assign users to stations and manage access"
            ></i>
          </h1>
        </PageHeaderStrip>

        <div className="container-fluid px-3">
          <ErrorDisplay
            error={error}
            errorDetails={errorDetails}
            onDismiss={() => {
              setError(null);
              setErrorDetails(null);
            }}
          />
          <div className="row g-2">
            {/* Sidebar: User List */}
            <div className="col-md-4">
              <Card className="mb-0">
                <Card.Header className="py-1 px-2">
                  <label className="form-label fw-semibold mb-0 small">
                    Search Users
                    <i
                      className="bi bi-question-circle ms-2 text-muted"
                      style={{ cursor: "help", fontSize: "0.75rem" }}
                      data-bs-toggle="tooltip"
                      data-bs-placement="right"
                      title="Select a user to view their station assignments"
                    ></i>
                  </label>
                </Card.Header>
                <Card.Body className="p-2">
                  <input
                    type="text"
                    className="form-control form-control-sm mb-2"
                    placeholder="Search Users"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div
                    className="list-group list-group-flush"
                    style={{ maxHeight: "450px", overflowY: "auto" }}
                  >
                    {loadingUsers ? (
                      <li className="list-group-item text-center">
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Loading users...
                      </li>
                    ) : filteredUsers.length > 0 ? (
                      filteredUsers.map((user: User) => (
                        <li
                          key={user.id}
                          className="list-group-item list-group-item-action"
                          onClick={() => handleUserSelect(user.id)}
                          style={{ cursor: "pointer" }}
                        >
                          {user.firstName} {user.lastName}
                        </li>
                      ))
                    ) : (
                      <li className="list-group-item">No users found</li>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </div>

            {/* Main Content: User Details */}
            <div className="col-md-8">
              {selectedUser ? (
                <div className="row g-2">
                  <div className="col-md-4">
                    <Card className="h-100 mb-0">
                      <Card.Header className="py-1 px-2">
                        <small className="fw-semibold">User: {selectedUser.firstName}</small>
                      </Card.Header>
                      <Card.Body className="p-2">
                        <div className="small">
                          <div className="mb-1">
                            <strong>First Name:</strong> {selectedUser.firstName}
                          </div>
                          <div className="mb-1">
                            <strong>Last Name:</strong> {selectedUser.lastName}
                          </div>
                          <div>
                            <strong>Role{selectedUser?.roles && selectedUser.roles.length > 1 ? "s" : ""}:</strong>{" "}
                            {selectedUser?.roles && selectedUser.roles.length > 0
                              ? selectedUser.roles.map((role: any) => role.name).join(", ")
                              : selectedUser?.role?.name || "N/A"}
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </div>
                  <div className="col-md-8">
                    <Card className="h-100 mb-0">
                      <Card.Header className="py-1 px-2">
                        <small className="fw-semibold">
                          Add {selectedUser.firstName} to a station
                          <i
                            className="bi bi-question-circle ms-2 text-muted"
                            style={{ cursor: "help", fontSize: "0.75rem" }}
                            data-bs-toggle="tooltip"
                            data-bs-placement="right"
                            title="Add or remove stations for the selected user"
                          ></i>
                        </small>
                      </Card.Header>
                      <Card.Body className="p-2">
                        <Form.Group className="mb-2">
                          <Form.Label className="small mb-1">Select Station</Form.Label>
                          <Form.Control
                            as="select"
                            size="sm"
                            value={selectedStation}
                            onChange={(e) => setSelectedStation(e.target.value)}
                          >
                            <option value="">Select a station</option>
                            {stations
                              .filter((station) => {
                                // Filter out stations that are already assigned and active
                                return !userStations.some(
                                  (us: any) =>
                                    (us.station?.id || us.station_id) === station.id &&
                                    us.status === "active"
                                );
                              })
                              .map((station) => (
                                <option key={station.id} value={station.id}>
                                  {station.name}
                                </option>
                              ))}
                          </Form.Control>
                        </Form.Group>
                        <Button
                          variant="primary"
                          size="sm"
                          className="mb-2"
                          style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                          onClick={handleAddUserToStation}
                          disabled={!selectedStation}
                          data-bs-toggle="tooltip"
                          data-bs-placement="top"
                          title="Add the selected station to this user"
                        >
                          Add Station
                        </Button>

                        <div>
                          <div className="small fw-semibold mb-1">Current Stations:</div>
                          <div className="table-responsive">
                            <table className="table table-sm table-striped mb-0">
                              <thead>
                                <tr>
                                  <th>Name</th>
                                  <th>Default</th>
                                  <th>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {userStations && userStations.length > 0 ? (
                                  userStations.map(
                                    (station) =>
                                      station && (
                                        <tr key={station.id}>
                                          <td>{station.station?.name || "N/A"}</td>
                                          <td>
                                            {station.isDefault ? (
                                              <span
                                                className="badge bg-primary"
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                title="This is the user's default station"
                                              >
                                                Yes
                                              </span>
                                            ) : (
                                              <Button
                                                variant="success"
                                                size="sm"
                                                className="w-12"
                                                style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                                                onClick={() => {
                                                  const stationId = station.station?.id || station.station_id;
                                                  if (stationId && !isNaN(Number(stationId))) {
                                                    makeDefaultSation(Number(stationId));
                                                  } else {
                                                    console.error("Invalid station ID:", { station, stationId });
                                                    alert("Invalid station ID. Please refresh the page and try again.");
                                                  }
                                                }}
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="top"
                                                title="Set this station as the user's default station"
                                              >
                                                Make Default
                                              </Button>
                                            )}
                                          </td>
                                          <td>
                                            {station.status === "active" && (
                                              <Button
                                                variant="danger"
                                                size="sm"
                                                className="w-12"
                                                style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                                                onClick={() =>
                                                  disableUserStation(station.id)
                                                }
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="left"
                                                title="Disable this station assignment for the user"
                                              >
                                                Disable
                                              </Button>
                                            )}
                                          </td>
                                        </tr>
                                      ),
                                  )
                                ) : (
                                  <tr>
                                    <td colSpan={3}>No stations assigned</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </div>
                </div>
              ) : (
                <Card className="mb-0">
                  <Card.Body className="text-center text-muted py-3">
                    <i className="bi bi-person-circle fs-2 d-block mb-1"></i>
                    <p className="mb-0 small">Select a user to view their details</p>
                  </Card.Body>
                </Card>
              )}
            </div>
          </div>
        </div>

        <Modal
          show={showAddToStationModal}
          onHide={() => setShowAddToStationModal(false)}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title className="h6 mb-0">
              <i className="bi bi-person-plus me-2"></i>
              Add User to Station
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Select User</Form.Label>
              <Form.Select
                value={modalSelectedUserId}
                onChange={(e) => handleModalUserChange(e.target.value)}
              >
                <option value="">Choose user</option>
                {users.map((user: User) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group>
              <Form.Label>Select Station</Form.Label>
              <Form.Select
                value={modalSelectedStationId}
                onChange={(e) => setModalSelectedStationId(e.target.value)}
                disabled={!modalSelectedUserId}
              >
                <option value="">Choose station</option>
                {stations
                  .filter((station: any) => {
                    return !modalUserStations.some(
                      (us: any) =>
                        (us.station?.id || us.station_id) === station.id &&
                        us.status === "active"
                    );
                  })
                  .map((station: any) => (
                    <option key={station.id} value={station.id}>
                      {station.name}
                    </option>
                  ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowAddToStationModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddUserToStationFromModal}
              disabled={!modalSelectedUserId || !modalSelectedStationId || isAddingFromModal}
            >
              {isAddingFromModal ? "Adding..." : "Add User to Station"}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </RoleAwareLayout>
  );
}

export default StationUsersPage;

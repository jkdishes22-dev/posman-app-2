"use client";

import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Card, Button, Form } from "react-bootstrap";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import { AuthError, User } from "../../../types/types";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import ErrorDisplay from "../../../components/ErrorDisplay";

function StationUsersPage() {
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
    try {
      const result = await apiCall("/api/users");
      if (result.status === 200) {
        // Ensure data is an array
        const usersArray = Array.isArray(result.data) ? result.data : [];
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

    try {
      const result = await apiCall(`/api/users/${selectedUser.id}/stations`, {
        method: "POST",
        body: JSON.stringify({
          station: selectedStation,
        }),
      });
      if (result.status === 200) {
        fetchUserStations(selectedUser.id);
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to add user to station");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const makeDefaultSation = async (stationId: number) => {
    if (!selectedUser || !stationId) {
      alert("Please select user and station");
      return;
    }
    try {
      const result = await apiCall(`/api/users/${selectedUser.id}/stations`, {
        method: "PATCH",
        body: JSON.stringify({
          stationId: stationId,
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
        headers: {
          "x-action": "disable",
        },
        body: JSON.stringify({
          userStationId: userStationId,
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
      <div className="container my-5">
        <ErrorDisplay
          error={error}
          errorDetails={errorDetails}
          onDismiss={() => {
            setError(null);
            setErrorDetails(null);
          }}
        />
        <div className="row">
          {/* Sidebar: User List */}
          <div className="col-md-4">
            <div className="mb-3">
              {/* Search Input */}
              <input
                type="text"
                className="form-control"
                placeholder="Search Users"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div
              className="list-group"
              style={{ maxHeight: "400px", overflowY: "auto" }} // Make sidebar scrollable
            >
              {filteredUsers.length > 0 ? (
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
          </div>

          {/* Main Content: User Details */}
          <div className="col-md-8">
            {selectedUser ? (
              <div className="row">
                <div className="col-md-4">
                  <Card>
                    <Card.Header>User: {selectedUser.firstName}</Card.Header>
                    <Card.Body>
                      <Card.Text>
                        <strong>First Name:</strong> {selectedUser.firstName}
                        <br />
                        <strong>Last Name:</strong> {selectedUser.lastName}
                        <br />
                        <strong>Role:</strong> {selectedUser?.role?.name}
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </div>
                <div className="col-md-8">
                  <Card>
                    <Card.Header>
                      Add {selectedUser.firstName} to a station
                    </Card.Header>
                    <Card.Body>
                      <Form.Group>
                        <Form.Label>Select Station</Form.Label>
                        <Form.Control
                          as="select"
                          value={selectedStation}
                          onChange={(e) => setSelectedStation(e.target.value)}
                        >
                          <option value="">Select a station</option>
                          {stations.map((station) => (
                            <option key={station.id} value={station.id}>
                              {station.name}
                            </option>
                          ))}
                        </Form.Control>
                      </Form.Group>
                      <Button
                        variant="primary"
                        className="mt-2"
                        onClick={handleAddUserToStation}
                        disabled={!selectedStation}
                      >
                        Add Station
                      </Button>

                      <Card.Text className="mt-3">
                        <strong>Current Stations:</strong>
                        <table className="table table-striped mt-3">
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
                                      <td>{station.name}</td>
                                      <td>
                                        {station.is_default ? (
                                          <span>Yes</span>
                                        ) : (
                                          <Button
                                            variant="success"
                                            className="w-12"
                                            onClick={() =>
                                              makeDefaultSation(
                                                station.station_id,
                                              )
                                            }
                                          >
                                            Make Default{" "}
                                          </Button>
                                        )}
                                      </td>
                                      <td>
                                        {station.status === "active" && (
                                          <Button
                                            variant="danger"
                                            className="w-12"
                                            onClick={() =>
                                              disableUserStation(station.id)
                                            }
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
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </div>
              </div>
            ) : (
              <p>Select a user to view their details.</p>
            )}
          </div>
        </div>
      </div>
    </RoleAwareLayout>
  );
}

export default StationUsersPage;

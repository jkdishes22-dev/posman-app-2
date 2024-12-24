"use client";

import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Card, Button, Form } from "react-bootstrap";
import AdminLayout from "src/app/shared/AdminLayout";
import { User } from "../../../types/types";

function StationUsersPage() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState("");
  const [userStations, setUserStations] = useState([]);

  useEffect(() => {
    fetchUsers();
    fetchStations();
  }, []);

  useEffect(() => {
    setFilteredUsers(
      users.filter((user: User) =>
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchStations = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/stations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch stations");
      const data = await response.json();
      setStations(data);
    } catch (error) {
      console.error("Error fetching stations:", error);
    }
  };

  const fetchUserStations = async (userId: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/users/${userId}/stations`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch user stations");
      const data = await response.json();
      setUserStations(data);
    } catch (error) {
      console.error("Error fetching user stations:", error);
    }
  };

  const handleUserSelect = (userId: number) => {
    const userData = users.find((user: User) => user.id === userId);
    if (userData) {
      setSelectedUser(userData);
      fetchUserStations(userId);
    }
  };

  const handleAddUserToStation = async () => {
    if (!selectedUser || !selectedStation) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/users/${selectedUser.id}/stations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          station: selectedStation,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to add user to station");
      } else {
        fetchUserStations(selectedUser.id);
      }
    } catch (error) {
      console.error("Error adding user to station:", error);
    }
  };

  const makeDefaultSation = async (stationId: number) => {
    if (!selectedUser || !stationId) {
      alert("Please select user and station")
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/users/${selectedUser.id}/stations`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          stationId: stationId
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to update user station");
      } else {
        fetchUserStations(selectedUser.id);
      }
    } catch (error) {
      console.error("Error updating user station:", error);
    }
  };

  const disableUserStation = async (userStationId: number) => {
    if (!selectedUser || !userStationId) {
      alert("Please select user and station")
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/users/${selectedUser.id}/stations`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-action": "disable"
        },
        body: JSON.stringify({
          userStationId: userStationId
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to update user station");
      } else {
        fetchUserStations(selectedUser.id);
      }
    } catch (error) {
      console.error("Error updating user station:", error);
    }
  };



  return (
    <AdminLayout>
      <div className="container my-5">
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
                        <strong>Role:</strong> {selectedUser.role}
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </div>
                <div className="col-md-8">
                  <Card>
                    <Card.Header>Add {selectedUser.firstName} to a station</Card.Header>
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
                              userStations.map((station) => (
                                station && (
                                  <tr key={station.id}>
                                    <td>{station.name}</td>
                                    <td>
                                      {station.is_default ? (
                                        <span>Yes</span>
                                      ) : (
                                        <Button variant="success" className="w-12" onClick={() => makeDefaultSation(station.station_id)}>Make Default </Button>
                                      )}
                                    </td>
                                    <td>
                                      {station.status === "enabled" && (
                                        <Button variant="danger" className="w-12" onClick={() => disableUserStation(station.id)}>Disable</Button>
                                      )}
                                    </td>
                                  </tr>
                                )
                              ))
                            ) : (
                              <tr>
                                <td colSpan="3">No stations assigned</td>
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
    </AdminLayout>
  );
}

export default StationUsersPage;

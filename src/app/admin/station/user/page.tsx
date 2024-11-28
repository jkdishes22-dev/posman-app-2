"use client";

import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  Card,
  Button,
  Form
} from "react-bootstrap";
import AsyncSelect from "react-select/async"; // For typeahead searchable dropdown
import AdminLayout from "src/app/shared/AdminLayout";

function StationUsersPage() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState(""); // State for user search term
  const [stations, setStations] = useState([]); // State for all stations
  const [selectedStation, setSelectedStation] = useState(""); // State for selected station
  const [userStations, setUserStations] = useState([]); // State for user's stations

  useEffect(() => {
    fetchUsers();
    fetchStations(); // Fetch all stations on component mount
  }, []);

  useEffect(() => {
    setFilteredUsers(
      users.filter((user) =>
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
        headers: {
          method: "GET",
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
    const userData = users.find((user) => user.id === userId);
    if (userData) {
      setSelectedUser(userData);
      fetchUserStations(userId);
    }
  };

  const handleAddUserToStation = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/users/${selectedUser.id}/stations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ stationId: selectedStation })
      });
      if (!response.ok) throw new Error("Failed to add user to station");
      fetchUserStations(selectedUser.id); // Refresh the user's stations
    } catch (error) {
      console.error("Error adding user to station:", error);
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
                filteredUsers.map((user) => (
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
                <div className="col-md-6">
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
                <div className="col-md-6">
                  <Card>
                    <Card.Header>Add to Station</Card.Header>
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
                        Add to Station
                      </Button>
                      <Card.Text className="mt-3">
                        <strong>Current Stations:</strong>
                        <ul>
                          {userStations.length > 0 ? (
                            userStations.map((station) => (
                              <li key={station.id}>{station.name}</li>
                            ))
                          ) : (
                            <li>No stations assigned</li>
                          )}
                        </ul>
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

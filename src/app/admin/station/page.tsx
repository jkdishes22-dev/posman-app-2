'use client';
import React, { useState, useEffect } from 'react';
import AdminLayout from 'src/app/shared/AdminLayout';
import StationNew from './station-new';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Button } from 'react-bootstrap';
import { stat } from 'fs';

export default function StationPage() {
  const [stations, setStations] = useState([]);
  const [pricelists, setPricelists] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      try {
        const responseStations = await fetch('/api/station', {
          method: 'GET',
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
        });
        const dataStations = await responseStations.json();
        setStations(responseStations.ok ? dataStations : []);
      } catch (error) {
        console.error('Failed to fetch stations', error);
        setStations([]);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (selectedStationId) {
      fetchStationDetails(selectedStationId);
    }
  }, [selectedStationId]);

  const fetchStationDetails = async (stationId) => {
    const token = localStorage.getItem("token");
    try {
      const responsePricelists = await fetch(`/api/station/${stationId}/pricelists`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const dataPricelists = await responsePricelists.json();
      setPricelists(responsePricelists.ok ? dataPricelists : []);

      const responseUsers = await fetch(`/api/station/${stationId}/users`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const dataUsers = await responseUsers.json();
      setUsers(responseUsers.ok ? dataUsers : []);
    } catch (error) {
      console.error('Failed to fetch station details', error);
      setPricelists([]);
      setUsers([]);
    }
  };

  const handleAddStation = async (name) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/station', {
        method: 'POST',
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
    } catch (error) {
      console.error("Failed to add station", error);
    }
  };

  return (
    <AdminLayout>
      <div className="container">
        <div className="row">
          <div className="col-md-4">
            <Button variant="primary" onClick={() => setShowModal(true)}>Add Station</Button>
            <StationNew
              show={showModal}
              handleClose={() => setShowModal(false)}
              handleAddStation={handleAddStation}
            />
            <table className="table table-striped mt-3">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stations.map(station => (
                  <tr key={station.id} onClick={() => setSelectedStationId(station.id)}>
                    <td>{station.id}</td>
                    <td>{station.name}</td>
                    <td>
                      {(!(station.status) || station.status === "disabled")
                        &&
                        <Button variant="success">Enable</Button>
                      }
                      {station.status === "enabled"
                        &&
                        <Button variant="danger" className='w-12'>Disable</Button>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="col-md-8">
            <div className="row">
              <div className="col-md-6">
                <h3>Linked Pricelists</h3>
                <ul className="list-group">
                  {pricelists.map(pricelist => (
                    <li key={pricelist.id} className="list-group-item">
                      {pricelist.name}
                      <Button variant="danger" className="btn-sm ml-2" style={{ padding: '0.25rem 0.5rem', width: '4rem' }}>Disable</Button>
                      <Button variant="success" className="btn-sm ml-2" style={{ padding: '0.25rem 0.5rem', width: '4rem' }}>Enable</Button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="col-md-6">
                <h3>Linked Users</h3>
                <ul className="list-group">
                  {users.map(user => (
                    <li key={user.id} className="list-group-item">
                      {user.firstName} {user.lastName}
                      <Button variant="danger" className="btn-sm ml-2" style={{ padding: '0.25rem 0.5rem', width: '4rem' }}>Disable</Button>
                      <Button variant="success" className="btn-sm ml-2" style={{ padding: '0.25rem 0.5rem', width: '4rem' }}>Enable</Button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";

interface StationNewProps {
  show: boolean;
  handleClose: () => void;
  handleAddStation: (name: string, description: string) => void;
}

const StationNew: React.FC<StationNewProps> = ({
  show,
  handleClose,
  handleAddStation,
}) => {
  const [newStationName, setNewStationName] = useState("");
  const [newStationDescription, setNewStationDescription] = useState("");

  // Reset form when modal closes
  useEffect(() => {
    if (!show) {
      setNewStationName("");
      setNewStationDescription("");
    }
  }, [show]);

  const handleSave = () => {
    if (!newStationName.trim()) {
      return;
    }
    handleAddStation(newStationName, newStationDescription);
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Add New Station</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group controlId="stationName" className="mb-3">
            <Form.Label>Station Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter station name"
              value={newStationName}
              onChange={(e) => setNewStationName(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group controlId="stationDescription">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Enter station description (optional)"
              value={newStationDescription}
              onChange={(e) => setNewStationDescription(e.target.value)}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          <i className="bi bi-plus-circle me-1"></i>
          Add Station
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default StationNew;

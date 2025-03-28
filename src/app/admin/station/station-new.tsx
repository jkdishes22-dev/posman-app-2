import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";

interface StationNewProps {
  show: boolean;
  handleClose: () => void;
  handleAddStation: (name: string) => void;
}

const StationNew: React.FC<StationNewProps> = ({
  show,
  handleClose,
  handleAddStation,
}) => {
  const [newStationName, setNewStationName] = useState("");

  const handleSave = () => {
    handleAddStation(newStationName);
    setNewStationName("");
    handleClose();
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Add New Station</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group controlId="stationName">
            <Form.Label>Station Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter station name"
              value={newStationName}
              onChange={(e) => setNewStationName(e.target.value)}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save Changes
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default StationNew;

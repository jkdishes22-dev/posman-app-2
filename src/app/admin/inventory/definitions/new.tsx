import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

function AddSubItemModal({ isModalOpen, closeModal, addSubItemToItem }) {
  const [subItemId, setSubItemId] = useState('');
  const [subItemName, setSubItemName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addSubItemToItem(subItemId, subItemName);
  };

  return (
    <Modal show={isModalOpen} onHide={closeModal}>
      <Modal.Header closeButton>
        <Modal.Title>Add Sub-Item</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="formSubItemId">
            <Form.Label>Sub-Item ID</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter Sub-Item ID"
              value={subItemId}
              onChange={(e) => setSubItemId(e.target.value)}
            />
          </Form.Group>
          <Form.Group controlId="formSubItemName">
            <Form.Label>Sub-Item Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter Sub-Item Name"
              value={subItemName}
              onChange={(e) => setSubItemName(e.target.value)}
            />
          </Form.Group>
          <Button variant="primary" type="submit">
            Add Sub-Item
          </Button>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={closeModal}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default AddSubItemModal;

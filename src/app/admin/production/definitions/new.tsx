import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

function AddSubItemModal({ isModalOpen, closeModal, addSubItemToItem }) {
  const [items, setItems] = useState([]);
  const [subItemId, setSubItemId] = useState('');
  const [deductiblePortion, setDeductiblePortion] = useState('');

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch('/api/items');
        const data = await response.json();
        setItems(data);
      } catch (error) {
        console.error('Error fetching items:', error);
      }
    };

    fetchItems();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addSubItemToItem(subItemId, deductiblePortion);
  };

  return (
    <Modal show={isModalOpen} onHide={closeModal}>
      <Modal.Header closeButton>
        <Modal.Title>Add Related Item</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="formSubItemId">
            <Form.Label>Sub-Item Name</Form.Label>
            <Form.Control
              as="select"
              value={subItemId}
              onChange={(e) => setSubItemId(e.target.value)}
            >
              <option value="">Select Sub-Item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Form.Control>
          </Form.Group>

          <Form.Group controlId="formDeductiblePortion">
            <Form.Label>Portion Deductible</Form.Label>
            <Form.Control
              type="text"
              placeholder="Portion"
              value={deductiblePortion}
              onChange={(e) => setDeductiblePortion(e.target.value)}
            />
          </Form.Group>
          <Button variant="primary" type="submit">
            Add Related Item
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

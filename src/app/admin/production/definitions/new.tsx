import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { useApiCall } from "src/app/utils/apiUtils";

function AddSubItemModal({ isModalOpen, closeModal, addSubItemToItem, addSubItemError, setAddSubItemError }) {
  const apiCall = useApiCall();
  const [items, setItems] = useState([]);
  const [subItemId, setSubItemId] = useState("");
  const [deductiblePortion, setDeductiblePortion] = useState("");

  useEffect(() => {
    const fetchItems = async () => {
      const result = await apiCall("/api/items");
      
      if (result.status === 200) {
        // Ensure data is an array before setting it
        setItems(Array.isArray(result.data) ? result.data : []);
      } else {
        console.error("Error fetching items:", result.error);
        setItems([]); // Set empty array on error
      }
    };

    fetchItems();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subItemId || !deductiblePortion) {
      setAddSubItemError("Please fill in all fields");
      return;
    }
    await addSubItemToItem(subItemId, deductiblePortion);
  };

  return (
    <Modal show={isModalOpen} onHide={closeModal}>
      <Modal.Header closeButton>
        <Modal.Title>Add Related Item</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {addSubItemError && (
          <div className="alert alert-danger" role="alert">
            {addSubItemError}
          </div>
        )}
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

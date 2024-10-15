// components/EditItemModal.tsx
import React from "react";
import {
  Modal,
  Button,
  ModalHeader,
  ModalTitle,
  ModalBody, ModalFooter
} from "react-bootstrap";
import { Item } from "../../types";

interface EditItemModalProps {
  show: boolean;
  item: Item | null;
  onClose: () => void;
  onSave: (item: Item) => void; // Callback to save the edited item
}

const EditItemModal: React.FC<EditItemModalProps> = ({
  show,
  item,
  onClose,
  onSave,
}) => {
  const [editedItem, setEditedItem] = React.useState<Item | null>(item);

  React.useEffect(() => {
    setEditedItem(item); // Update edited item when modal opens
  }, [item]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editedItem) {
      setEditedItem({
        ...editedItem,
        [e.target.name]: e.target.value,
      });
    }
  };

  const handleSave = () => {
    if (editedItem) {
      onSave(editedItem); // Call save function with edited item
      onClose(); // Close modal
    }
  };

  return (
    <Modal show={show} onHide={onClose}>
      <ModalHeader closeButton>
        <ModalTitle>Edit Item</ModalTitle>
      </ModalHeader>
      <ModalBody>
        {editedItem && (
          <>
            <div className="mb-3">
              <label className="form-label">Item Name</label>
              <input
                type="text"
                className="form-control"
                name="name"
                value={editedItem.name}
                onChange={handleChange}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Item Code</label>
              <input
                type="text"
                className="form-control"
                name="code"
                value={editedItem.code}
                onChange={handleChange}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Item Price</label>
              <input
                type="number"
                className="form-control"
                name="price"
                value={editedItem.price}
                onChange={handleChange}
              />
            </div>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save Changes
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default EditItemModal;

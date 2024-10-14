import React, { useState, useEffect } from "react";
import Image from "next/image";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

interface Category {
  id: string;
  name: string;
}

interface ItemType {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  code: string;
  price: number;
  category: Category;
  itemType: ItemType;
  defaultUnitId?: number;
  isGroup?: boolean;
}

interface ItemsTableProps {
  selectedCategory: Category | null;
  items: Item[];
  itemError: string;
  fetchItems: (categoryId: string) => void;
}

const CategoryItems: React.FC<ItemsTableProps> = ({
  selectedCategory,
  items,
  itemError,
  fetchItems,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [itemPrice, setItemPrice] = useState<number | "">("");
  const [itemType, setItemType] = useState<string>("");
  const [defaultUnitId, setDefaultUnitId] = useState<number | "">("");
  const [isGroup, setIsGroup] = useState(false);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [addItemError, setAddItemError] = useState("");

  const handleAddItemClick = () => {
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !itemName ||
      !itemCode ||
      !itemPrice ||
      !itemType ||
      !selectedCategory
    ) {
      setAddItemError("Please fill in all fields");
      return;
    }

    const itemData = {
      name: itemName,
      code: itemCode,
      price: itemPrice,
      category: selectedCategory.id,
      itemType: itemType,
      defaultUnitId,
      isGroup,
    };

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/menu/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(itemData),
      });

      if (response.status === 201) {
        if (selectedCategory?.id) fetchItems(selectedCategory.id);
        setShowModal(false);
        setItemName("");
        setItemCode("");
        setItemPrice("");
        setItemType("");
        setDefaultUnitId("");
        setIsGroup(false);
        setAddItemError("");
      } else {
        setAddItemError("Failed to create item");
      }
    } catch (e) {
      setAddItemError("Failed to create item: " + e.message);
    }
  };

  useEffect(() => {
    const fetchItemTypes = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/menu/items/types", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setItemTypes(data);
        } else {
          setAddItemError("Failed to fetch item types");
        }
      } catch (e) {
        setAddItemError("Failed to fetch item types: " + e.message);
      }
    };
    fetchItemTypes();
  }, []);

  return (
    <div className="col mt-2">
      <div className="p-3 border bg-light">
        <div className="row">
          <div className="col-10">
            {selectedCategory
              ? `${selectedCategory.name} Items`
              : "Category items section"}
          </div>
          <div
            className="col border bg-primary-subtle border-1 border-primary-subtle w-25"
            onClick={handleAddItemClick}
          >
            <Image
              src="/icons/plus-circle.svg"
              alt="Add Item"
              width={24}
              height={24}
              className="m-2"
            />{" "}
            Add item
          </div>
        </div>
        {itemError && <p style={{ color: "red" }}>{itemError}</p>}
        <table className="table mt-3 stripped">
          <thead>
            <tr>
              <th scope="col">Item name</th>
              <th>Item code</th>
              <th>Category</th>
              <th>Item Type</th>
              <th>Item price</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.code}</td>
                <td>{item.category.name}</td>
                <td>{item.itemType.name}</td>
                <td>{item.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for adding items */}
      <Modal show={showModal} onHide={handleModalClose}>
        <Modal.Header closeButton>
          <Modal.Title>Add Item</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {addItemError && <p style={{ color: "red" }}>{addItemError}</p>}
          <form onSubmit={handleItemSubmit} className="row g-3">
            <div className="form-group">
              <label>Item Name</label>
              <input
                type="text"
                className="form-control"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Item Code</label>
              <input
                type="text"
                className="form-control"
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Item Price</label>
              <input
                type="number"
                className="form-control"
                value={itemPrice}
                onChange={(e) => setItemPrice(parseFloat(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Item Type</label>
              <select
                className="form-control"
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
              >
                <option value="">Select Item Type</option>
                {itemTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Default Unit ID</label>
              <input
                type="number"
                className="form-control"
                value={defaultUnitId}
                onChange={(e) => setDefaultUnitId(parseInt(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Is Group</label>
              <input
                type="checkbox"
                checked={isGroup}
                onChange={(e) => setIsGroup(e.target.checked)}
              />
            </div>

            <Modal.Footer>
              <Button variant="secondary" onClick={handleModalClose}>
                Close
              </Button>
              <Button variant="primary" type="submit">
                Save
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default CategoryItems;

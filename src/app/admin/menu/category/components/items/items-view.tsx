import React, { useState } from "react";
import Image from "next/image";
import { Category, Item } from "../../types";
import EditItemModal from "./item-edit";
import ItemDeleteModal from "./item-delete";

interface ViewItemsProps {
  selectedCategory: Category | null;
  items: Item[];
  itemError: string;
  handleAddItemClick: () => void;
  handleDeleteItem: (itemId: string) => void; // Add delete handler
}

const ViewItems: React.FC<ViewItemsProps> = ({
  selectedCategory,
  items,
  itemError,
  handleAddItemClick,
  handleDeleteItem,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleEditItem = (item: Item) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleDeleteItemClick = (item: Item) => {
    setItemToDelete(item); // Set the item to delete
    setShowDeleteModal(true); // Show the delete modal
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      handleDeleteItem(itemToDelete.id); // Call the delete handler
      setShowDeleteModal(false); // Close the modal after delete
    }
  };

  return (
    <div className="col mt-2">
      <div className="p-3 border bg-light">
        <div className="row mb-3">
          <div className="col-2">
            {selectedCategory
              ? `${selectedCategory.name} Items`
              : "Category items section"}
          </div>
          <div className="col-8">
            <div className="row mb-3">
              <div className="col-12">
                <input
                  type="text"
                  className="form-control input-group-lg"
                  placeholder="Search items by name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div
            className="col border bg-primary-subtle border-1 border-primary-subtle w-25 h-25"
            onClick={handleAddItemClick}
          >
            <Image
              src="/icons/plus-circle.svg"
              alt="Add Item"
              width={24}
              height={24}
              className="m-2"
            />
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.code}</td>
                  <td>{item.category.name}</td>
                  <td>{item.itemType.name}</td>
                  <td>{item.price}</td>
                  <td>
                    <Image
                      src="/icons/pencil.svg"
                      alt="Edit Item"
                      width={24}
                      height={24}
                      className="m-2"
                      onClick={() => handleEditItem(item)}
                      style={{ cursor: "pointer" }}
                    />
                    <Image
                      src="/icons/x-circle.svg"
                      alt="Delete Item"
                      width={24}
                      height={24}
                      className="m-2"
                      onClick={() => handleDeleteItemClick(item)}
                      style={{ cursor: "pointer" }}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center">
                  No items found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <EditItemModal
        show={showEditModal}
        item={selectedItem}
        onClose={() => setShowEditModal(false)}
        onSave={(editedItem) => {
          console.log("Saved item:", editedItem);
        }}
      />

      {/* Render Delete Item Modal */}
      {itemToDelete && (
        <ItemDeleteModal
          show={showDeleteModal}
          itemName={itemToDelete.name}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
};

export default ViewItems;

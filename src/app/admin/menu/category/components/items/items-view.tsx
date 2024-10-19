import React, { useState } from "react";
import Image from "next/image";
import EditItemModal from "./item-edit";
import ItemDeleteModal from "./item-delete";
import { Category, Item } from "../../types";
import SecureRoute from "../../../../../components/SecureRoute";

interface ViewItemsProps {
  selectedCategory: Category | null;
  items: Item[];
  itemError: string;
  handleAddItemClick?: () => void; // Made optional
  handleDeleteItem?: (itemId: string) => void; // Made optional
  itemTypes: { id: string; name: string }[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
}

const ViewItems: React.FC<ViewItemsProps> = ({
  selectedCategory,
  items = [],
  itemError,
  handleAddItemClick,
  handleDeleteItem,
  itemTypes,
  setItems,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  const filteredItems = searchTerm
    ? items.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : items;

  const handleEditItem = (item: Item) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleDeleteItemClick = (item: Item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (itemToDelete && handleDeleteItem) {
      handleDeleteItem(itemToDelete.id);
      setShowDeleteModal(false);
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

          {handleAddItemClick && ( // Conditional rendering for Add Item button
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
          )}
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
              <th></th> {/* Empty header for action buttons */}
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
                    {handleDeleteItem &&
                      handleEditItem && ( // Conditional rendering for Edit/Delete icons
                        <SecureRoute roleRequired="admin">
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
                        </SecureRoute>
                      )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center">
                  No items found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit and Delete modals wrapped in SecureRoute */}
      {showEditModal && (
        <EditItemModal
          show={showEditModal}
          item={selectedItem}
          itemTypes={itemTypes}
          onClose={() => setShowEditModal(false)}
          onSave={(editedItem) => {
            setItems((prevItems) =>
              prevItems.map((item) =>
                item.id === editedItem.id ? editedItem : item,
              ),
            );
          }}
        />
      )}
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

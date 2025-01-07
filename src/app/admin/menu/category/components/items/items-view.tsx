import React, { useState } from "react";
import Image from "next/image";
import EditItemModal from "./item-edit";
import ItemDeleteModal from "./item-delete";
import { Category, Item } from "../../../../../types/types";

interface ViewItemsProps {
  selectedCategory: Category | null;
  items: Item[];
  pricelistItems?: Item[]; // Optional prop for pricelist items
  itemError: string;
  handleAddItemClick?: () => void; // Optional
  handleDeleteItem?: (itemId: string) => void; // Optional
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  isBillingSection?: boolean;
  isPricelistSection?: boolean;
  isCategoryItemsSection?: boolean;
  onItemPick: (item: Item) => void;
}

const ViewItems: React.FC<ViewItemsProps> = ({
  selectedCategory,
  items = [],
  pricelistItems, // Include optional prop
  itemError,
  handleAddItemClick,
  handleDeleteItem,
  setItems,
  isBillingSection = false,
  onItemPick,
  isPricelistSection = false,
  isCategoryItemsSection = false,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  const filteredItems = searchTerm
    ? (pricelistItems || items).filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : pricelistItems || items;

  const handleEditItem = (item: Item) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleDeleteItemClick = (item: Item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      handleDeleteItem?.(itemToDelete.id);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="col mt-2">
      <div className="p-3 border bg-light">
        <div className="row mb-3">
          <div className="col-4">
            {selectedCategory
              ? `${selectedCategory.name}`
              : { isPricelistSection }
                ? "Pricelist items"
                : "Items"}
          </div>
          <div className="col-6"> filter items here</div>
          {!isBillingSection && selectedCategory && (
            <div
              className="col-2 border bg-primary-subtle border-1 border-primary-subtle align-items-center justify-content-end"
              onClick={handleAddItemClick}
            >
              <Image
                src="/icons/plus-circle.svg"
                alt="Add Item"
                width={24}
                height={24}
                className="m-2 cursor-pointer"
              />
              Add item
            </div>
          )}
        </div>
        {itemError && <p style={{ color: "red" }}>{itemError}</p>}
        <table className="table table-sm mt-3 table-striped">
          <thead>
            <tr>
              <th scope="col">Item name</th>
              {!isBillingSection && (
                <>
                  <th>Item code</th>
                  <th>Category</th>
                </>
              )}
              <th>Pricelist</th>
              <th>Item price</th>
              {!isBillingSection && <th></th>}
            </tr>
          </thead>
          <tbody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  {!isBillingSection && (
                    <>
                      <td>{item.code}</td>
                      <td>{item.category.name}</td>
                      <td>{item.pricelistName}</td>
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
                    </>
                  )}
                  {isBillingSection && (
                    <>
                      <td>{item.pricelistName}</td>
                      {!isCategoryItemsSection && <td>{item.price}</td>}
                      {isBillingSection && (
                        <td>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => {
                              if (item.price > 0) {
                                onItemPick(item);
                              } else {
                                alert("Price must be greater than zero");
                              }
                            }}
                          >
                            Pick
                          </button>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isBillingSection ? 1 : 6} className="text-center">
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
          setItems((prevItems) =>
            prevItems.map((item) =>
              item.id === editedItem.id ? editedItem : item,
            ),
          );
        }}
      />
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

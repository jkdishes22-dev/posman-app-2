import React, { useState } from "react";
import ViewItems from "../items/items-view";
import NewItemModal from "../items/items-new";
import { Category, Item } from "../../types";

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

  const handleAddItemClick = () => {
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  return (
    <>
      <ViewItems
        selectedCategory={selectedCategory}
        items={items}
        itemError={itemError}
        handleAddItemClick={handleAddItemClick}
      />
      <NewItemModal
        selectedCategory={selectedCategory}
        showModal={showModal}
        handleModalClose={handleModalClose}
        fetchItems={fetchItems}
      />
    </>
  );
};

export default CategoryItems;

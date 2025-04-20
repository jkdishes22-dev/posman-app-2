import React, { useState, useEffect } from "react";
import ViewItems from "../items/items-view";
import NewItemModal from "../items/items-new";
import { Category, Item } from "../../../../../types/types";

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
  const [localItems, setLocalItems] = useState<Item[]>([]); // Local state for items

  // Sync localItems with items prop
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleAddItemClick = () => {
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleDeleteItem = (itemId: number) => {
    if (selectedCategory) {
      fetchItems(selectedCategory.id);
    }
  };

  return (
    <>
      <ViewItems
        selectedCategory={selectedCategory}
        items={localItems} // Pass the local items state
        itemError={itemError}
        handleAddItemClick={handleAddItemClick}
        handleDeleteItem={handleDeleteItem}
        setItems={setLocalItems}
        isBillingSection={false}
        isPricelistSection={false}
        isCategoryItemsSection={true}
        onItemPick={() => { }}
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

import React, { useState } from "react";
import Image from "next/image";
import CategoryDeleteModal from "./category-delete";

interface Category {
  id: string;
  name: string;
}

interface CategoriesProps {
  categories: Category[];
  onCategoryClick: (category: Category) => void;
  fetchError: string;
  onDeleteCategory: (categoryId: string) => void;
}

const Categories: React.FC<CategoriesProps> = ({
  categories,
  onCategoryClick,
  fetchError,
  onDeleteCategory,
}) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string>("");
  const [categoryNameToDelete, setCategoryNameToDelete] = useState<string>("");
  const [collapsed, setCollapsed] = useState<boolean>(false); // New state for collapsing

  const handleShow = (categoryId: string, categoryName: string) => {
    setCategoryToDelete(categoryId);
    setCategoryNameToDelete(categoryName);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setCategoryToDelete("");
    setCategoryNameToDelete("");
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      onDeleteCategory(categoryToDelete);
      handleClose();
    }
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div>
      <div className="p-2 border bg-light">
        {fetchError && <p style={{ color: "red" }}>{fetchError}</p>}

        {/* Collapse/Expand Button */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5>Categories</h5>
          <button className="btn btn-outline-primary" onClick={toggleCollapse}>
            {collapsed ? "Show More" : "Show Less"}
          </button>
        </div>

        {/* Conditionally render categories based on collapsed state */}
        {!collapsed && (
          <div className="row">
            {categories.map((category) => (
              <div
                key={category.id}
                className="col-sm-3 mb-1"
                onClick={() => onCategoryClick(category)}
                style={{ cursor: "pointer" }}
              >
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start border-bottom border-light pb-1">
                      <div className="col-auto">
                        {/* Empty space to maintain alignment */}
                      </div>
                      <div className="col-auto">
                        <Image
                          src="/icons/x-circle.svg"
                          alt="Delete Item"
                          width={24}
                          height={24}
                          className="m-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShow(category.id, category.name);
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-center pt-2">
                      <h5 className="card-title">{category.name}</h5>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Category Delete Modal */}
        <CategoryDeleteModal
          show={showModal}
          categoryName={categoryNameToDelete}
          onConfirm={confirmDelete}
          onCancel={handleClose}
        />
      </div>
    </div>
  );
};

export default Categories;

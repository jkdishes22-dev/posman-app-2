import React, { useState } from "react";
import Image from "next/image";

interface Category {
  id: string;
  name: string;
  status?: string;
}

interface CategoriesProps {
  categories: Category[];
  onCategoryClick: (category: Category) => void;
  fetchError: string;
  onDeleteCategory?: (category: { id: string; name: string }) => void;
}

const Categories: React.FC<CategoriesProps> = ({
  categories,
  onCategoryClick,
  fetchError,
  onDeleteCategory,
}) => {
  const [showAll, setShowAll] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const toggleShowMore = () => {
    if (showAll) {
      setVisibleCount(8);
    } else {
      setVisibleCount(categories.length);
    }
    setShowAll(!showAll);
  };

  const filteredCategories = categories.filter((category) => {
    if (statusFilter === "all") return true;
    return category.status === statusFilter;
  });

  return (
    <div>
      <div className="p-2 border bg-light">
        {fetchError && <p style={{ color: "red" }}>{fetchError}</p>}

        <div className="row mb-3">
          <div className="col-4">
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Show All</option>
              <option value="active">Show Active</option>
              <option value="deleted">Show Deleted</option>
            </select>
          </div>
          <div className="col">
            {filteredCategories.length > 8 && (
              <div className="d-flex justify-content-end">
                <button className="btn btn-primary" onClick={toggleShowMore}>
                  {showAll ? "Show Less" : "Show More"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="row">
          {filteredCategories.slice(0, visibleCount).map((category) => (
            <div
              key={category.id}
              className="col-sm-3 mb-1"
              onClick={() => onCategoryClick(category)}
              style={{ cursor: "pointer" }}
            >
              <div className="card">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start border-bottom border-light pb-1">
                    <div className="col-auto"></div>
                    <div className="col-auto">
                      {onDeleteCategory && ( // Check if onDeleteCategory is defined
                        <Image
                          src="/icons/x-circle.svg"
                          alt="Delete Item"
                          width={24}
                          height={24}
                          className="m-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDeleteCategory) {
                              onDeleteCategory(category);
                            } // Call delete only if the function exists
                          }}
                        />
                      )}
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
      </div>
    </div>
  );
};

export default Categories;

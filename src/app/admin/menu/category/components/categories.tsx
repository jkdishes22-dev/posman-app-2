import React from "react";

interface Category {
  id: string;
  name: string;
}

interface CategoriesProps {
  categories: Category[];
  onCategoryClick: (category: Category) => void;
  fetchError: string;
}

const Categories: React.FC<CategoriesProps> = ({
  categories,
  onCategoryClick,
  fetchError,
}) => {
  return (
    <div>
      <div className="p-2 border bg-light">
        {fetchError && <p style={{ color: "red" }}>{fetchError}</p>}
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
                  <h5 className="card-title">{category.name}</h5>
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

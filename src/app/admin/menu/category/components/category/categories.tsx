import React, { useState, useMemo, useRef } from "react";
import { useTooltips } from "../../../../../hooks/useTooltips";

interface Category {
  id: string;
  name: string;
  code?: string;
  status?: string;
}

interface CategoriesProps {
  categories: Category[];
  onCategoryClick?: (category: Category) => void;
  fetchError?: string;
  onDeleteCategory?: (category: { id: string; name: string }) => void;
  showHeader?: boolean;
  loading?: boolean;
  onAddCategory?: () => void;
  error?: string;
  onErrorDismiss?: () => void;
  billingMode?: boolean;
  /** The currently selected category id — used to highlight the active pill in billing mode. */
  selectedCategoryId?: string | null;
}

const CategoriesComponent = ({
  categories,
  onCategoryClick,
  fetchError,
  onDeleteCategory,
  showHeader = true,
  loading = false,
  onAddCategory,
  error,
  onErrorDismiss,
  billingMode = false,
  selectedCategoryId = null,
}: CategoriesProps) => {
  useTooltips();
  const [showAll, setShowAll] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  /** Ref for the horizontally-scrollable strip (billing mode only). */
  const stripRef = useRef<HTMLDivElement>(null);

  const toggleShowMore = () => {
    if (showAll) {
      setVisibleCount(8);
    } else {
      setVisibleCount(Array.isArray(categories) ? categories.length : 0);
    }
    setShowAll(!showAll);
  };

  // Ensure categories is always an array
  const safeCategories = Array.isArray(categories) ? categories : [];

  // Memoized filtered categories to prevent recalculation on every render
  const filteredCategories = useMemo(() => {
    return safeCategories.filter((category) => {
      if (statusFilter === "all") return true;
      return category.status === statusFilter;
    });
  }, [safeCategories, statusFilter]);

  /** Scroll the categories strip 220px to the left. */
  const scrollStripLeft = () => {
    stripRef.current?.scrollBy({ left: -220, behavior: "smooth" });
  };

  /** Scroll the categories strip 220px to the right. */
  const scrollStripRight = () => {
    stripRef.current?.scrollBy({ left: 220, behavior: "smooth" });
  };

  /* ── Billing mode: horizontal scroll strip ─────────────────────────── */
  if (billingMode) {
    return (
      <div>
        {fetchError && <p style={{ color: "red", margin: 0 }}>{fetchError}</p>}
        <div className="d-flex align-items-center gap-1">
          {/* Left arrow */}
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary flex-shrink-0 px-2"
            style={{ height: 36, width: 32 }}
            onClick={scrollStripLeft}
            aria-label="Scroll categories left"
            title="Scroll left"
          >
            <i className="bi bi-chevron-left"></i>
          </button>

          {/* Scrollable pill strip */}
          <div
            ref={stripRef}
            className="d-flex gap-2"
            style={{ flex: 1, overflowX: "hidden", scrollBehavior: "smooth" }}
          >
            {filteredCategories.length === 0 ? (
              <span className="text-muted small fst-italic py-1">No categories</span>
            ) : (
              filteredCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`btn btn-sm flex-shrink-0 ${
                    selectedCategoryId === category.id
                      ? "btn-primary"
                      : "btn-outline-secondary"
                  }`}
                  style={{ whiteSpace: "nowrap" }}
                  onClick={() => onCategoryClick?.(category)}
                >
                  {category.name}
                  {category.code && (
                    <span
                      className={`ms-1 badge ${
                        selectedCategoryId === category.id
                          ? "bg-primary-subtle text-primary"
                          : "bg-secondary-subtle text-secondary"
                      }`}
                      style={{ fontSize: "0.65rem" }}
                    >
                      {category.code}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Right arrow */}
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary flex-shrink-0 px-2"
            style={{ height: 36, width: 32 }}
            onClick={scrollStripRight}
            aria-label="Scroll categories right"
            title="Scroll right"
          >
            <i className="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    );
  }

  /* ── Default mode: original grid layout ────────────────────────────── */
  return (
    <div>
      <div className="p-2 border bg-light">
        {fetchError && <p style={{ color: "red" }}>{fetchError}</p>}

        {showHeader && (
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
        )}

        <div className="row">
          {filteredCategories.slice(0, visibleCount).map((category) => (
            <div
              key={category.id}
              className="col-sm-3 mb-1"
              onClick={() => onCategoryClick(category)}
              style={{ cursor: "pointer" }}
            >
              <div className={`card ${billingMode ? "pos-category-card" : ""}`}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start border-bottom border-light pb-1">
                    <div className="col-auto"></div>
                    <div className="col-auto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {onDeleteCategory && (
                        <img
                          src="/icons/x-circle.svg"
                          alt="Delete"
                          width={24}
                          height={24}
                          className="m-1"
                          style={{ cursor: "pointer" }}
                          title="Delete this category"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDeleteCategory) {
                              onDeleteCategory(category);
                            }
                          }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="text-center pt-2">
                    <h5 className="card-title mb-1">
                      {category.name}
                    </h5>
                    {category.code && (
                      <span className="badge bg-secondary small">{category.code}</span>
                    )}
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

const Categories = React.memo(CategoriesComponent);
Categories.displayName = "Categories";

export default Categories;

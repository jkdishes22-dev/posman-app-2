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
  /** Whether the category grid is expanded (billing mode only). */
  expanded?: boolean;
  /** Called when the expand/collapse grid button is clicked. */
  onToggleExpand?: () => void;
  /** Called when the "All" pill is clicked (billing mode only). */
  onAllClick?: () => void;
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
  expanded = false,
  onToggleExpand,
  onAllClick,
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

  /* ── Billing mode: prominent strip + expandable grid ───────────────── */
  if (billingMode) {
    const allActive = selectedCategoryId === null;

    return (
      <div>
        {fetchError && <p style={{ color: "red", margin: 0 }}>{fetchError}</p>}

        {/* Strip row */}
        <div className="d-flex align-items-center gap-1">
          {/* Left arrow */}
          <button
            type="button"
            className="btn btn-outline-secondary flex-shrink-0 px-2"
            style={{ height: 44, width: 36 }}
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
            {/* "All" pill — always first */}
            <button
              type="button"
              className={`btn flex-shrink-0 fw-semibold ${allActive ? "btn-primary" : "btn-outline-secondary"}`}
              style={{ whiteSpace: "nowrap", minHeight: 44 }}
              onClick={() => onAllClick?.()}
            >
              <i className="bi bi-grid-3x3-gap me-1"></i>
              All
            </button>

            {filteredCategories.length === 0 ? (
              <span className="text-muted fst-italic py-2 align-self-center">No categories</span>
            ) : (
              filteredCategories.map((category) => {
                const isActive = selectedCategoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    className={`btn flex-shrink-0 fw-semibold ${isActive ? "btn-primary" : "btn-outline-secondary"}`}
                    style={{ whiteSpace: "nowrap", minHeight: 44 }}
                    onClick={() => onCategoryClick?.(category)}
                  >
                    {category.name}
                    {category.code && (
                      <span
                        className={`ms-2 badge ${isActive ? "bg-white text-primary" : "bg-secondary-subtle text-secondary"}`}
                        style={{ fontSize: "0.7rem" }}
                      >
                        {category.code}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Right arrow */}
          <button
            type="button"
            className="btn btn-outline-secondary flex-shrink-0 px-2"
            style={{ height: 44, width: 36 }}
            onClick={scrollStripRight}
            aria-label="Scroll categories right"
            title="Scroll right"
          >
            <i className="bi bi-chevron-right"></i>
          </button>

          {/* Expand/collapse grid toggle */}
          <button
            type="button"
            className={`btn flex-shrink-0 px-2 ${expanded ? "btn-primary" : "btn-outline-secondary"}`}
            style={{ height: 44, width: 44 }}
            onClick={() => onToggleExpand?.()}
            aria-label={expanded ? "Collapse category grid" : "Expand category grid"}
            title={expanded ? "Collapse grid" : "Show all categories"}
          >
            <i className={`bi ${expanded ? "bi-grid-fill" : "bi-grid"}`}></i>
          </button>
        </div>

        {/* Expandable category grid */}
        {expanded && (
          <div
            className="row row-cols-2 row-cols-sm-3 row-cols-md-4 g-2 mt-1"
            style={{ maxHeight: 220, overflowY: "auto" }}
          >
            {filteredCategories.map((category) => {
              const isActive = selectedCategoryId === category.id;
              return (
                <div key={category.id} className="col">
                  <div
                    className={`card h-100 text-center border-2 ${isActive ? "border-primary" : "border-light"}`}
                    style={{
                      cursor: "pointer",
                      backgroundColor: isActive ? "var(--md-primary)" : undefined,
                      color: isActive ? "#fff" : undefined,
                      transition: "box-shadow 0.15s",
                    }}
                    onClick={() => { onCategoryClick?.(category); onToggleExpand?.(); }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ""; }}
                  >
                    <div className="card-body py-2 px-1">
                      <i className="bi bi-tag d-block mb-1" style={{ fontSize: "1.4rem" }}></i>
                      <div className="fw-semibold small">{category.name}</div>
                      {category.code && (
                        <span
                          className={`badge mt-1 ${isActive ? "bg-white text-primary" : "bg-secondary-subtle text-secondary"}`}
                          style={{ fontSize: "0.65rem" }}
                        >
                          {category.code}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

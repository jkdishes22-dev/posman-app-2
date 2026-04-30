import React from "react";

interface PaginationProps {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    showInfo?: boolean;
    /** Plural noun shown after the total count (default: bills). */
    recordLabel?: string;
}

const Pagination: React.FC<PaginationProps> = ({
    page,
    pageSize,
    total,
    onPageChange,
    showInfo = true,
    recordLabel = "bills",
}) => {
    const totalPages = Math.ceil(total / pageSize);
    
    // Don't show pagination if there are no items
    if (total === 0) return null;
    
    // Show pagination even for single page if showInfo is true, otherwise only if multiple pages
    if (totalPages <= 1 && !showInfo) return null;

    const handlePrev = () => {
        if (page > 1) onPageChange(page - 1);
    };
    const handleNext = () => {
        if (page < totalPages) onPageChange(page + 1);
    };

    // Calculate display range
    const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, total);

    // Show up to 5 page numbers
    const getPageNumbers = () => {
        const pages = [];
        let start = Math.max(1, page - 2);
        let end = Math.min(totalPages, page + 2);
        if (page <= 3) end = Math.min(5, totalPages);
        if (page >= totalPages - 2) start = Math.max(1, totalPages - 4);
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="d-flex flex-column align-items-center my-4">
            {showInfo && (
                <div className="mb-2 text-muted small">
                    Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of <strong>{total}</strong>{" "}
                    {recordLabel}
                </div>
            )}
            {totalPages > 1 && (
                <nav>
                    <ul className="pagination mb-0">
                        <li className={`page-item${page === 1 ? " disabled" : ""}`}>
                            <button className="page-link" onClick={handlePrev} disabled={page === 1}>
                                <i className="bi bi-chevron-left"></i> Previous
                            </button>
                        </li>
                        {getPageNumbers().map((num) => (
                            <li key={num} className={`page-item${num === page ? " active" : ""}`}>
                                <button className="page-link" onClick={() => onPageChange(num)}>{num}</button>
                            </li>
                        ))}
                        <li className={`page-item${page === totalPages ? " disabled" : ""}`}>
                            <button className="page-link" onClick={handleNext} disabled={page === totalPages}>
                                Next <i className="bi bi-chevron-right"></i>
                            </button>
                        </li>
                    </ul>
                </nav>
            )}
        </div>
    );
};

export default Pagination; 
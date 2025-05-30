import React from "react";

interface PaginationProps {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ page, pageSize, total, onPageChange }) => {
    const totalPages = Math.ceil(total / pageSize);
    if (totalPages <= 1) return null;

    const handlePrev = () => {
        if (page > 1) onPageChange(page - 1);
    };
    const handleNext = () => {
        if (page < totalPages) onPageChange(page + 1);
    };

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
        <nav className="d-flex justify-content-center my-3">
            <ul className="pagination">
                <li className={`page-item${page === 1 ? " disabled" : ""}`}>
                    <button className="page-link" onClick={handlePrev} disabled={page === 1}>
                        Prev
                    </button>
                </li>
                {getPageNumbers().map((num) => (
                    <li key={num} className={`page-item${num === page ? " active" : ""}`}>
                        <button className="page-link" onClick={() => onPageChange(num)}>{num}</button>
                    </li>
                ))}
                <li className={`page-item${page === totalPages ? " disabled" : ""}`}>
                    <button className="page-link" onClick={handleNext} disabled={page === totalPages}>
                        Next
                    </button>
                </li>
            </ul>
        </nav>
    );
};

export default Pagination; 
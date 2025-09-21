import React from "react";

interface SubItem {
    sub_item_name: string;
    sub_item_code: string;
    portion_size: number;
}

interface GroupedItemDisplayProps {
    itemName: string;
    subItems: SubItem[];
    className?: string;
}

const GroupedItemDisplay: React.FC<GroupedItemDisplayProps> = ({
    itemName,
    subItems,
    className = ""
}) => {
    if (!subItems || subItems.length === 0) {
        return <span className={className}>{itemName}</span>;
    }

    const subItemsText = subItems
        .map(subItem => `${subItem.sub_item_name} (${subItem.portion_size})`)
        .join(", ");

    return (
        <div className={className}>
            <div className="fw-medium">{itemName}</div>
            <div
                className="text-muted small fst-italic"
                style={{ fontSize: "0.75rem", marginTop: "2px" }}
            >
                ({subItemsText})
            </div>
        </div>
    );
};

export default GroupedItemDisplay;

import React from 'react';

function InventoryList({ items, onUpdateItem }) {
    return (
        <div className="card">
            <div className="card-header">
                <h2>Items</h2>
            </div>
            <ul className="list-group list-group-flush">
                {items.map(item => (
                    <li key={item.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            {item.name} - {item.quantity}
                        </div>
                        <div className="input-group">
                            <input 
                                type="number" 
                                className="form-control" 
                                placeholder="New Quantity" 
                                onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            />
                            <button 
                                className="btn btn-outline-primary" 
                                onClick={() => handleUpdateClick(item.id)}>
                                Update
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default InventoryList;

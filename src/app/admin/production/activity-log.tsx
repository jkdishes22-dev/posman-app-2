import React, { useState, useEffect } from "react";

function AuditLog() {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await fetch("/api/inventory_activity", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      setActivities(data);
    } catch (error) {
      console.error("Failed to fetch inventory activities", error);
    }
  };

  return (
    <div className="card mt-4">
      <div className="card-header">
        <h2>Audit Log</h2>
      </div>
      <ul className="list-group list-group-flush">
        {activities.map((activity) => (
          <li key={activity.id} className="list-group-item">
            {activity.action} - Item ID: {activity.inventory_id}, Metadata:{" "}
            {JSON.stringify(activity.metadata)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AuditLog;

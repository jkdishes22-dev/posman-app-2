import React, { useState, useEffect } from "react";

function AuditLog() {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/inventory_activity", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      } else {
        console.error("Failed to fetch inventory activities:", response.statusText);
        setActivities([]);
      }
    } catch (error: any) {
      console.error("Failed to fetch inventory activities", error);
      setActivities([]);
    }
  };

  return (
    <div className="card mt-4">
      <div className="card-header">
        <h2>Audit Log</h2>
      </div>
      {activities.length > 0 ? (
        <ul className="list-group list-group-flush">
          {activities.map((activity) => (
            <li key={activity.id} className="list-group-item">
              {activity.action} - Item ID: {activity.inventory_id}, Metadata:{" "}
              {JSON.stringify(activity.metadata)}
            </li>
          ))}
        </ul>
      ) : (
        <div className="card-body text-center text-muted">
          <p>No inventory activities recorded yet.</p>
        </div>
      )}
    </div>
  );
}

export default AuditLog;

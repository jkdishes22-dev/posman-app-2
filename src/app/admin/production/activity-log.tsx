import React, { useState, useEffect } from "react";
import { useApiCall } from "../../utils/apiUtils";
import ErrorDisplay from "../../components/ErrorDisplay";

function AuditLog() {
  const apiCall = useApiCall();
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const result = await apiCall("/api/inventory_activity");
      if (result.status === 200) {
        setActivities(result.data);
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to fetch inventory activities");
        setErrorDetails(result.errorDetails);
        setActivities([]);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      setActivities([]);
      console.error("Failed to fetch inventory activities", error);
    }
  };

  return (
    <div className="card mt-4">
      <div className="card-header">
        <h2>Audit Log</h2>
      </div>
      <ErrorDisplay
        error={error}
        errorDetails={errorDetails}
        onDismiss={() => {
          setError(null);
          setErrorDetails(null);
        }}
      />
      {!error && activities.length > 0 ? (
        <ul className="list-group list-group-flush">
          {activities.map((activity) => (
            <li key={activity.id} className="list-group-item">
              {activity.action} - Item ID: {activity.inventory_id}, Metadata:{" "}
              {JSON.stringify(activity.metadata)}
            </li>
          ))}
        </ul>
      ) : !error ? (
        <div className="card-body text-center text-muted">
          <p>No inventory activities recorded yet.</p>
        </div>
      ) : null}
    </div>
  );
}

export default AuditLog;

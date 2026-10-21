
import { useCallback, useEffect, useState } from "react";

const API = "http://localhost:5000/api";

function AssistanceDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Load assistance requests using the logged-in staff token.
  const loadRequests = useCallback(async () => {
    const token = localStorage.getItem("railsaathiToken");

    if (!token) {
      setError("Please log in to access the staff dashboard.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await fetch(`${API}/assistance/MAS`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load assistance requests."
        );
      }

      if (!Array.isArray(data)) {
        throw new Error("Unexpected response from the server.");
      }

      setRequests(data);
    } catch (err) {
      console.error("Loading assistance requests failed:", err);
      setError(err.message || "Could not load assistance requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Accept a request or mark it as completed.
  const updateStatus = async (requestId, status) => {
    const token = localStorage.getItem("railsaathiToken");

    if (!token) {
      setError("Your login session is missing. Please log in again.");
      return;
    }

    try {
      setUpdatingId(requestId);
      setError("");
      setMessage("");

      const response = await fetch(
        `${API}/assistance/${requestId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update the request status."
        );
      }

      setMessage(
        status === "accepted"
          ? "Assistance request accepted successfully."
          : "Assistance request marked as completed."
      );

      // Reload the latest requests from the database.
      await loadRequests();
    } catch (err) {
      console.error("Updating assistance request failed:", err);
      setError(err.message || "Could not update the request.");
    } finally {
      setUpdatingId("");
    }
  };

  if (loading) {
    return (
      <div className="staff-dashboard">
        <h2>Staff Assistance Dashboard</h2>
        <p>Loading assistance requests...</p>
      </div>
    );
  }

  return (
    <div className="staff-dashboard">
      <div className="staff-dashboard-header">
        <div>
          <h2>👮 Staff Assistance Dashboard</h2>
          <p>Manage passenger assistance requests at Chennai Central.</p>
        </div>

        <button
          type="button"
          className="refresh-button"
          onClick={loadRequests}
          disabled={Boolean(updatingId)}
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="staff-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="staff-success" role="status">
          {message}
        </div>
      )}

      {!error && requests.length === 0 && (
        <div className="no-requests">
          <p>No active assistance requests.</p>
          <p>New passenger requests will appear here.</p>
        </div>
      )}

      <div className="request-list">
        {requests.map((request) => (
          <div className="request-card" key={request._id}>
            <div className="request-card-header">
              <strong>
                {getAssistanceIcon(request.assistanceType)}{" "}
                {getAssistanceName(request.assistanceType)}
              </strong>

              <span
                className={`status-badge ${request.status}`}
              >
                {request.status.toUpperCase()}
              </span>
            </div>

            <div className="request-details">
              <p>
                <strong>Location:</strong>{" "}
                {request.location || "Not specified"}
              </p>

              {request.description && (
                <p>
                  <strong>Description:</strong>{" "}
                  {request.description}
                </p>
              )}

              <p>
                <strong>Station:</strong> Chennai Central (MAS)
              </p>

              <p>
                <strong>Requested:</strong>{" "}
                {formatDate(request.createdAt)}
              </p>
            </div>

            <div className="request-actions">
              {request.status === "pending" && (
                <button
                  type="button"
                  className="accept-button"
                  onClick={() =>
                    updateStatus(request._id, "accepted")
                  }
                  disabled={Boolean(updatingId)}
                >
                  {updatingId === request._id
                    ? "Updating..."
                    : "✓ Accept Request"}
                </button>
              )}

              {request.status === "accepted" && (
                <button
                  type="button"
                  className="complete-button"
                  onClick={() =>
                    updateStatus(request._id, "completed")
                  }
                  disabled={Boolean(updatingId)}
                >
                  {updatingId === request._id
                    ? "Updating..."
                    : "✓ Mark Completed"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getAssistanceIcon(type) {
  switch (type) {
    case "wheelchair":
      return "♿";
    case "porter":
      return "🧳";
    case "staff":
      return "👤";
    default:
      return "📋";
  }
}

function getAssistanceName(type) {
  switch (type) {
    case "wheelchair":
      return "Wheelchair Assistance";
    case "porter":
      return "Porter Assistance";
    case "staff":
      return "Staff Assistance";
    default:
      return "Assistance Request";
  }
}

function formatDate(dateString) {
  if (!dateString) return "Unknown";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString();
}

export default AssistanceDashboard;

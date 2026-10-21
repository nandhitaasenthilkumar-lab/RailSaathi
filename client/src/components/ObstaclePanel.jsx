
import { useCallback, useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

const obstacleTypes = [
  { value: "blocked_path", label: "Blocked Path" },
  { value: "broken_elevator", label: "Broken Elevator" },
  { value: "blocked_ramp", label: "Blocked Wheelchair Ramp" },
  { value: "blocked_stairs", label: "Blocked Stairs" },
  { value: "maintenance", label: "Maintenance Work" },
  { value: "other", label: "Other" }
];

function ObstaclePanel({ token, stationCode = "MAS", canResolve = false }) {
  const [obstacles, setObstacles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("blocked_path");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadObstacles = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API}/obstacles/${encodeURIComponent(stationCode)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load obstacles.");
      }

      if (!Array.isArray(data)) {
        throw new Error("Unexpected obstacle data received.");
      }

      setObstacles(data);
    } catch (err) {
      console.error("Loading obstacles failed:", err);
      setError(err.message || "Unable to load obstacles.");
    } finally {
      setLoading(false);
    }
  }, [stationCode]);

  useEffect(() => {
    loadObstacles();
  }, [loadObstacles]);

  const reportObstacle = async (event) => {
    event.preventDefault();

    if (!token) {
      setError("Please log in before reporting an obstacle.");
      return;
    }

    if (!location.trim()) {
      setError("Please enter the obstacle location.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      const response = await fetch(`${API}/obstacles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          stationCode,
          location: location.trim(),
          type,
          description: description.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to report obstacle.");
      }

      setLocation("");
      setType("blocked_path");
      setDescription("");
      setMessage("Obstacle reported successfully.");
      await loadObstacles();
    } catch (err) {
      console.error("Reporting obstacle failed:", err);
      setError(err.message || "Unable to report obstacle.");
    } finally {
      setSubmitting(false);
    }
  };

  const resolveObstacle = async (id) => {
    if (!token) {
      setError("Please log in to resolve an obstacle.");
      return;
    }

    try {
      setResolvingId(id);
      setError("");
      setMessage("");

      const response = await fetch(
        `${API}/obstacles/${encodeURIComponent(id)}/resolve`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to resolve obstacle.");
      }

      setMessage("Obstacle marked as resolved.");
      await loadObstacles();
    } catch (err) {
      console.error("Resolving obstacle failed:", err);
      setError(err.message || "Unable to resolve obstacle.");
    } finally {
      setResolvingId("");
    }
  };

  return (
    <section className="obstacle-panel">
      <div className="obstacle-header">
        <div>
          <h2>⚠️ Station Obstacles</h2>
          <p>Report hazards and check active station issues.</p>
        </div>

        <button
          type="button"
          className="refresh-button"
          onClick={loadObstacles}
          disabled={loading || Boolean(resolvingId) || submitting}
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="obstacle-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="obstacle-success" role="status">
          {message}
        </div>
      )}

      <form className="obstacle-form" onSubmit={reportObstacle}>
        <h3>Report an Obstacle</h3>

        <div className="obstacle-field">
          <label htmlFor="obstacle-location">Location</label>
          <input
            id="obstacle-location"
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="e.g. Platform 2, near the elevator"
            maxLength={150}
            required
          />
        </div>

        <div className="obstacle-field">
          <label htmlFor="obstacle-type">Obstacle Type</label>
          <select
            id="obstacle-type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            required
          >
            {obstacleTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="obstacle-field">
          <label htmlFor="obstacle-description">
            Additional Details (optional)
          </label>
          <textarea
            id="obstacle-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the hazard to help other passengers."
            rows={3}
            maxLength={500}
          />
        </div>

        <button
          type="submit"
          className="obstacle-submit-button"
          disabled={submitting}
        >
          {submitting ? "Reporting..." : "Report Obstacle"}
        </button>
      </form>

      <div className="active-obstacles">
        <h3>Active Obstacles ({obstacles.length})</h3>

        {loading && <p>Loading active obstacles...</p>}

        {!loading && !error && obstacles.length === 0 && (
          <p className="no-obstacles">
            No active obstacles reported. The station may still have
            unreported hazards, so use caution.
          </p>
        )}

        {obstacles.map((obstacle) => {
          const obstacleLabel =
            obstacleTypes.find((item) => item.value === obstacle.type)
              ?.label || "Other Obstacle";

          return (
            <article className="obstacle-card" key={obstacle._id}>
              <div className="obstacle-card-header">
                <strong>⚠️ {obstacleLabel}</strong>
                <span className="obstacle-active-badge">ACTIVE</span>
              </div>

              <p>
                <strong>Location:</strong> {obstacle.location}
              </p>

              {obstacle.description && (
                <p>
                  <strong>Details:</strong> {obstacle.description}
                </p>
              )}

              <p className="obstacle-date">
                <strong>Reported:</strong> {formatDate(obstacle.createdAt)}
              </p>

              {canResolve && (
                <button
                  type="button"
                  className="resolve-obstacle-button"
                  onClick={() => resolveObstacle(obstacle._id)}
                  disabled={Boolean(resolvingId) || submitting}
                >
                  {resolvingId === obstacle._id
                    ? "Resolving..."
                    : "✓ Mark as Resolved"}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function formatDate(dateString) {
  if (!dateString) return "Unknown";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString();
}

export default ObstaclePanel;


import { useCallback, useEffect, useState } from "react";
import StationMap from "./components/StationMap";
import AssistanceDashboard from "./components/AssistanceDashboard";
import ObstaclePanel from "./components/ObstaclePanel";
import "./App.css";

const API = "http://localhost:5000/api";

function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem("railsaathiUser")) || null;
  } catch {
    return null;
  }
}

function isStaffRole(role) {
  return ["staff", "admin"].includes(role);
}

function formatNodeType(type) {
  switch (type) {
    case "entrance":
      return "Station Entrance";
    case "exit":
      return "Station Exit";
    case "platform":
      return "Platform";
    case "ramp":
      return "Wheelchair Ramp";
    case "elevator":
      return "Elevator";
    case "stairs":
      return "Stairs";
    case "ticket_counter":
      return "Ticket Counter";
    case "restroom":
      return "Restroom";
    case "junction":
      return "Accessible Junction";
    default:
      return "Navigation Point";
  }
}

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("railsaathiToken") || ""
  );

  const [user, setUser] = useState(getSavedUser);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [station, setStation] = useState(null);
  const [view, setView] = useState(() =>
    isStaffRole(getSavedUser()?.role) ? "staff" : "passenger"
  );

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [route, setRoute] = useState(null);
  const [routeDistance, setRouteDistance] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [assistanceType, setAssistanceType] = useState("wheelchair");
  const [assistanceLocation, setAssistanceLocation] = useState("");
  const [assistanceDescription, setAssistanceDescription] = useState("");
  const [assistanceLoading, setAssistanceLoading] = useState(false);
  const [assistanceMessage, setAssistanceMessage] = useState("");
  const [assistanceError, setAssistanceError] = useState("");

  // Staff dashboard metrics.
  // Null means that the count has not been loaded yet.
  const [dashboardStats, setDashboardStats] = useState({
    pendingAssistance: null,
    openRequests: null,
    activeObstacles: null,
    loading: false,
    error: ""
  });

  // Load station information after authentication.
  useEffect(() => {
    if (!token || !user) {
      setStation(null);
      return;
    }

    const controller = new AbortController();

    fetch(`${API}/stations/code/MAS`, {
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load station");
        }
        return response.json();
      })
      .then((data) => {
        setStation(data);
        setError("");
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error(err);
          setError("Unable to load station data");
        }
      });

    return () => controller.abort();
  }, [token, user]);

  // Load real assistance and active-obstacle data for staff.
  const loadDashboardStats = useCallback(async () => {
    if (
      !token ||
      !station?.code ||
      !isStaffRole(user?.role) ||
      view !== "staff"
    ) {
      return;
    }

    setDashboardStats((previous) => ({
      ...previous,
      loading: true,
      error: ""
    }));

    try {
      const headers = {
        Authorization: `Bearer ${token}`
      };

      const [assistanceResponse, obstaclesResponse] = await Promise.all([
        fetch(`${API}/assistance/${station.code}`, { headers }),
        fetch(`${API}/obstacles/${station.code}`, { headers })
      ]);

      if (!assistanceResponse.ok || !obstaclesResponse.ok) {
        throw new Error(
          "Could not load dashboard metrics. Check your server and permissions."
        );
      }

      const [assistanceData, obstaclesData] = await Promise.all([
        assistanceResponse.json(),
        obstaclesResponse.json()
      ]);

      if (
        !Array.isArray(assistanceData) ||
        !Array.isArray(obstaclesData)
      ) {
        throw new Error("Unexpected dashboard data received from the server.");
      }

      setDashboardStats({
        pendingAssistance: assistanceData.filter(
          (request) =>
            request.status?.toLowerCase() === "pending"
        ).length,
        openRequests: assistanceData.length,
        activeObstacles: obstaclesData.length,
        loading: false,
        error: ""
      });
    } catch (err) {
      console.error("Dashboard metrics error:", err);

      setDashboardStats((previous) => ({
        ...previous,
        loading: false,
        error: err.message || "Unable to load dashboard metrics."
      }));
    }
  }, [token, station?.code, user?.role, view]);

  // Load metrics when staff opens the dashboard.
  useEffect(() => {
    loadDashboardStats();
  }, [loadDashboardStats]);

  // Login and passenger registration.
  const handleAuthentication = async (event) => {
    event.preventDefault();

    setAuthLoading(true);
    setAuthError("");
    setAuthMessage("");

    try {
      const endpoint = authMode === "login" ? "login" : "register";

      const body =
        authMode === "login"
          ? {
              username: username.trim(),
              password
            }
          : {
              username: username.trim(),
              email: email.trim(),
              password
            };

      const response = await fetch(`${API}/auth/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      if (authMode === "register") {
        setAuthMessage("Account created! Please log in.");
        setAuthMode("login");
        setPassword("");
        setEmail("");
        return;
      }

      if (!data.token || !data.user || !data.user.role) {
        throw new Error("The server returned an invalid login response.");
      }

      localStorage.setItem("railsaathiToken", data.token);
      localStorage.setItem("railsaathiUser", JSON.stringify(data.user));

      setToken(data.token);
      setUser(data.user);
      setView(isStaffRole(data.user.role) ? "staff" : "passenger");

      setPassword("");
      setError("");
      setAuthError("");
    } catch (err) {
      setAuthError(err.message || "Unable to connect to the server");
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout and clear the local session.
  const logout = () => {
    localStorage.removeItem("railsaathiToken");
    localStorage.removeItem("railsaathiUser");

    setToken("");
    setUser(null);
    setStation(null);
    setView("passenger");
    setRoute(null);
    setRouteDistance(null);
    setError("");
    setAuthError("");
    setAuthMessage("");
    setFrom("");
    setTo("");
    setPassword("");
    setAssistanceMessage("");
    setAssistanceError("");
    setEmergencyMode(false);

    setDashboardStats({
      pendingAssistance: null,
      openRequests: null,
      activeObstacles: null,
      loading: false,
      error: ""
    });
  };

  // Calculate a route using the existing backend endpoint.
  const findRoute = async () => {
    if (!from || !to) {
      setError("Please select both starting point and destination");
      return;
    }

    if (from === to) {
      setError("Starting point and destination must be different");
      return;
    }

    if (!station?.code) {
      setError("Station data is not available yet");
      return;
    }

    setLoading(true);
    setError("");
    setRoute(null);
    setRouteDistance(null);

    try {
      const url =
        `${API}/navigation/${station.code}/route` +
        `?from=${encodeURIComponent(from)}` +
        `&to=${encodeURIComponent(to)}` +
        `&accessible=${accessibleOnly}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to calculate route");
      }

      setRoute(data.path);
      setRouteDistance(data.distance);
    } catch (err) {
      setError(err.message || "Unable to calculate route");
    } finally {
      setLoading(false);
    }
  };

  // Emergency mode enables accessible routing.
  const activateEmergencyMode = () => {
    setEmergencyMode(true);
    setAccessibleOnly(true);
    setFrom("");
    setTo("");
    setRoute(null);
    setRouteDistance(null);
    setError("");
  };

  const exitEmergencyMode = () => {
    setEmergencyMode(false);
    setAccessibleOnly(false);
    setFrom("");
    setTo("");
    setRoute(null);
    setRouteDistance(null);
    setError("");
  };

  // Submit a passenger assistance request.
  const submitAssistanceRequest = async () => {
    if (!assistanceLocation) {
      setAssistanceError("Please select your current location");
      setAssistanceMessage("");
      return;
    }

    if (!station?.code) {
      setAssistanceError("Station data is not available yet");
      return;
    }

    setAssistanceLoading(true);
    setAssistanceError("");
    setAssistanceMessage("");

    try {
      const response = await fetch(`${API}/assistance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          stationCode: station.code,
          assistanceType,
          location: assistanceLocation,
          description: assistanceDescription
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit request");
      }

      setAssistanceMessage("Assistance request submitted successfully!");
      setAssistanceDescription("");
    } catch (err) {
      setAssistanceError(err.message || "Unable to submit request");
    } finally {
      setAssistanceLoading(false);
    }
  };

  // Authentication screen.
  if (!token || !user) {
    return (
      <main className="auth-page">
        <div className="auth-decoration auth-decoration-one" />
        <div className="auth-decoration auth-decoration-two" />

        <section className="auth-card">
          <div className="auth-brand">
            <div className="auth-logo" aria-hidden="true">🚆</div>
            <div className="auth-eyebrow">ACCESSIBLE TRANSIT, REIMAGINED</div>
            <h1>RailSaathi<span>.</span></h1>
            <p>Your station. Your route. Your way.</p>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className={authMode === "login" ? "auth-tab active" : "auth-tab"}
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
                setAuthMessage("");
              }}
            >
              Login
            </button>

            <button
              type="button"
              className={authMode === "register" ? "auth-tab active" : "auth-tab"}
              onClick={() => {
                setAuthMode("register");
                setAuthError("");
                setAuthMessage("");
              }}
            >
              Create account
            </button>
          </div>

          <form className="auth-form" onSubmit={handleAuthentication}>
            <h2>
              {authMode === "login" ? "Welcome back." : "Let's get you moving."}
            </h2>

            <p className="auth-description">
              {authMode === "login"
                ? "Sign in to plan a more accessible station journey."
                : "Create a passenger account to get started."}
            </p>

            <label htmlFor="auth-username">Username or email</label>
            <input
              id="auth-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your username or email"
              minLength={authMode === "register" ? 3 : undefined}
              maxLength={30}
              required
            />

            {authMode === "register" && (
              <>
                <label htmlFor="auth-email">Email address</label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </>
            )}

            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={
                authMode === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={
                authMode === "register"
                  ? "At least 8 characters"
                  : "Enter your password"
              }
              minLength={authMode === "register" ? 8 : undefined}
              required
            />

            {authError && (
              <div className="auth-error" role="alert">{authError}</div>
            )}

            {authMessage && (
              <div className="auth-success" role="status">{authMessage}</div>
            )}

            <button className="auth-submit" type="submit" disabled={authLoading}>
              {authLoading
                ? "Please wait..."
                : authMode === "login"
                  ? "Sign in to RailSaathi →"
                  : "Create passenger account →"}
            </button>
          </form>

          <div className="auth-trust">
            <span>♿</span>
            <p>Designed to make station navigation easier for everyone.</p>
          </div>
        </section>
      </main>
    );
  }

  // Wait for station information before showing either portal.
  if (!station) {
    return (
      <main className="loading-page">
        <div className="loading-card">
          <div className="loading-logo">🚆</div>
          <h1>RailSaathi<span>.</span></h1>
          <div className="loading-spinner" aria-hidden="true" />
          <p>Loading Chennai Central station...</p>
          {error && <div className="error-message">{error}</div>}
          <button className="secondary-button" onClick={logout}>Log out</button>
        </div>
      </main>
    );
  }

  const allLocations = [
    ...(station.entrances || []),
    ...(station.platforms || []),
    ...(station.facilities || []),
    ...(station.exits || [])
  ];

  const isStaff = isStaffRole(user.role);

  // Staff portal.
  if (isStaff && view === "staff") {
    return (
      <div className="app">
        <style>{`
          .rs-metrics {
            margin: 0 0 28px;
          }
          .rs-metrics-heading {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 14px;
            margin-bottom: 15px;
          }
          .rs-metrics-heading h3 {
            margin: 4px 0;
            color: #253C6D;
            font-family: 'Space Grotesk', sans-serif;
            font-size: 22px;
          }
          .rs-metrics-heading p {
            margin: 4px 0 0;
            color: #737D91;
            font-size: 12px;
          }
          .rs-metrics-refresh {
            border: 1px solid #DCE2ED;
            border-radius: 10px;
            padding: 10px 14px;
            background: #FFFFFF;
            color: #253C6D;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
          }
          .rs-metrics-refresh:hover:not(:disabled) {
            background: #FFF5E9;
            border-color: #FCAD38;
          }
          .rs-metrics-refresh:disabled {
            opacity: 0.65;
            cursor: wait;
          }
          .rs-metrics-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 15px;
          }
          .rs-metric-card {
            display: flex;
            align-items: flex-start;
            gap: 14px;
            min-width: 0;
            padding: 21px;
            background: #FFFFFF;
            border: 1px solid #E5E9F1;
            border-radius: 16px;
            box-shadow: 0 5px 18px rgba(37, 60, 109, 0.045);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          .rs-metric-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 24px rgba(37, 60, 109, 0.09);
          }
          .rs-metric-icon {
            display: grid;
            place-items: center;
            flex: 0 0 43px;
            width: 43px;
            height: 43px;
            border-radius: 13px;
            font-size: 23px;
            font-weight: 800;
          }
          .rs-metric-pending {
            background: #FFF3DC;
            color: #9B6500;
          }
          .rs-metric-obstacles {
            background: #FFF0E8;
            color: #B9571B;
          }
          .rs-metric-open {
            background: #EAF0FF;
            color: #253C6D;
          }
          .rs-metric-copy {
            display: flex;
            flex-direction: column;
            min-width: 0;
          }
          .rs-metric-label {
            color: #737D91;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.7px;
            line-height: 1.6;
          }
          .rs-metric-value {
            margin: 4px 0;
            color: #253C6D;
            font-family: 'Space Grotesk', sans-serif;
            font-size: 32px;
            line-height: 1.2;
          }
          .rs-metric-note {
            color: #737D91;
            font-size: 10px;
            line-height: 1.5;
          }
          .rs-metrics-error {
            margin: 0 0 14px;
            padding: 12px 14px;
            border: 1px solid #F3C6B5;
            border-radius: 10px;
            background: #FFF4EF;
            color: #9D3E22;
            font-size: 12px;
          }
          @media (max-width: 760px) {
            .rs-metrics-grid {
              grid-template-columns: 1fr;
              gap: 10px;
            }
            .rs-metric-card {
              padding: 16px;
            }
            .rs-metric-value {
              font-size: 28px;
            }
          }
          @media (max-width: 450px) {
            .rs-metrics-heading {
              align-items: flex-start;
              flex-direction: column;
            }
          }
        `}</style>

        <header className="app-header">
          <a className="brand-lockup" href="#staff-home" aria-label="RailSaathi home">
            <span className="brand-mark">R<span>.</span></span>
            <span className="brand-copy">
              <strong>RailSaathi</strong>
              <small>ACCESSIBLE TRANSIT</small>
            </span>
          </a>

          <div className="header-context">
            <span className="header-context-dot" />
            Station staff portal
          </div>

          <div className="header-actions">
            <span className="user-chip">
              <span className="user-avatar">{user.username?.charAt(0)?.toUpperCase() || "S"}</span>
              <span className="user-chip-copy">
                <strong>{user.username}</strong>
                <small>{user.role}</small>
              </span>
            </span>
            <button className="view-switch-button" onClick={() => setView("passenger")}>
              Passenger view
            </button>
            <button className="logout-button" onClick={logout}>Log out</button>
          </div>
        </header>

        <main className="dashboard-main" id="staff-home">
          <section className="dashboard-hero staff-hero">
            <div className="hero-copy">
              <div className="eyebrow"><span /> OPERATIONS WORKSPACE</div>
              <h1>Keep every journey <span>moving.</span></h1>
              <p>Manage passenger assistance and station obstacles from one workspace.</p>
              <div className="hero-meta">
                <span className="meta-icon">⌖</span>
                <span>{station.name || "Chennai Central"}</span>
                <span className="meta-divider" />
                <span>Station code: {station.code}</span>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="hero-orbit orbit-one" />
              <div className="hero-orbit orbit-two" />
              <div className="hero-art-core">R<span>.</span></div>
              <span className="hero-art-label">STAFF</span>
            </div>
          </section>

          <div className="section-heading">
            <div>
              <span className="section-kicker">STATION OPERATIONS</span>
              <h2>Operations overview</h2>
            </div>
            <span className="section-caption">Manage requests and reportable obstacles</span>
          </div>

          {/* New staff dashboard metrics */}
          <section className="rs-metrics" aria-label="Station metrics">
            <div className="rs-metrics-heading">
              <div>
                <span className="section-kicker">LIVE DATA SNAPSHOT</span>
                <h3>Station at a glance</h3>
                <p>Counts retrieved from your existing station records.</p>
              </div>

              <button
                type="button"
                className="rs-metrics-refresh"
                onClick={loadDashboardStats}
                disabled={dashboardStats.loading}
              >
                {dashboardStats.loading ? "Refreshing..." : "↻ Refresh"}
              </button>
            </div>

            {dashboardStats.error && (
              <div className="rs-metrics-error" role="alert">
                {dashboardStats.error}
              </div>
            )}

            <div className="rs-metrics-grid">
              <article className="rs-metric-card">
                <span className="rs-metric-icon rs-metric-pending" aria-hidden="true">
                  ◷
                </span>
                <div className="rs-metric-copy">
                  <span className="rs-metric-label">PENDING ASSISTANCE</span>
                  <strong className="rs-metric-value">
                    {dashboardStats.loading && dashboardStats.pendingAssistance === null
                      ? "…"
                      : dashboardStats.pendingAssistance ?? "—"}
                  </strong>
                  <small className="rs-metric-note">Awaiting staff action</small>
                </div>
              </article>

              <article className="rs-metric-card">
                <span className="rs-metric-icon rs-metric-obstacles" aria-hidden="true">
                  !
                </span>
                <div className="rs-metric-copy">
                  <span className="rs-metric-label">ACTIVE OBSTACLES</span>
                  <strong className="rs-metric-value">
                    {dashboardStats.loading && dashboardStats.activeObstacles === null
                      ? "…"
                      : dashboardStats.activeObstacles ?? "—"}
                  </strong>
                  <small className="rs-metric-note">Currently reported as active</small>
                </div>
              </article>

              <article className="rs-metric-card">
                <span className="rs-metric-icon rs-metric-open" aria-hidden="true">
                  ↗
                </span>
                <div className="rs-metric-copy">
                  <span className="rs-metric-label">OPEN REQUESTS</span>
                  <strong className="rs-metric-value">
                    {dashboardStats.loading && dashboardStats.openRequests === null
                      ? "…"
                      : dashboardStats.openRequests ?? "—"}
                  </strong>
                  <small className="rs-metric-note">Pending and accepted requests</small>
                </div>
              </article>
            </div>
          </section>

          <AssistanceDashboard />

          <ObstaclePanel
            token={token}
            stationCode={station.code}
            canResolve={true}
          />
        </main>

        <footer className="app-footer">
          <span className="footer-brand">RailSaathi<span>.</span></span>
          <span>Making station navigation more accessible.</span>
          <span>{station.code} · Staff portal</span>
        </footer>
      </div>
    );
  }

  // Passenger navigation portal.
  return (
    <div className="app">
      <header className="app-header">
        <a className="brand-lockup" href="#passenger-home" aria-label="RailSaathi home">
          <span className="brand-mark">R<span>.</span></span>
          <span className="brand-copy">
            <strong>RailSaathi</strong>
            <small>ACCESSIBLE TRANSIT</small>
          </span>
        </a>

        <div className="header-context">
          <span className="header-context-dot" />
          {station.name || "Chennai Central"}
        </div>

        <div className="header-actions">
          <span className="user-chip">
            <span className="user-avatar">{user.username?.charAt(0)?.toUpperCase() || "P"}</span>
            <span className="user-chip-copy">
              <strong>{user.username}</strong>
              <small>{user.role}</small>
            </span>
          </span>

          {isStaff && (
            <button className="view-switch-button" onClick={() => setView("staff")}>
              Staff dashboard
            </button>
          )}

          {!emergencyMode ? (
            <button className="emergency-button" onClick={activateEmergencyMode}>
              <span aria-hidden="true">!</span> Emergency mode
            </button>
          ) : (
            <button className="emergency-active-button" onClick={exitEmergencyMode}>
              Exit emergency mode
            </button>
          )}

          <button className="logout-button" onClick={logout}>Log out</button>
        </div>
      </header>

      <main className="dashboard-main" id="passenger-home">
        {emergencyMode && (
          <div className="emergency-banner" role="alert">
            <div className="emergency-banner-icon">!</div>
            <div>
              <strong>Emergency mode is active</strong>
              <span>Accessible routing is enabled. Choose your current location and an emergency exit.</span>
            </div>
            <button onClick={exitEmergencyMode}>Exit mode</button>
          </div>
        )}

        <section className="dashboard-hero passenger-hero">
          <div className="hero-copy">
            <div className="eyebrow"><span /> YOUR ACCESSIBLE JOURNEY STARTS HERE</div>
            <h1>Your station.<br />Your route. <span>Your way.</span></h1>
            <p>Find a route through the station that works for you. Navigate with more confidence, one step at a time.</p>
            <a className="hero-cta" href="#route-planner">
              Plan your journey <span aria-hidden="true">↘</span>
            </a>
            <div className="hero-meta">
              <span className="meta-icon">⌖</span>
              <span>{station.name || "Chennai Central"}</span>
              <span className="meta-divider" />
              <span>Station code: {station.code}</span>
            </div>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-art-core">R<span>.</span></div>
            <div className="hero-route route-a" />
            <div className="hero-route route-b" />
            <span className="hero-node node-a" />
            <span className="hero-node node-b" />
            <span className="hero-node node-c" />
            <div className="hero-art-label">FIND YOUR WAY</div>
          </div>
        </section>

        <section className="overview-grid" aria-label="Journey overview">
          <article className="overview-card station-overview">
            <span className="overview-icon">⌖</span>
            <div>
              <span className="overview-label">YOUR STATION</span>
              <strong>{station.name || "Chennai Central"}</strong>
              <small>Station code: {station.code}</small>
            </div>
          </article>

          <article className="overview-card">
            <span className="overview-icon orange-icon">↗</span>
            <div>
              <span className="overview-label">ROUTE STATUS</span>
              <strong>{route ? "Route found" : "Ready to plan"}</strong>
              <small>{route ? `${route.length} navigation points` : "Choose a start and destination"}</small>
            </div>
          </article>

          <article className="overview-card">
            <span className="overview-icon accessible-icon">♿</span>
            <div>
              <span className="overview-label">ACCESSIBILITY</span>
              <strong>{accessibleOnly ? "Accessible routing on" : "Your route preferences"}</strong>
              <small>{accessibleOnly ? "Accessible-only filtering enabled" : "Choose accessible routing below"}</small>
            </div>
          </article>
        </section>

        <section className="section-heading" id="route-planner">
          <div>
            <span className="section-kicker">01 / NAVIGATION</span>
            <h2>Plan your route</h2>
            <p>Choose where you're starting and where you want to go.</p>
          </div>
          <span className="section-caption">Personalised station navigation</span>
        </section>

        <section className="controls route-planner-card">
          <div className="planner-topline">
            <div>
              <span className="planner-label">ROUTE PLANNER</span>
              <h3>Where would you like to go?</h3>
            </div>
            <span className="planner-step">01 <span>/</span> 02</span>
          </div>

          <div className="planner-fields">
            <div className="control-group">
              <label htmlFor="route-from">STARTING POINT</label>
              <div className="select-wrap">
                <span className="select-symbol start-symbol" aria-hidden="true">●</span>
                <select
                  id="route-from"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                >
                  <option value="">Select starting point</option>
                  {allLocations.map((item) => (
                    <option key={item._id} value={item.name}>{item.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="planner-connector" aria-hidden="true">
              <span>↓</span>
            </div>

            <div className="control-group">
              <label htmlFor="route-to">{emergencyMode ? "EMERGENCY EXIT" : "DESTINATION"}</label>
              <div className="select-wrap">
                <span className="select-symbol end-symbol" aria-hidden="true">◆</span>
                <select
                  id="route-to"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                >
                  <option value="">
                    {emergencyMode ? "Select emergency exit" : "Select destination"}
                  </option>
                  {(emergencyMode ? station.exits || [] : allLocations).map((item) => (
                    <option key={item._id} value={item.name}>{item.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="planner-bottom">
            {!emergencyMode ? (
              <label className="accessible-checkbox">
                <input
                  type="checkbox"
                  checked={accessibleOnly}
                  onChange={(event) => setAccessibleOnly(event.target.checked)}
                />
                <span className="custom-check" aria-hidden="true">✓</span>
                <span>
                  <strong>Accessible route</strong>
                  <small>Filter out inaccessible connections</small>
                </span>
              </label>
            ) : (
              <div className="emergency-filter-note">
                <span>♿</span> Accessible routing is enabled for emergency mode.
              </div>
            )}

            <button className="route-button" onClick={findRoute} disabled={loading}>
              {loading ? "Finding route..." : emergencyMode ? "Find emergency route" : "Find my route"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </div>
        </section>

        {error && <div className="error-message" role="alert">{error}</div>}

        {route && (
          <section className="route-result">
            <div className="route-result-header">
              <div className="route-success-heading">
                <span className="route-success-icon">✓</span>
                <div>
                  <span className="section-kicker">YOUR JOURNEY</span>
                  <strong>{emergencyMode ? "Emergency route" : "Your route is ready"}</strong>
                </div>
              </div>
              <span className="route-distance">
                <small>TOTAL DISTANCE</small>
                <strong>{routeDistance}</strong>
              </span>
            </div>

            <div className="route-endpoints">
              <div><span className="endpoint-dot start-dot" /><span><small>FROM</small><strong>{from}</strong></span></div>
              <span className="endpoint-line" aria-hidden="true" />
              <div><span className="endpoint-dot end-dot" /><span><small>TO</small><strong>{to}</strong></span></div>
            </div>

            <div className="route-timeline-heading">
              <h3>Step-by-step directions</h3>
              <span>{route.length} points</span>
            </div>

            <div className="route-steps">
              {route.map((node, index) => (
                <div className="route-step" key={node._id || `${node.name}-${index}`}>
                  <div className="timeline-marker">
                    <div className="step-number">{String(index + 1).padStart(2, "0")}</div>
                    {index !== route.length - 1 && <span className="timeline-line" />}
                  </div>
                  <div className="step-content">
                    <strong>{node.name}</strong>
                    <span>{formatNodeType(node.type)}</span>
                  </div>
                  {index === 0 && <span className="step-tag">START</span>}
                  {index === route.length - 1 && <span className="step-tag end-tag">END</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="section-heading map-section-heading">
          <div>
            <span className="section-kicker">02 / STATION LAYOUT</span>
            <h2>Explore the station</h2>
            <p>{route ? "Your calculated route is shown on the station map." : "Explore the available navigation points in the station."}</p>
          </div>
          <span className="map-legend"><span /> Route highlight</span>
        </section>

        <section className="map-card">
          <div className="map-card-header">
            <div>
              <span className="planner-label">STATION MAP</span>
              <h3>{station.name || "Chennai Central"}</h3>
            </div>
            <span className="map-card-status"><span /> Station layout</span>
          </div>
          <div className="map-shell">
            <StationMap station={station} route={route} />
          </div>
          <div className="map-card-footer">
            <span><i className="legend-dot legend-blue" /> Navigation points</span>
            <span><i className="legend-dot legend-coral" /> Selected route</span>
            <span>Illustrative station layout</span>
          </div>
        </section>

        {!isStaff && (
          <>
            <section className="section-heading assistance-section-heading">
              <div>
                <span className="section-kicker">03 / PASSENGER SUPPORT</span>
                <h2>Need a helping hand?</h2>
                <p>Send an assistance request to station staff.</p>
              </div>
              <span className="support-pill">We're here to help</span>
            </section>

            <section className="assistance-panel">
              <div className="assistance-intro">
                <div className="assistance-illustration" aria-hidden="true">♿</div>
                <div>
                  <h3>Request assistance</h3>
                  <p>Tell us what you need and where you are. Your request will be sent to station staff.</p>
                </div>
              </div>

              <div className="assistance-form-grid">
                <div className="assistance-field">
                  <label htmlFor="assistance-type">TYPE OF ASSISTANCE</label>
                  <select
                    id="assistance-type"
                    value={assistanceType}
                    onChange={(event) => setAssistanceType(event.target.value)}
                  >
                    <option value="wheelchair">♿ Wheelchair assistance</option>
                    <option value="porter">🧳 Porter assistance</option>
                    <option value="staff">👤 Staff assistance</option>
                  </select>
                </div>

                <div className="assistance-field">
                  <label htmlFor="assistance-location">YOUR CURRENT LOCATION</label>
                  <select
                    id="assistance-location"
                    value={assistanceLocation}
                    onChange={(event) => setAssistanceLocation(event.target.value)}
                  >
                    <option value="">Select your current location</option>
                    {allLocations.map((item) => (
                      <option key={item._id} value={item.name}>{item.name}</option>
                    ))}
                  </select>
                </div>

                <div className="assistance-field assistance-description-field">
                  <label htmlFor="assistance-description">ADDITIONAL INFORMATION <span>(OPTIONAL)</span></label>
                  <textarea
                    id="assistance-description"
                    value={assistanceDescription}
                    onChange={(event) => setAssistanceDescription(event.target.value)}
                    placeholder="Tell the staff anything else they should know..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="assistance-submit-row">
                <span className="privacy-note">Your request will be sent to station staff.</span>
                <button
                  className="assistance-button"
                  onClick={submitAssistanceRequest}
                  disabled={assistanceLoading}
                >
                  {assistanceLoading ? "Sending request..." : "Send assistance request"}
                  {!assistanceLoading && <span aria-hidden="true">→</span>}
                </button>
              </div>

              {assistanceMessage && (
                <div className="assistance-success" role="status">✓ {assistanceMessage}</div>
              )}
              {assistanceError && (
                <div className="assistance-error" role="alert">{assistanceError}</div>
              )}
            </section>
          </>
        )}

        <section className="section-heading obstacle-section-heading">
          <div>
            <span className="section-kicker">04 / STATION CONDITIONS</span>
            <h2>Station obstacles</h2>
            <p>Report a navigation obstacle or review reported issues.</p>
          </div>
        </section>

        <ObstaclePanel
          token={token}
          stationCode={station.code}
          canResolve={false}
        />
      </main>

      <footer className="app-footer">
        <span className="footer-brand">RailSaathi<span>.</span></span>
        <span>Making station navigation more accessible.</span>
        <span>{station.code} · Passenger portal</span>
      </footer>
    </div>
  );
}

export default App;

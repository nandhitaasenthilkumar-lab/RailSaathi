function StationMap({ station, route }) {
  const allFacilities = [
    ...(station.entrances || []),
    ...(station.platforms || []),
    ...(station.facilities || []),
    ...(station.exits || [])
  ];

  return (
    <div className="station-map">

      {/* Route line */}
      {route && route.length > 1 && (
        <svg
          className="route-layer"
          width="800"
          height="650"
        >
          <polyline
            points={route
              .map(
                (node) =>
                  `${node.location.x},${node.location.y}`
              )
              .join(" ")}
            fill="none"
            stroke="#16a34a"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* Station locations */}
      {allFacilities.map((item) => {

        const isOnRoute =
          route &&
          route.some(
            (node) => node.name === item.name
          );

        return (
          <div
            key={item._id}
            className={`map-item ${item.type} ${
              isOnRoute ? "route-node" : ""
            }`}
            style={{
              left: `${item.location.x}px`,
              top: `${item.location.y}px`
            }}
            title={item.name}
          >
            <span className="map-icon">
              {getIcon(item.type)}
            </span>

            <span className="map-label">
              {item.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}


function getIcon(type) {
  switch (type) {
    case "entrance":
      return "🚪";

    case "exit":
      return "🚶";

    case "platform":
      return "🚆";

    case "ramp":
      return "♿";

    case "elevator":
      return "🛗";

    case "stairs":
      return "🪜";

    case "ticket_counter":
      return "🎫";

    case "restroom":
        return "🚻";

    case "junction":
        return "🔀";
        
    default:
        return "📍";
  }
}


export default StationMap;
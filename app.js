// ISS LIVE TRACKER — Phase 2+
// Requires Leaflet and satellite.js to be loaded before this file.
//
// Add to index.html:
// <script src="https://unpkg.com/satellite.js@7.1.0/dist/satellite.min.js"></script>
// <script src="app.js"></script>

const ISS_NORAD_ID = 25544;
const ISS_API_URL = "https://api.wheretheiss.at/v1/satellites/25544";
const TLE_URL =
    "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE";

const ORBIT_POINTS = 180;
const ORBIT_MINUTES = 95;
const TRAJECTORY_POINTS = 60;
const TRAJECTORY_MINUTES = 30;

let issSatrec = null;
let orbitLine = null;
let trajectoryLine = null;
let terminatorLayer = null;
let history = [];

// -----------------------------------------------------------------------------
// Existing map
// -----------------------------------------------------------------------------

const map = L.map("map", {
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
    maxZoom: 6,
    worldCopyJump: true
});

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19
    }
).addTo(map);

// -----------------------------------------------------------------------------
// ISS marker
// -----------------------------------------------------------------------------

const issIcon = L.divIcon({
    className: "iss-marker",
    html: `<div class="iss-icon">🛰️</div>`,
    iconSize: [70, 70],
    iconAnchor: [35, 35]
});

const issMarker = L.marker([0, 0], {
    icon: issIcon
}).addTo(map);

// -----------------------------------------------------------------------------
// API
// -----------------------------------------------------------------------------

async function getISSPosition() {
    const response = await fetch(ISS_API_URL, { cache: "no-store" });

    if (!response.ok) {
        throw new Error(`ISS API returned ${response.status}`);
    }

    return response.json();
}

async function getISSTLE() {
    const response = await fetch(TLE_URL, { cache: "no-store" });

    if (!response.ok) {
        throw new Error(`CelesTrak returned ${response.status}`);
    }

    const text = await response.text();
    const lines = text.trim().split(/\r?\n/).filter(Boolean);

    // CelesTrak TLE format normally returns:
    // ISS (ZARYA)
    // 1 25544...
    // 2 25544...
    const line1Index = lines.findIndex(line => line.startsWith("1 "));
    const line2Index = lines.findIndex((line, index) =>
        index > line1Index && line.startsWith("2 ")
    );

    if (line1Index === -1 || line2Index === -1) {
        throw new Error("Could not find a valid ISS TLE.");
    }

    return {
        line1: lines[line1Index],
        line2: lines[line2Index]
    };
}

// -----------------------------------------------------------------------------
// SGP4 helpers
// -----------------------------------------------------------------------------

function requireSatelliteJS() {
    if (typeof satellite === "undefined") {
        throw new Error(
            "satellite.js is not loaded. Add the satellite.js script before app.js."
        );
    }
}

function eciToLatLng(positionEci, date) {
    const gmst = satellite.gstime(date);
    const geodetic = satellite.eciToGeodetic(positionEci, gmst);

    return {
        latitude: satellite.radiansToDegrees(geodetic.latitude),
        longitude: satellite.radiansToDegrees(geodetic.longitude),
        altitude: geodetic.height
    };
}

function propagateToLatLng(date) {
    if (!issSatrec) return null;

    const result = satellite.propagate(issSatrec, date);

    if (!result || !result.position) {
        return null;
    }

    return eciToLatLng(result.position, date);
}

// -----------------------------------------------------------------------------
// 1. Predicted orbital path
// -----------------------------------------------------------------------------

function drawPredictedOrbit() {
    if (!issSatrec) return;

    const points = [];
    const now = new Date();
    const step = (ORBIT_MINUTES * 60 * 1000) / ORBIT_POINTS;

    for (let i = 0; i <= ORBIT_POINTS; i++) {
        const date = new Date(now.getTime() + i * step);
        const point = propagateToLatLng(date);

        if (point) {
            points.push([point.latitude, point.longitude]);
        }
    }

    if (orbitLine) {
        map.removeLayer(orbitLine);
    }

    orbitLine = L.polyline(splitAntimeridian(points), {
        color: "#4ddcff",
        weight: 2,
        opacity: 0.65,
        dashArray: "6 8",
        interactive: false
    }).addTo(map);
}

// -----------------------------------------------------------------------------
// 2. Ground-track history
// -----------------------------------------------------------------------------

function addTrajectoryPoint(latitude, longitude) {
    history.push({
        latitude,
        longitude,
        time: new Date()
    });

    if (history.length > TRAJECTORY_POINTS) {
        history.shift();
    }

    drawTrajectory();
}

function drawTrajectory() {
    const points = history.map(p => [p.latitude, p.longitude]);

    if (trajectoryLine) {
        map.removeLayer(trajectoryLine);
    }

    if (points.length < 2) return;

    trajectoryLine = L.polyline(splitAntimeridian(points), {
        color: "#ffffff",
        weight: 2,
        opacity: 0.35,
        interactive: false
    }).addTo(map);
}

// -----------------------------------------------------------------------------
// 3. Antimeridian-safe lines
// -----------------------------------------------------------------------------

function splitAntimeridian(points) {
    const segments = [];
    let current = [];

    for (let i = 0; i < points.length; i++) {
        const point = points[i];

        if (current.length > 0) {
            const previous = current[current.length - 1];

            if (Math.abs(point[1] - previous[1]) > 180) {
                if (current.length > 1) segments.push(current);
                current = [];
            }
        }

        current.push(point);
    }

    if (current.length > 1) segments.push(current);

    // Leaflet accepts a nested array as MultiPolyline.
    return segments.length > 1 ? segments : points;
}

// -----------------------------------------------------------------------------
// 4. Earth day/night terminator
// -----------------------------------------------------------------------------
//
// This is a visual approximation based on the solar declination and subsolar
// longitude. It is deliberately kept client-side so the project remains static.

function solarSubpoint(date) {
    const jd = date.getTime() / 86400000 + 2440587.5;
    const n = jd - 2451545.0;

    const meanLongitude = (280.460 + 0.9856474 * n) % 360;
    const meanAnomaly = ((357.528 + 0.9856003 * n) % 360) *
        Math.PI / 180;

    const eclipticLongitude =
        meanLongitude +
        1.915 * Math.sin(meanAnomaly) +
        0.020 * Math.sin(2 * meanAnomaly);

    const obliquity = (23.439 - 0.0000004 * n) * Math.PI / 180;
    const lambda = eclipticLongitude * Math.PI / 180;

    const declination = Math.asin(
        Math.sin(obliquity) * Math.sin(lambda)
    );

    const rightAscension = Math.atan2(
        Math.cos(obliquity) * Math.sin(lambda),
        Math.cos(lambda)
    );

    const gmst = satellite.gstime(date);
    const subsolarLongitude =
        satellite.radiansToDegrees(rightAscension - gmst);

    return {
        latitude: satellite.radiansToDegrees(declination),
        longitude: ((subsolarLongitude + 540) % 360) - 180
    };
}

function drawTerminator() {
    if (terminatorLayer) {
        map.removeLayer(terminatorLayer);
    }

    const sun = solarSubpoint(new Date());
    const latSun = sun.latitude * Math.PI / 180;

    const points = [];

    // Great-circle day/night boundary approximation.
    for (let lon = -180; lon <= 180; lon += 2) {
        const lonDifference =
            (lon - sun.longitude) * Math.PI / 180;

        const latitude = Math.atan(
            -Math.cos(lonDifference) /
            Math.tan(latSun)
        ) * 180 / Math.PI;

        points.push([latitude, lon]);
    }

    terminatorLayer = L.polygon(
        [
            points,
            [
                [90, 180],
                [90, -180]
            ]
        ],
        {
            stroke: false,
            fillColor: "#02050a",
            fillOpacity: 0.28,
            interactive: false
        }
    ).addTo(map);
}

// -----------------------------------------------------------------------------
// 5. Telemetry + mission information
// -----------------------------------------------------------------------------

function updateTelemetry(data) {
    const latitude = document.getElementById("latitude");
    const longitude = document.getElementById("longitude");
    const altitude = document.getElementById("altitude");
    const velocity = document.getElementById("velocity");
    const updated = document.getElementById("last-updated");

    if (latitude) latitude.textContent = Number(data.latitude).toFixed(3);
    if (longitude) longitude.textContent = Number(data.longitude).toFixed(3);
    if (altitude) altitude.textContent = Number(data.altitude).toFixed(1);
    if (velocity) {
        velocity.textContent =
            Math.round(Number(data.velocity)).toLocaleString();
    }

    if (updated) {
        updated.textContent = new Date().toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    }
}

// -----------------------------------------------------------------------------
// 6. Main update loop
// -----------------------------------------------------------------------------

async function updateISS() {
    try {
        const data = await getISSPosition();

        issMarker.setLatLng([
            Number(data.latitude),
            Number(data.longitude)
        ]);

        updateTelemetry(data);
        addTrajectoryPoint(
            Number(data.latitude),
            Number(data.longitude)
        );

        if (typeof updateCurrentRegion === "function") {
            updateCurrentRegion(
                Number(data.latitude),
                Number(data.longitude)
            );
        }

        if (window.issSatrec && typeof updateGeographicTimeline === "function") {
            updateGeographicTimeline(window.issSatrec);
        }

    } catch (error) {
        console.error("ISS API ERROR:", error);
    }
}

async function initialiseOrbitalData() {
    try {
        requireSatelliteJS();

        const tle = await getISSTLE();

        issSatrec = satellite.twoline2satrec(
            tle.line1,
            tle.line2
        );

        // Expose to visibility.js and geography.js, which need the current
        // satrec but load as independent modules.
        window.issSatrec = issSatrec;

        drawPredictedOrbit();
        drawTerminator();

        // Recalculate the prediction every minute.
        setInterval(drawPredictedOrbit, 60 * 1000);

        // Update the terminator every minute.
        setInterval(drawTerminator, 60 * 1000);

    } catch (error) {
        console.error("ORBIT INITIALISATION ERROR:", error);
    }
}

// -----------------------------------------------------------------------------
// Start
// -----------------------------------------------------------------------------

updateISS();
setInterval(updateISS, 1000);

initialiseOrbitalData();

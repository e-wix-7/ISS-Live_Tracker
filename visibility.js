// ISS TRACKER — Visibility & Pass Predictions (Phase 3)
//
// Requires satellite.js to be loaded before this file.
// Requires app.js to expose the current TLE-derived satrec on
// window.issSatrec once it has been parsed.
//
// A pass is "visible" when all three are true at the same time:
//   1. The ISS is above the observer's horizon.
//   2. The ISS itself is sunlit (not in Earth's shadow).
//   3. The observer's sky is dark enough to see it (civil twilight
//      or darker), otherwise the ISS is washed out by daylight.

const EARTH_RADIUS_KM = 6371;
const CIVIL_TWILIGHT_DEG = -6;
const MIN_PASS_ELEVATION_DEG = 10;
const PASS_SEARCH_HOURS = 72;
const PASS_SEARCH_STEP_SECONDS = 30;
const MAX_PASSES = 8;
const VISIBILITY_REFRESH_MS = 5000;
const OBSERVER_STORAGE_KEY = "iss-tracker-observer";

let observerLocation = null; // { latitude, longitude } in degrees
let lastPassSearchKey = null;

// -----------------------------------------------------------------------------
// Observer location persistence
// -----------------------------------------------------------------------------

function loadSavedObserverLocation() {
    try {
        const saved = localStorage.getItem(OBSERVER_STORAGE_KEY);
        if (!saved) return null;

        const parsed = JSON.parse(saved);

        if (
            typeof parsed.latitude === "number" &&
            typeof parsed.longitude === "number"
        ) {
            return parsed;
        }
    } catch (error) {
        console.error("OBSERVER LOCATION LOAD ERROR:", error);
    }

    return null;
}

function saveObserverLocation(location) {
    try {
        localStorage.setItem(OBSERVER_STORAGE_KEY, JSON.stringify(location));
    } catch (error) {
        console.error("OBSERVER LOCATION SAVE ERROR:", error);
    }
}

// -----------------------------------------------------------------------------
// Sun position (simplified low-precision solar ephemeris)
// -----------------------------------------------------------------------------

function sunRaDec(date) {
    const jd = date.getTime() / 86400000 + 2440587.5;
    const n = jd - 2451545.0;

    const meanLongitude = (280.460 + 0.9856474 * n) % 360;
    const meanAnomaly =
        ((357.528 + 0.9856003 * n) % 360) * Math.PI / 180;

    const eclipticLongitude =
        meanLongitude +
        1.915 * Math.sin(meanAnomaly) +
        0.020 * Math.sin(2 * meanAnomaly);

    const obliquity = (23.439 - 0.0000004 * n) * Math.PI / 180;
    const lambda = eclipticLongitude * Math.PI / 180;

    const declination = Math.asin(Math.sin(obliquity) * Math.sin(lambda));
    const rightAscension = Math.atan2(
        Math.cos(obliquity) * Math.sin(lambda),
        Math.cos(lambda)
    );

    return { declination, rightAscension };
}

function sunEciUnitVector(date) {
    const { declination, rightAscension } = sunRaDec(date);

    return {
        x: Math.cos(declination) * Math.cos(rightAscension),
        y: Math.cos(declination) * Math.sin(rightAscension),
        z: Math.sin(declination)
    };
}

// Solar elevation as seen from a given observer location — this reuses the
// same "angular distance from the subsolar point" identity as the day/night
// terminator in app.js, just solved for a fixed lat/lon instead of a curve.
function solarElevationAtObserver(date, latitudeDeg, longitudeDeg) {
    const { declination, rightAscension } = sunRaDec(date);
    const gmst = satellite.gstime(date);

    const subsolarLongitudeDeg =
        ((satellite.radiansToDegrees(rightAscension - gmst) + 540) % 360) - 180;
    const declinationDeg = satellite.radiansToDegrees(declination);

    const latRad = satellite.degreesToRadians(latitudeDeg);
    const decRad = satellite.degreesToRadians(declinationDeg);
    const hourAngleRad = satellite.degreesToRadians(
        longitudeDeg - subsolarLongitudeDeg
    );

    const sinAltitude =
        Math.sin(latRad) * Math.sin(decRad) +
        Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourAngleRad);

    return satellite.radiansToDegrees(
        Math.asin(Math.max(-1, Math.min(1, sinAltitude)))
    );
}

// -----------------------------------------------------------------------------
// Eclipse check — is the ISS itself sunlit or in Earth's shadow?
// Cylindrical shadow approximation: good enough for a visibility estimate,
// ignores penumbra tapering.
// -----------------------------------------------------------------------------

function isSatelliteSunlit(positionEci, date) {
    const sun = sunEciUnitVector(date);

    const proj =
        positionEci.x * sun.x +
        positionEci.y * sun.y +
        positionEci.z * sun.z;

    if (proj > 0) return true; // on the sunward side of Earth

    const perpX = positionEci.x - proj * sun.x;
    const perpY = positionEci.y - proj * sun.y;
    const perpZ = positionEci.z - proj * sun.z;

    const perpDistance = Math.sqrt(
        perpX * perpX + perpY * perpY + perpZ * perpZ
    );

    return perpDistance > EARTH_RADIUS_KM;
}

// -----------------------------------------------------------------------------
// Look angles + full visibility state at one instant
// -----------------------------------------------------------------------------

function getObserverGd() {
    if (!observerLocation) return null;

    return {
        longitude: satellite.degreesToRadians(observerLocation.longitude),
        latitude: satellite.degreesToRadians(observerLocation.latitude),
        height: 0.05 // km — roughly ground level
    };
}

function computeVisibilityState(satrec, observerGd, date) {
    const result = satellite.propagate(satrec, date);
    if (!result || !result.position) return null;

    const gmst = satellite.gstime(date);
    const positionEcf = satellite.eciToEcf(result.position, gmst);
    const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);

    const elevationDeg = satellite.radiansToDegrees(lookAngles.elevation);
    const azimuthDeg = satellite.radiansToDegrees(lookAngles.azimuth);

    const sunlit = isSatelliteSunlit(result.position, date);
    const sunAltDeg = solarElevationAtObserver(
        date,
        satellite.radiansToDegrees(observerGd.latitude),
        satellite.radiansToDegrees(observerGd.longitude)
    );

    const skyDark = sunAltDeg < CIVIL_TWILIGHT_DEG;
    const visible = elevationDeg > 0 && sunlit && skyDark;

    return {
        elevationDeg,
        azimuthDeg,
        rangeKm: lookAngles.rangeSat,
        sunlit,
        sunAltDeg,
        skyDark,
        visible
    };
}

// -----------------------------------------------------------------------------
// Pass prediction — steps forward in time looking for horizon crossings
// -----------------------------------------------------------------------------

function findUpcomingPasses(satrec, observerGd, startDate) {
    const passes = [];
    let current = null;

    const totalSteps = Math.floor(
        (PASS_SEARCH_HOURS * 3600) / PASS_SEARCH_STEP_SECONDS
    );
    let date = new Date(startDate.getTime());

    for (let i = 0; i <= totalSteps && passes.length < MAX_PASSES; i++) {
        const state = computeVisibilityState(satrec, observerGd, date);

        if (state && state.elevationDeg > MIN_PASS_ELEVATION_DEG) {
            if (!current) {
                current = {
                    start: new Date(date),
                    maxElevation: state.elevationDeg,
                    anyVisible: state.visible,
                    sunlitAtMax: state.sunlit
                };
            } else {
                if (state.elevationDeg > current.maxElevation) {
                    current.maxElevation = state.elevationDeg;
                    current.sunlitAtMax = state.sunlit;
                }
                if (state.visible) current.anyVisible = true;
            }
        } else if (current) {
            current.end = new Date(date);
            current.durationSeconds = Math.round(
                (current.end - current.start) / 1000
            );
            passes.push(current);
            current = null;
        }

        date = new Date(date.getTime() + PASS_SEARCH_STEP_SECONDS * 1000);
    }

    return passes;
}

function classifyPassQuality(maxElevation) {
    if (maxElevation >= 60) return "Excellent";
    if (maxElevation >= 40) return "Good";
    if (maxElevation >= 20) return "Fair";
    return "Poor";
}

function classifyPassConditions(pass) {
    if (pass.anyVisible) return "Visible against a dark sky";
    if (!pass.sunlitAtMax) return "Not visible — ISS in Earth's shadow";
    return "Not visible — daylight sky";
}

// -----------------------------------------------------------------------------
// Rendering
// -----------------------------------------------------------------------------

function formatTime(date) {
    return date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${minutes}m ${remaining}s`;
}

function renderPassList(passes) {
    const container = document.getElementById("pass-list");
    if (!container) return;

    if (!passes || passes.length === 0) {
        container.innerHTML = `
            <div class="pass-empty">
                No passes found above ${MIN_PASS_ELEVATION_DEG}° in the next ${PASS_SEARCH_HOURS} hours.
            </div>
        `;
        return;
    }

    container.innerHTML = passes.map(pass => `
        <div class="pass-card ${pass.anyVisible ? "pass-visible" : ""}">
            <div class="pass-row">
                <div>
                    <div class="telemetry-label">RISE</div>
                    <div class="telemetry-value">${formatTime(pass.start)}</div>
                </div>
                <div>
                    <div class="telemetry-label">MAX ELEV.</div>
                    <div class="telemetry-value">${pass.maxElevation.toFixed(0)}°</div>
                </div>
                <div>
                    <div class="telemetry-label">SET</div>
                    <div class="telemetry-value">${formatTime(pass.end)}</div>
                </div>
            </div>
            <div class="pass-meta">
                <span>Duration ${formatDuration(pass.durationSeconds)}</span>
                <span>${classifyPassQuality(pass.maxElevation)}</span>
            </div>
            <div class="pass-conditions">${classifyPassConditions(pass)}</div>
        </div>
    `).join("");
}

function renderCurrentVisibility(state) {
    const container = document.getElementById("visibility-status");
    if (!container) return;

    if (!state) {
        container.innerHTML = `
            <div class="telemetry-value">Set your location to see live visibility</div>
        `;
        return;
    }

    const aboveHorizon = state.elevationDeg > 0;

    let statusText = "Below horizon";
    if (state.visible) {
        statusText = "VISIBLE NOW";
    } else if (aboveHorizon) {
        statusText = state.sunlit
            ? "Above horizon — daylight"
            : "Above horizon — in shadow";
    }

    container.innerHTML = `
        <div class="telemetry-item">
            <div class="telemetry-label">ELEVATION</div>
            <div class="telemetry-value">${state.elevationDeg.toFixed(1)}°</div>
        </div>
        <div class="telemetry-item">
            <div class="telemetry-label">AZIMUTH</div>
            <div class="telemetry-value">${state.azimuthDeg.toFixed(1)}°</div>
        </div>
        <div class="telemetry-item">
            <div class="telemetry-label">STATUS</div>
            <div class="telemetry-value ${state.visible ? "status-visible" : ""}">${statusText}</div>
        </div>
    `;
}

function updateObserverLocationDisplay() {
    const label = document.getElementById("observer-location-label");
    if (label) {
        label.textContent = observerLocation
            ? `${observerLocation.latitude.toFixed(2)}°, ${observerLocation.longitude.toFixed(2)}°`
            : "Not set";
    }

    const latInput = document.getElementById("observer-lat");
    const lonInput = document.getElementById("observer-lon");

    if (observerLocation) {
        if (latInput) latInput.value = observerLocation.latitude.toFixed(4);
        if (lonInput) lonInput.value = observerLocation.longitude.toFixed(4);
    }
}

// -----------------------------------------------------------------------------
// City search (forward geocoding via Nominatim)
//
// Same rate-limit consideration as the reverse-geocoding modules: search
// only fires after the user pauses typing, and only once the query is a
// few characters long, to stay well under Nominatim's usage limits.
// -----------------------------------------------------------------------------

const CITY_SEARCH_DEBOUNCE_MS = 500;
const CITY_SEARCH_MIN_CHARS = 3;

let citySearchTimeout = null;
let citySearchAbortController = null;

async function searchCities(query) {
    if (citySearchAbortController) {
        citySearchAbortController.abort();
    }
    citySearchAbortController = new AbortController();

    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=6`,
        {
            headers: { "Accept": "application/json" },
            signal: citySearchAbortController.signal
        }
    );

    if (!response.ok) {
        throw new Error(`City search returned ${response.status}`);
    }

    return response.json();
}

function formatCityResultLabel(result) {
    const address = result.address || {};
    const place =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        result.display_name.split(",")[0];
    const region = address.state || address.region || "";
    const country = address.country || "";

    return [place, region, country].filter(Boolean).join(", ");
}

function closeCitySearchResults() {
    const container = document.getElementById("city-search-results");
    if (container) {
        container.classList.remove("open");
        container.innerHTML = "";
    }
}

function renderCityResults(results) {
    const container = document.getElementById("city-search-results");
    if (!container) return;

    if (!results || results.length === 0) {
        container.innerHTML = `<div class="city-search-empty">No matches found</div>`;
        container.classList.add("open");
        return;
    }

    container.innerHTML = results.map((result, index) => `
        <button type="button" class="city-search-result" data-index="${index}">
            ${formatCityResultLabel(result)}
        </button>
    `).join("");

    container.classList.add("open");

    container.querySelectorAll(".city-search-result").forEach(button => {
        button.addEventListener("click", () => {
            const index = parseInt(button.dataset.index, 10);
            const result = results[index];
            if (!result) return;

            setObserverLocation(parseFloat(result.lat), parseFloat(result.lon));
            closeCitySearchResults();

            const input = document.getElementById("city-search-input");
            if (input) input.value = formatCityResultLabel(result);
        });
    });
}

function initialiseCitySearch() {
    const input = document.getElementById("city-search-input");
    if (!input) return;

    input.addEventListener("input", () => {
        const query = input.value.trim();

        clearTimeout(citySearchTimeout);

        if (query.length < CITY_SEARCH_MIN_CHARS) {
            closeCitySearchResults();
            return;
        }

        citySearchTimeout = setTimeout(async () => {
            const container = document.getElementById("city-search-results");
            if (container) {
                container.innerHTML = `<div class="city-search-loading">Searching...</div>`;
                container.classList.add("open");
            }

            try {
                const results = await searchCities(query);
                renderCityResults(results);
            } catch (error) {
                if (error.name === "AbortError") return;

                console.error("CITY SEARCH ERROR:", error);
                if (container) {
                    container.innerHTML = `<div class="city-search-empty">Search failed — try again</div>`;
                }
            }
        }, CITY_SEARCH_DEBOUNCE_MS);
    });

    document.addEventListener("click", (event) => {
        if (!event.target.closest(".city-search")) {
            closeCitySearchResults();
        }
    });
}

// -----------------------------------------------------------------------------
// Orchestration
// -----------------------------------------------------------------------------

function refreshPasses(force) {
    if (!observerLocation || !window.issSatrec) return;

    const key = `${observerLocation.latitude.toFixed(2)},${observerLocation.longitude.toFixed(2)}`;
    if (!force && key === lastPassSearchKey) return;
    lastPassSearchKey = key;

    const container = document.getElementById("pass-list");
    if (container) {
        container.innerHTML = `<div class="pass-loading">Calculating upcoming passes...</div>`;
    }

    // Deferred so the loading message can paint before the search runs.
    setTimeout(() => {
        const observerGd = getObserverGd();
        const passes = findUpcomingPasses(window.issSatrec, observerGd, new Date());
        renderPassList(passes);
    }, 20);
}

function updateVisibilityStatus() {
    if (!observerLocation || !window.issSatrec) return;

    const observerGd = getObserverGd();
    const state = computeVisibilityState(window.issSatrec, observerGd, new Date());
    renderCurrentVisibility(state);
}

function setObserverLocation(latitude, longitude) {
    observerLocation = { latitude, longitude };
    saveObserverLocation(observerLocation);
    updateObserverLocationDisplay();

    const errorEl = document.getElementById("observer-form-error");
    if (errorEl) errorEl.textContent = "";

    refreshPasses(true);
    updateVisibilityStatus();
}

function useBrowserLocation() {
    const statusEl = document.getElementById("observer-location-label");

    if (!navigator.geolocation) {
        if (statusEl) statusEl.textContent = "Geolocation not supported by this browser";
        return;
    }

    if (statusEl) statusEl.textContent = "Locating...";

    navigator.geolocation.getCurrentPosition(
        (position) => {
            setObserverLocation(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
            console.error("GEOLOCATION ERROR:", error);
            if (statusEl) statusEl.textContent = "Location permission denied";
        },
        { enableHighAccuracy: false, timeout: 10000 }
    );
}

function initialiseVisibility() {
    observerLocation = loadSavedObserverLocation();
    updateObserverLocationDisplay();

    initialiseCitySearch();

    const locateButton = document.getElementById("locate-me-btn");
    if (locateButton) {
        locateButton.addEventListener("click", useBrowserLocation);
    }

    const form = document.getElementById("observer-form");
    if (form) {
        form.addEventListener("submit", (event) => {
            event.preventDefault();

            const latRaw = document.getElementById("observer-lat").value.trim();
            const lonRaw = document.getElementById("observer-lon").value.trim();

            // Accept a comma as a decimal separator (e.g. "40,4168"), not
            // just a period, since a plain number input silently rejects
            // commas in many locales instead of showing an error.
            const lat = parseFloat(latRaw.replace(",", "."));
            const lon = parseFloat(lonRaw.replace(",", "."));

            const validLat = Number.isFinite(lat) && lat >= -90 && lat <= 90;
            const validLon = Number.isFinite(lon) && lon >= -180 && lon <= 180;

            const errorEl = document.getElementById("observer-form-error");

            if (!validLat || !validLon) {
                if (errorEl) {
                    errorEl.textContent =
                        "Enter a valid latitude (-90 to 90) and longitude (-180 to 180).";
                }
                return;
            }

            if (errorEl) errorEl.textContent = "";
            setObserverLocation(lat, lon);
        });
    }

    if (observerLocation) {
        refreshPasses(true);
        updateVisibilityStatus();
    }

    setInterval(() => {
        updateVisibilityStatus();
        refreshPasses(false);
    }, VISIBILITY_REFRESH_MS);
}

document.addEventListener("DOMContentLoaded", initialiseVisibility);

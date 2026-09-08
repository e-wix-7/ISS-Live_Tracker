// ISS TRACKER — Geographic Timeline (Phase 4)
//
// Builds on countries.js: instead of reverse-geocoding only the current
// position, this samples several points along the ISS's near-future ground
// track (from SGP4 propagation) and reverse-geocodes each one, to show
// upcoming countries and cities.
//
// IMPORTANT — Nominatim usage policy:
// Public Nominatim allows roughly one request per second and asks that
// bulk/heavy usage run against a self-hosted instance or a paid provider.
// This module deliberately looks only a short distance into the future,
// spaces requests out, and only refreshes every few minutes. For a real
// deployment beyond a personal portfolio project, put a small caching
// proxy in front of this instead of calling Nominatim directly.

const GEO_TIMELINE_MINUTES_AHEAD = 40;
const GEO_TIMELINE_POINTS = 6;
const GEO_TIMELINE_UPDATE_INTERVAL = 5 * 60 * 1000;
const GEO_REQUEST_DELAY_MS = 1100;

let lastGeoTimelineUpdate = 0;
let geoTimelineRunning = false;

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function reverseGeocodePoint(latitude, longitude) {
    const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=3`,
        {
            headers: {
                "Accept": "application/json"
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Reverse geocoder returned ${response.status}`);
    }

    const data = await response.json();
    const address = data.address || {};

    return {
        country: address.country || "International waters / remote area",
        city:
            address.city ||
            address.town ||
            address.village ||
            address.municipality ||
            null
    };
}

function renderGeographicTimeline(entries) {
    const listElement = document.getElementById("geo-timeline-list");
    if (!listElement) return;

    if (!entries || entries.length === 0) {
        listElement.innerHTML = `<div class="geo-timeline-empty">No data available.</div>`;
        return;
    }

    // Collapse consecutive samples over the same country into single
    // transitions, so the list reads as "what's coming next" rather than
    // repeating the same country six times in a row.
    const transitions = [];
    for (const entry of entries) {
        const previous = transitions[transitions.length - 1];
        if (previous && previous.country === entry.country) continue;
        transitions.push(entry);
    }

    listElement.innerHTML = transitions.map(entry => `
        <div class="geo-timeline-entry">
            <div class="geo-timeline-eta">+${entry.minutesAhead} min</div>
            <div class="geo-timeline-place">
                <div class="geo-timeline-country">${entry.country}</div>
                ${entry.city ? `<div class="geo-timeline-city">${entry.city}</div>` : ""}
            </div>
        </div>
    `).join("");
}

async function updateGeographicTimeline(satrec) {
    const now = Date.now();

    if (geoTimelineRunning) return;
    if (now - lastGeoTimelineUpdate < GEO_TIMELINE_UPDATE_INTERVAL) return;
    if (!satrec || typeof satellite === "undefined") return;

    geoTimelineRunning = true;
    lastGeoTimelineUpdate = now;

    const listElement = document.getElementById("geo-timeline-list");
    if (listElement) {
        listElement.innerHTML = `<div class="geo-timeline-loading">Calculating ground track...</div>`;
    }

    try {
        const startDate = new Date();
        const stepMinutes = GEO_TIMELINE_MINUTES_AHEAD / GEO_TIMELINE_POINTS;
        const entries = [];

        for (let i = 1; i <= GEO_TIMELINE_POINTS; i++) {
            const targetDate = new Date(
                startDate.getTime() + i * stepMinutes * 60 * 1000
            );

            const result = satellite.propagate(satrec, targetDate);
            if (!result || !result.position) continue;

            const gmst = satellite.gstime(targetDate);
            const geodetic = satellite.eciToGeodetic(result.position, gmst);

            const latitude = satellite.radiansToDegrees(geodetic.latitude);
            const longitude = satellite.radiansToDegrees(geodetic.longitude);

            const place = await reverseGeocodePoint(latitude, longitude);

            entries.push({
                minutesAhead: Math.round(i * stepMinutes),
                country: place.country,
                city: place.city
            });

            if (i < GEO_TIMELINE_POINTS) {
                await delay(GEO_REQUEST_DELAY_MS);
            }
        }

        renderGeographicTimeline(entries);
    } catch (error) {
        console.error("GEOGRAPHIC TIMELINE ERROR:", error);

        if (listElement) {
            listElement.innerHTML = `<div class="geo-timeline-error">Unable to calculate ground track.</div>`;
        }
    } finally {
        geoTimelineRunning = false;
    }
}

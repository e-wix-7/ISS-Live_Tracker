// ISS TRACKER — Country / City Detection
//
// This module is intentionally separate from app.js.
// It uses the ISS latitude/longitude and a reverse-geocoding service.
//
// IMPORTANT:
// Do not call reverse geocoding every second. Use a cooldown.

const COUNTRY_UPDATE_INTERVAL = 60 * 1000;
let lastCountryLookup = 0;

async function updateCurrentRegion(latitude, longitude) {
    const now = Date.now();

    if (now - lastCountryLookup < COUNTRY_UPDATE_INTERVAL) {
        return;
    }

    lastCountryLookup = now;

    const regionElement = document.getElementById("current-region");

    if (!regionElement) return;

    regionElement.innerHTML = `
        <div class="telemetry-label">POSITION</div>
        <div class="telemetry-value">Calculating...</div>
    `;

    try {
        // This endpoint is only a starting point for development.
        // For a production portfolio project, consider adding a backend
        // cache/proxy to avoid public API rate limits.
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

        const country = address.country || "International waters / remote area";
        const city =
            address.city ||
            address.town ||
            address.village ||
            address.municipality ||
            "No nearby city";

        regionElement.innerHTML = `
            <div>
                <div class="telemetry-label">COUNTRY / REGION</div>
                <div class="telemetry-value">${country}</div>
            </div>

            <div>
                <div class="telemetry-label">NEAREST LOCALITY</div>
                <div class="telemetry-value">${city}</div>
            </div>
        `;

    } catch (error) {
        console.error("REGION LOOKUP ERROR:", error);
    }
}

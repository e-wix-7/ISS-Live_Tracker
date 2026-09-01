// ISS API


const API_URL =
    "https://api.wheretheiss.at/v1/satellites/25544";

// Create Map

const map = L.map("map", {
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
    maxZoom: 6,
    worldCopyJump: true
});

// Add Wworld map

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution:
            "&copy; OpenStreetMap contributors"

        maxZoom: 19
    }
).addTo(map);


// Create ISS icon

const issIcon = L.divIcon({

    className: "iss-marker",

    html: `
        <div class="iss-icon">
            🛰️
        </div>
    `,

    iconSize: [70, 70],

    iconAnchor: [35, 35]

});


// Create ISS marker

const issMarker = L.marker(
    [0, 0],
    {
        icon: issIcon
    }
).addTo(map);


// Get ISS position

async function getISSPosition() {

    const response =
        await fetch(API_URL);


    if (!response.ok) {

        throw new Error(
            "Failed to fetch ISS data"
        );

    }


    const data =
        await response.json();


    return data;

}


// Update ISS

async function updateISS() {

    try {

        const data =
            await getISSPosition();


        console.log(
            "ISS DATA:",
            data
        );


        // Update map

        issMarker.setLatLng([
            data.latitude,
            data.longitude
        ]);


        // Update telemetry data

        document.getElementById(
            "latitude"
        ).textContent =
            data.latitude.toFixed(3);


        document.getElementById(
            "longitude"
        ).textContent =
            data.longitude.toFixed(3);


        document.getElementById(
            "altitude"
        ).textContent =
            data.altitude.toFixed(1);


        document.getElementById(
            "velocity"
        ).textContent =
            Math.round(
                data.velocity
            ).toLocaleString();


        // Laast updated time


            const now = new Date();

        document.getElementById("last-updated").textContent =
            now.toLocaleTimeString("en-GB", {
             hour: "2-digit",
              minute: "2-digit",
              second: "2-digit"
         });


    } catch (error) {

        console.error(
            "ISS API ERROR:",
            error
        );

    }

}


// Start tracking the ISS position when the page loads
updateISS();


setInterval(
    updateISS,
    1000
);

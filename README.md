# 🛰️ ISS Live Tracker

A real-time web application that tracks the **International Space Station (ISS)** and displays its current position, orbital data, and trajectory on an interactive world map.

The project combines **JavaScript, Leaflet, REST APIs, orbital mechanics, and satellite tracking** to create an aerospace-inspired live tracking interface.

---

## 🌍 Live Tracker

The ISS position is retrieved from a live API and displayed on an interactive Leaflet map.

The tracker currently displays:

* 📍 Current ISS latitude
* 📍 Current ISS longitude
* ⛰️ Orbital altitude
* 🚀 Orbital velocity
* 🕐 Last update time
* 🛰️ Live ISS position marker
* 🛤️ Recent ISS trajectory
* 🌐 Predicted orbital path
* ☀️ Earth day/night terminator
* 📐 Orbital inclination
* 🔄 Orbital period
* 🌍 Current region information

---

## ✨ Features

### 🛰️ Real-Time ISS Tracking

The application retrieves the ISS's current position using the **Where The ISS At? API**.

The position is updated every second, allowing the ISS marker and telemetry information to move continuously across the map.

```text
Latitude
Longitude
Altitude
Velocity
Last Updated
```

---

### 🌐 Interactive World Map

The tracker uses **Leaflet.js** to display the ISS on an interactive world map.

Users can:

* Zoom in and out
* Pan around the Earth
* Follow the ISS
* View the current orbital position
* See the ISS trajectory

The map is styled to match the dark aerospace-inspired interface.

---

### 🛤️ ISS Trajectory History

The application stores recent ISS positions and draws them on the map.

This creates a visual representation of where the ISS has travelled recently.

The trajectory is updated continuously as new position data is received.

---

### 🚀 Predicted Orbital Path

The tracker uses the ISS's latest **Two-Line Element (TLE)** data together with **SGP4 orbital propagation** to estimate the ISS's future position.

The predicted orbit is displayed as a line on the map.

The system currently predicts approximately one complete ISS orbit.

```text
Current Position
       ↓
       ────────────────
     Predicted Orbit
       ────────────────
```

---

### ☀️ Day/Night Terminator

A solar-position calculation is used to estimate the boundary between the illuminated and dark sides of Earth.

This is displayed on the map as a visual day/night terminator.

This makes it possible to see whether the ISS is currently travelling over the illuminated or night side of Earth.

---

### 📊 Orbital Information

The interface includes basic orbital information about the ISS:

| Parameter      |           Value |
| -------------- | --------------: |
| Orbit Type     | Low Earth Orbit |
| Inclination    |         ~51.63° |
| Orbital Period |  ~92.96 minutes |
| NORAD ID       |           25544 |

---

### 🌍 Current Region

The project includes a separate module for identifying the country or region beneath/near the ISS.

The system uses reverse geocoding to determine geographical information from the ISS's current coordinates.

Because reverse-geocoding services have rate limits, this feature is intentionally updated much less frequently than the live ISS position.

---

## 🧠 How It Works

The application combines several technologies to calculate and display the ISS position.

```text
                    ISS
                     │
                     ▼
          ┌─────────────────────┐
          │  Live ISS API       │
          └──────────┬──────────┘
                     │
                     ▼
              Current Position
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
     Leaflet Map            Telemetry
          │
          ▼
   Current ISS Marker
          │
          ├──────────────► Trajectory History
          │
          └──────────────► Map Display


        TLE DATA
           │
           ▼
    satellite.js / SGP4
           │
           ▼
    Future ISS Positions
           │
           ▼
    Predicted Orbit
```

---

## 🛰️ Orbital Prediction

The ISS is tracked using its **NORAD catalog number: 25544**.

The application retrieves current TLE data and uses `satellite.js` to propagate the satellite's orbit.

The basic process is:

```text
TLE
 ↓
SGP4 Propagation
 ↓
ECI Coordinates
 ↓
Geodetic Coordinates
 ↓
Latitude / Longitude
 ↓
Leaflet Map
```

This allows the application to estimate where the ISS will be in the future instead of only displaying its current position.

---

## 🛠️ Technologies Used

### Frontend

* HTML5
* CSS3
* JavaScript
* Leaflet.js

### APIs & Data

* Where The ISS At? API
* CelesTrak TLE data
* OpenStreetMap
* Nominatim reverse geocoding

### Orbital Mechanics

* TLE — Two-Line Element data
* SGP4 propagation
* Earth-Centered Inertial coordinates
* Geodetic coordinates
* Greenwich Mean Sidereal Time

---

## 📁 Project Structure

```text
ISS-Live-Tracker/
│
├── index.html
│
├── style.css
│
├── phase2.css
│
├── phase3.css
│
├── app.js
│
├── countries.js
│
├── geography.js
│
├── visibility.js
│
└── README.md
```

### `index.html`

Contains the main structure of the application, including:

* Header
* Interactive map
* Telemetry panel
* Mission status
* Mission information
* Current region
* Orbital information
* Footer

### `style.css`

Contains the main visual design of the application.

### `phase2.css`

Contains additional styling for the orbital information and newer interface components.

### `app.js`

Controls the main tracking system.

It handles:

* ISS API requests
* Map creation
* ISS marker
* Telemetry updates
* Trajectory history
* TLE retrieval
* SGP4 propagation
* Predicted orbit
* Day/night terminator

### `countries.js`

Contains the country/city reverse-geocoding functionality.

It is separated from the main tracking system to prevent unnecessary requests to the geocoding service.

### `geography.js`

Samples the predicted ground track a short distance into the future and reverse-geocodes each point, powering the Geographic Timeline panel — upcoming countries and cities with an ETA for each.

### `visibility.js`

Handles observer location (manual entry or browser geolocation, saved locally), live visibility status (elevation, azimuth, whether the ISS is currently visible), and upcoming pass predictions with rise/set times, max elevation, duration, and visibility quality.

---

## 🚀 Running the Project

Because the project is entirely frontend-based, it can be run using a simple local web server.

### Option 1 — VS Code Live Server

Install the **Live Server** extension in VS Code.

Then:

1. Open the project folder.
2. Open `index.html`.
3. Right-click the file.
4. Select **Open with Live Server**.

---

### Option 2 — Python

From the project directory:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

---

## 🌐 Deployment

The project can be deployed using **GitHub Pages** because it is a static web application.

Basic deployment process:

```text
Create GitHub repository
        ↓
Upload project files
        ↓
Push changes
        ↓
Enable GitHub Pages
        ↓
Select main branch
        ↓
Website deployed
```

---

## 🗺️ Development Roadmap

The project is being developed progressively.

### ✅ Phase 1 — Basic Tracking

* [x] Create webpage
* [x] Create dark aerospace-style interface
* [x] Add Leaflet map
* [x] Connect to ISS API
* [x] Display live ISS position
* [x] Add latitude
* [x] Add longitude
* [x] Add altitude
* [x] Add velocity
* [x] Add last updated time
* [x] Add responsive layout

---

### 🚀 Phase 2 — Orbital Visualization

* [x] Retrieve ISS TLE
* [x] Add satellite.js
* [x] Implement SGP4 propagation
* [x] Draw predicted orbital path
* [x] Add trajectory history
* [x] Add Earth day/night terminator
* [x] Add orbital information
* [ ] Improve country/city detection

---

### 🌍 Phase 3 — ISS Visibility

* [x] User location selection
* [x] ISS visibility calculations
* [x] Upcoming ISS passes
* [x] Rise and set times
* [x] Maximum elevation
* [x] Pass duration
* [x] Visibility quality
* [x] Day/night visibility conditions

---

### 🌎 Phase 4 — Geographic Information

* [x] Current country
* [x] Nearest city
* [x] Upcoming countries
* [x] Upcoming cities
* [x] Ground-track predictions
* [x] Geographic timeline
* [x] Location information panel

---

### 🛰️ Phase 5 — Multiple Spacecraft

The tracker will eventually support additional satellites.

Potential spacecraft include:

* ISS
* Hubble Space Telescope
* James Webb Space Telescope
* Starlink satellites
* Earth-observation satellites
* Weather satellites

A satellite selector will allow users to switch between spacecraft.

---

### 🎨 Phase 6 — Aerospace Visualization

Future improvements:

* [ ] More detailed aerospace-style map
* [ ] Improved Earth visualization
* [ ] Orbit inclination visualization
* [ ] Ground-track styling
* [ ] Satellite information cards
* [ ] Better orbital indicators
* [ ] Improved animations
* [ ] More advanced telemetry displays

---

### 📱 Phase 7 — Mobile

The interface will be further optimized for smaller screens.

Planned improvements:

* [ ] Mobile-first map layout
* [ ] Collapsible telemetry panels
* [ ] Touch-friendly controls
* [ ] Smaller telemetry cards
* [ ] Improved map height
* [ ] Mobile satellite selector
* [ ] Better portrait layout

---

## 🔬 Future Possibilities

Once the core tracker is complete, the project could be expanded into a much larger satellite-tracking application.

Potential future features include:

### 🛰️ Satellite Database

Store information about thousands of satellites:

```text
Satellite
├── Name
├── NORAD ID
├── Country
├── Operator
├── Launch Date
├── Orbit
└── Mission
```

### 📈 Orbital Analytics

Display:

* Orbital period
* Inclination
* Apogee
* Perigee
* Eccentricity
* Orbital velocity
* Ground-track speed

### 🌌 3D Visualization

A future version could use WebGL or Three.js to create a 3D Earth and display satellites orbiting around it.

---

## 🎯 Project Goals

The main goal of this project is to build a practical aerospace software project that combines:

**Programming + Web Development + APIs + Orbital Mechanics + Data Visualization**

Rather than simply displaying the ISS's current location, the project is being developed into a complete interactive satellite-tracking system.

---

## 📚 Resources

### ISS Data

Where The ISS At? API:

https://api.wheretheiss.at/

### Satellite Orbital Data

CelesTrak:

https://celestrak.org/

### Orbital Propagation

Satellite.js:

https://github.com/shashwatak/satellite-js

### Mapping

Leaflet:

https://leafletjs.com/

OpenStreetMap:

https://www.openstreetmap.org/

### Reverse Geocoding

Nominatim:

https://nominatim.org/

---

## 👩‍💻 Author

**Emma Wix Montes**

Aerospace Engineering student interested in:

* Aerospace engineering
* Spaceflight
* Programming
* Computer science
* Data visualization
* Satellite tracking
* Engineering projects

---

## 📄 License

This project is intended as a personal educational and portfolio project.

Data and third-party services remain subject to their respective licenses and terms of use.

---

⭐ If you find the project interesting, feel free to explore the code and follow its development as more aerospace features are added.

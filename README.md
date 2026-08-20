# ISS Live Tracker 🛰️

A real-time web application for tracking the **International Space Station (ISS)** as it orbits Earth.

The application retrieves live ISS telemetry and displays its current position on an interactive world map, providing a simple mission-control-style interface.

## Features

* 🛰️ **Live ISS Position** — Displays the current location of the ISS on a world map.
* 🌍 **Interactive Map** — Pan and zoom around the Earth using Leaflet.
* 📍 **Latitude & Longitude** — Shows the ISS's current geographic coordinates.
* ⛰️ **Altitude** — Displays the current altitude in kilometres.
* 🚀 **Velocity** — Displays the ISS's current orbital velocity.
* 🟢 **Live Status** — Indicates that the tracker is receiving live data.
* 🕐 **Last Updated** — Shows the time of the most recent data update.
* 🔄 **Automatic Updates** — Refreshes ISS data every 5 seconds.
* 🌌 **Dark Interface** — Aerospace-inspired dark interface designed for readability.

## Technologies

* **HTML5** — Page structure
* **CSS3** — Interface styling and animations
* **JavaScript** — Application logic and API integration
* **Leaflet.js** — Interactive mapping
* **Where The ISS At? API** — Live ISS telemetry

## How It Works

The application requests the current ISS position from the Where The ISS At? API:

```javascript
fetch("https://api.wheretheiss.at/v1/satellites/25544")
```

The returned data contains information such as:

* Latitude
* Longitude
* Altitude
* Velocity

JavaScript then updates the telemetry panel and moves the ISS marker to its corresponding geographic position on the Leaflet map.

The application repeats this process every **5 seconds**.

## Project Structure

```text
ISS-Live-Tracker/
│
├── index.html
├── style.css
├── script.js
│
└── assets/
```

### `index.html`

Contains the structure of the tracker, including:

* Header
* Interactive map
* Telemetry panel
* Mission status
* Mission information
* Footer

### `style.css`

Controls the visual appearance of the application, including:

* Dark aerospace theme
* Layout
* Typography
* Panels
* ISS marker
* Animations
* Responsive design

### `script.js`

Controls the application logic:

* ISS API requests
* Leaflet map initialization
* ISS marker positioning
* Telemetry updates
* Automatic refresh

## Running the Project

Clone the repository:

```bash
git clone https://github.com/e-wix-7/ISS-Live-Tracker.git
```

Open the project folder:

```bash
cd ISS-Live-Tracker
```

Then open `index.html` in a web browser.

For the best development experience, use a local development server such as **VS Code Live Server**.

## Data Source

ISS position data is provided by the **Where The ISS At? API**.

The ISS is identified by its NORAD catalog number:

```text
25544
```

## Future Improvements

Planned improvements include:

* [ ] Draw the ISS orbital ground track
* [ ] Add a predicted orbit path
* [ ] Add a day/night Earth terminator
* [ ] Add ISS visibility information
* [ ] Display upcoming countries and cities below the ISS
* [ ] Add orbital altitude and inclination information
* [ ] Add an ISS trajectory history
* [ ] Add a more detailed aerospace-style map
* [ ] Add satellite tracking for additional spacecraft
* [ ] Improve mobile responsiveness

## Purpose

This project was created as a practical web development and aerospace project, combining **JavaScript, APIs, geographic visualization, and real-time data** into an interactive application.

It is intended as a portfolio project demonstrating the ability to work with external APIs, dynamic data, interactive maps, and responsive front-end development.

## License

This project is available for educational and portfolio purposes.

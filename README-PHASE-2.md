# ISS Live Tracker — Next-Step Files

These files are designed to extend the existing ISS tracker without replacing
your current HTML/CSS structure.

## Files

- `app.js`
  - Keeps your live ISS API.
  - Adds current ISS position.
  - Downloads the current ISS TLE from CelesTrak.
  - Uses `satellite.js`/SGP4 to predict the orbit.
  - Draws a predicted orbital path.
  - Stores and draws recent trajectory history.
  - Draws a day/night terminator approximation.
  - Keeps your 1-second telemetry update.

- `phase2.css`
  - Adds styling for orbital-information panels.

- `index-additions.html`
  - Shows exactly what to add to your existing `index.html`.

- `countries.js`
  - Separate foundation for country/city detection.
  - It is intentionally not automatically loaded by `app.js` yet.

## Installation

### 1. Add satellite.js

Before `app.js`:

```html
<script src="https://unpkg.com/satellite.js@7.1.0/dist/satellite.min.js"></script>
<script src="app.js"></script>
```

### 2. Add the phase 2 CSS

After your existing `style.css`:

```html
<link rel="stylesheet" href="phase2.css">
```

### 3. Replace your old JavaScript

Use `app.js` instead of the current JavaScript file.

### 4. Add the HTML from `index-additions.html`

The orbital panel can be placed below your existing `<main>` content.

## What is implemented now

### Predicted orbit

CelesTrak provides current General Perturbations/TLE data. The ISS is
NORAD catalog number 25544. `satellite.js` propagates the TLE using SGP4.

The prediction covers approximately one ISS orbit (~95 minutes).

### Trajectory history

The application keeps the most recent position samples and draws them as a
ground-track line behind the ISS.

### Day/night terminator

A client-side solar-position calculation generates a visual approximation of
the day/night boundary.

## Important

The current country/city module is deliberately separated because reverse
geocoding should not run once per second.

The next modules should be:

1. Proper country/city detection with throttling.
2. ISS visibility/pass calculations for a selected observer.
3. Orbital statistics from the current TLE.
4. Satellite selector and additional spacecraft.
5. Better mobile layout.
6. A more detailed basemap and visual layers.

## Sources

CelesTrak:
https://celestrak.org/

Satellite.js:
https://www.npmjs.com/package/satellite.js

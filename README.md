# L.U.C.I.D. — Laser-Ultraviolet Cyanobacteria-concentration Identification and Detection

L.U.C.I.D. is an optical sensing device that detects and quantifies cyanobacteria (blue-green algae) in water samples before they become visible harmful algal blooms (HABs). HABs deplete oxygen in aquatic ecosystems, produce toxins harmful to animals and humans, and are notoriously hard to catch early — by the time algae are visible to the eye, it's often too late to act. L.U.C.I.D. gives early, quantitative warning by measuring the unique fluorescence "fingerprint" of cyanobacteria.

## How It Works

1. **Excitation** — A 405 nm UV laser is directed through a beamsplitter onto the water sample. One arm of the beamsplitter feeds a photodiode to monitor laser power stability; the other excites the sample.
2. **Fluorescence** — Cyanobacteria fluoresce around 620–650 nm, while green algae (which contain mostly chlorophyll) fluoresce around 665–690 nm — a ~30 nm spectral separation that's enough to tell the two apart.
3. **Spectral capture** — The emitted light passes through a long-pass filter (to block excitation noise) and a focusing lens onto a diffraction grating, which spatially spreads the light by wavelength onto an image sensor.
4. **Image processing** — A Raspberry Pi 5 paired with an Arducam OV5647 CMOS sensor captures the resulting spectral image. A Python pipeline (Picamera2 + OpenCV + NumPy/Matplotlib) isolates the relevant spectral region, locates the fluorescence peak, and maps pixel position to wavelength.
5. **Concentration estimate** — Peak intensity is run through a calibration model (linear/quadratic regression built from known-concentration reference samples) to estimate cyanobacteria concentration and classify the sample.
6. **Real-time reporting** — Results (intensity profile, peak wavelength, estimated concentration, classification) are pushed to a Firebase Realtime Database, which a web front end listens to and updates live — so the spectrum chart, detection alerts, and readings all update in real time as tests run.

## System Architecture

The software is organized in three tiers:

- **Embedded layer** — An ESP32-S3 handles low-level analog sensor readings and drives supporting electronics (laser, photodiode).
- **Communication layer** — Devices connect to Firebase over Wi-Fi for fast, reliable real-time data sync.
- **Application layer** — A responsive web app subscribes to Firebase Realtime Database updates via event listeners, so the UI reflects new readings instantly without polling.

The Raspberry Pi 5 serves as the system's high-level compute unit: it acquires images, runs the spectral analysis pipeline, listens for commands from the website via Firebase, and uploads results back for live monitoring.

## Key Components

| Component | Role |
|---|---|
| 405 nm UV laser diode | Induces fluorescence in the sample |
| 50/50 beamsplitter | Splits beam for power monitoring vs. sample excitation |
| Diffraction grating | Spatially separates fluorescence by wavelength |
| Raspberry Pi 5 | High-level processing: image capture, spectral analysis, cloud sync |
| Arducam OV5647 (CMOS sensor) | Captures the dispersed fluorescence spectrum as an image |
| ESP32-S3 | Low-level sensor timing/control and Firebase relay |
| Firebase Realtime Database | Live, event-driven sync between device and web app |
| Python (Picamera2, OpenCV, NumPy, Matplotlib) | Camera control, image processing, wavelength mapping, calibration |

## Results

The system successfully detected cyanobacteria at concentrations as low as 0.25 mg/mL, resolving the ~30 nm spectral separation between cyanobacteria (peak ~620–650 nm) and green algae (peak ~665–690 nm) needed to tell them apart.

## Team

Built as a senior design project (College of Optics and Photonics / Dept. of Electrical and Computer Engineering, Group 5, Spring/Summer 2025) by Max Baryshnikov (Photonics), Nicholas Drennen (Photonics), Luis Rodriguez-Rivera (Computer Engineering), and Sean Waddell (Electrical Engineering), advised by Dr. Aravinda Kar and Dr. Lei Wei.

Website Hosted on Firebase + Realtime Database connection to UI for dynamic testing
url: https://lucid-d30e0.web.app/

PC Dimensions:
<img width="1794" height="1257" alt="image" src="https://github.com/user-attachments/assets/9a2ce8c7-40b2-4d6b-a9dd-f54d630cf4a9" />

Phone Dimensions:
<img width="331" height="721" alt="image" src="https://github.com/user-attachments/assets/e8c75679-d725-4ea4-952c-960deca7486f" />

Spirulina Powder Sample Fluorescence 
1mg sample:
<img width="770" height="400" alt="image" src="https://github.com/user-attachments/assets/eefa6f54-f729-4400-8a1c-af9d078840df" />

0.5mg 
<img width="767" height="397" alt="image" src="https://github.com/user-attachments/assets/93bb1f6e-f88f-4d7b-8d5d-1115191c25b8" />

0.25mg
<img width="769" height="402" alt="image" src="https://github.com/user-attachments/assets/48556809-2f31-449a-a564-6091ed7065cf" />

0.125mg
<img width="763" height="398" alt="image" src="https://github.com/user-attachments/assets/5f991acd-4c08-4c29-83b1-57595db3fd43" />

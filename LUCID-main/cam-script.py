import cv2
from picamera2 import Picamera2
import time
import numpy as np
import matplotlib.pyplot as plt
from numpy.polynomial import Polynomial
import firebase_admin
from firebase_admin import credentials, db

# === Firebase Setup ===
cred = credentials.Certificate(
    "/home/wechno/Documents/Pi-Cam-2/lucid-d30e0-firebase-adminsdk-fbsvc-c110c93325.json"
)
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://lucid-d30e0-default-rtdb.firebaseio.com/'
})

# Define ROI
roi_x, roi_y, roi_w, roi_h = 940, 755, 830, 15

def listening():
    print("\n[IDLE] Listening for start_test command…")
    ref = db.reference("commands/start_test")
    while True:
        cmd = ref.get()
        if isinstance(cmd, dict) and cmd.get("start"):
            label = cmd.get("label", "unnamed_sample").strip()
            n_shots = int(cmd.get("sampling_rate", 5))
            ref.set(False)  # reset
            print(f"[RUNNING] Capturing {n_shots} shot(s) for sample '{label}'")
            return label, n_shots
        time.sleep(1)

def calibrate_intensity(intensity, detection):
    # Example quadratic roots logic:
    coeffs = [104.67, 124, -58.667]
    p = Polynomial(coeffs)
    roots = (p - intensity).roots()
    valid = [r.real for r in roots if r.imag == 0 and 0 <= r.real <= 5]

    if detection == "Green Algae":
        return 0.0, "Green Algae"
    if intensity < 170 and len(valid) >= 1:
        return valid[0], "Quadratic (root 1)"
    if 170 <= intensity <= 180 and len(valid) >= 2:
        return valid[1], "Quadratic (root 2)"
    if intensity > 180:
        return (intensity - 118) / 70.286, "Linear"
    return None, "Invalid"

while True:
    sample_label, n_shots = listening()

    # --- initialize camera once per test ---
    picam2 = Picamera2()
    picam2.configure(picam2.create_preview_configuration(
        main={"format": "RGB888", "size": (1920, 1080)}
    ))
    picam2.start()
    picam2.set_controls({
        "Saturation": 0.0,
        "ExposureTime": 50000,
        "AeEnable": False,
        "AwbEnable": False,
        "AnalogueGain": 5.0
    })
    time.sleep(1)

    peaks = []            # [(wl3, inten3), …]
    last_profile = None   # will hold the final shot’s spectrum
    last_wl3 = None

    for i in range(n_shots):
        frame = picam2.capture_array()
        roi = frame[roi_y:roi_y+roi_h, roi_x:roi_x+roi_w]
        gray = cv2.cvtColor(cv2.flip(roi,1), cv2.COLOR_BGR2GRAY)
        profile = gray[gray.shape[0]//2, :]
        last_profile = profile.copy()

        # wavelength axis
        wavelengths = 354.8 + 0.61 * np.arange(len(profile))

        # red‐peak between 625–750 nm
        mask = (wavelengths >= 625) & (wavelengths <= 750)
        idx3 = np.argmax(profile[mask])
        wl3 = wavelengths[mask][idx3]
        inten3 = profile[mask][idx3]
        peaks.append((wl3, inten3))
        print(f"  Shot {i+1}/{n_shots}: Peak @ {wl3:.1f} nm → {inten3}")
        time.sleep(1)  # wait a bit before next shot


    picam2.close()

    # --- compute averages ---
    all_wl3   = [p[0] for p in peaks]
    all_int3  = [p[1] for p in peaks]
    avg_wl3   = float(np.mean(all_wl3))
    avg_int3  = float(np.mean(all_int3))
    print(f"[AVERAGE] Peak @ {avg_wl3:.1f} nm → {avg_int3:.1f}")

    # detection based on average peak wavelength
    if avg_wl3 >= 640:
        detection = "Cyanobacteria"
    elif 665 <= avg_wl3 <= 800:
        detection = "Green Algae"
    else:
        detection = "None"

    # calibration
    selected_conc, calib_type = calibrate_intensity(avg_int3, detection)
    if selected_conc is not None:
        selected_conc = round(selected_conc, 3)

    # --- generate & save graph of the *last* spectrum ---
    graph_file = f"{sample_label}_graph.png"
    plt.figure(figsize=(10,4))
    plt.plot(wavelengths, last_profile, label="Intensity Profile")
    plt.scatter([avg_wl3], [avg_int3], color='purple',
                label=f"Avg Peak: {avg_wl3:.1f} nm")
    plt.xlabel("Wavelength (nm)")
    plt.ylabel("Intensity (0–255)")
    plt.title(f"{sample_label} — Averaged over {n_shots} shots")
    plt.grid(True); plt.legend(); plt.tight_layout()
    plt.savefig(graph_file); plt.close()
    print(f"[GRAPH] Saved {graph_file}")

    # --- send one payload ---
    payload = {
      "label":            sample_label,
      "intensity_values": [int(v) for v in last_profile],
      "wavelength":       avg_wl3,
      "fluorescence":     avg_int3,
      "detection":        detection,
      "calibration":      calib_type,
      "concentration":    selected_conc
    }
    db.reference("live_data").set(payload)
    db.reference(f"historical_data/{sample_label}").set(payload)
    print("[Firebase] Upload Complete:", payload)

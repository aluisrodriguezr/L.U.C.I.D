import cv2
from picamera2 import Picamera2
import time
import numpy as np
import matplotlib.pyplot as plt
from numpy.polynomial import Polynomial
import firebase_admin
from firebase_admin import credentials, db

# === Firebase Setup ===
cred = credentials.Certificate("/home/wechno/Documents/Pi-Cam-2/lucid-d30e0-firebase-adminsdk-fbsvc-c110c93325.json")
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://lucid-d30e0-default-rtdb.firebaseio.com/'
})

# Define ROI
roi_x, roi_y, roi_w, roi_h = 940, 755, 830, 15

def listening():
    print("\n[IDLE] Listening for start_test command........................")
    while True:
        start_cmd = db.reference("commands/start_test").get()
        if isinstance(start_cmd, dict) and start_cmd.get("start"):
            sample_label = start_cmd.get("label", "unnamed_sample").strip()
            sample_rate = int(start_cmd.get("sampling_rate", 5))
            db.reference("commands/start_test").set(False)
            print("[RUNNING] Sample Analysis for: {sample_label}................................")
            return sample_label, sample_rate
        time.sleep(1)

while True:
    sample_label, delay = listening()

    print(f"[TIMER] Adjusting for {delay} seconds...")
    time.sleep(delay)
    
    # Initialize camera
    picam2 = Picamera2()
    picam2.configure(picam2.create_preview_configuration(main={"format": "RGB888", "size": (1920, 1080)}))
    picam2.start()
    picam2.set_controls({"Saturation": 0.0, "ExposureTime": 50000, "AeEnable": False, "AwbEnable": False, "AnalogueGain": 5.0})
    time.sleep(1)

    frame = picam2.capture_array()
    picam2.close()

    roi = frame[roi_y:roi_y + roi_h, roi_x:roi_x + roi_w]
    roi_flipped = cv2.flip(roi, 1)
    gray_roi = cv2.cvtColor(roi_flipped, cv2.COLOR_BGR2GRAY)

    #picname = input("Enter filename (without extension): ")
    image_filename = f"{sample_label}.jpg"
    graph_filename = f"{sample_label}_graph.png"
    cv2.imwrite(image_filename, roi_flipped)

    profile = gray_roi[gray_roi.shape[0] // 2, :]
    wavelengths = 354.8 + 0.61 * np.arange(len(profile))

    index_640 = np.argmin(np.abs(wavelengths - 640))
    index_710 = np.argmin(np.abs(wavelengths - 710))
    intensity_640 = profile[index_640]
    intensity_710 = profile[index_710]

    violet_mask = (wavelengths >= 354) & (wavelengths <= 500)
    green_mask = (wavelengths >= 510) & (wavelengths <= 590)
    red_mask = (wavelengths >= 625) & (wavelengths <= 750)
    calib_mask = (wavelengths >= 615) & (wavelengths <= 710)

    region1_idx = np.argmax(profile[violet_mask])
    region1_wavelength = wavelengths[violet_mask][region1_idx]
    region1_intensity = profile[violet_mask][region1_idx]

    region2_idx = np.argmax(profile[green_mask])
    region2_wavelength = wavelengths[green_mask][region2_idx]
    region2_intensity = profile[green_mask][region2_idx]

    region3_idx = np.argmax(profile[red_mask])
    region3_wavelength = wavelengths[red_mask][region3_idx]
    region3_intensity = profile[red_mask][region3_idx]

    detection_type = "None"
    if region3_wavelength >= 640:
        detection_type = "Cyanobacteria"
    if 665 <= region3_wavelength <= 800:
        detection_type = "Green Algae"

    # === Concentration Estimation
    est_concentration = (11599.25 - 0.40311288 * np.sqrt(1193026781 - (4772000 * region3_intensity))) / 15509
    conc_peak = (13100 + 0.31622776 * np.sqrt(2693904889 - (14667000 * region3_intensity))) / 14667
    coeffs = [104.67, 124, -58.667]
    p = Polynomial(coeffs)
    roots = (p - region3_intensity).roots()
    valid_x = [r.real for r in roots if r.imag == 0 and 0 <= r.real <= 5]

    selected_concentration = None
    calibration_type = "None"

    if detection_type == "Green Algae":
        selected_concentration = 0
        calibration_type = "Green Algae"
    elif region3_intensity < 170  and len(valid_x) >= 1:
        selected_concentration = valid_x[0]
        calibration_type = "Quadratic (root 1)"
    elif 170 <= region3_intensity <= 180 and len(valid_x) >= 2:
        selected_concentration = valid_x[1]
        calibration_type = "Quadratic (root 2)"
    elif region3_intensity > 180:
        selected_concentration = (region3_intensity - 118) / 70.286
        calibration_type = "Linear"
    else:
        selected_concentration = None
        calibration_type = "Invalid or no root in range"
        
    selected_concentration = round(selected_concentration, 3)
        
    # === Graph Generation
    plt.figure(figsize=(10, 4))
    plt.plot(wavelengths, profile, color='blue', label="Intensity Profile")
    plt.scatter([region1_wavelength, region2_wavelength, region3_wavelength],[region1_intensity, region2_intensity, region3_intensity], color='green', label='Detected Peaks')
    plt.axvline(x=region3_wavelength, color='purple', linestyle='--', label=f'Peak 3: {region3_wavelength:.1f} nm')
    if detection_type != "None":
        plt.text(region3_wavelength + 2, region1_intensity + 5, detection_type, color='purple')
    plt.xlabel("Wavelength (nm)")
    plt.ylabel("Intensity (0ï¿½255)")
    plt.title(f"Fluorescence Intensity - {sample_label}")
    plt.grid(True)
    plt.legend()
    plt.tight_layout()
    plt.savefig(graph_filename)
    plt.close()
    print(f"[GRAPH] Saved graph to: {graph_filename}")

    # === Send data to Firebase ===
    firebase_payload = {
        "label": sample_label,
        "intensity_values": [int(val) for val in profile],
        "fluorescence": float(region3_intensity),
        "concentration": float(selected_concentration),
        "detection": str(detection_type),
        "calibration": str(calibration_type)
        }
    db.reference("live_data").set(firebase_payload)
    db.reference(f"historical_data/{sample_label}").set(firebase_payload)
    print("[Firebase Upload Complete]")        



#!/usr/bin/env python3
"""
============================================================================
SOL Global / US-DZ Airlift & Livestock Trace System Architecture
IoT Core Simulator - Python 3 Daemon
Protocol: MQTT (AWS IoT Core / GCP IoT Core / Mosquitto Compatible)
============================================================================

Requirements:
  pip install paho-mqtt requests (optional, standard library used as fallback)

Execution:
  python3 scripts/iot_simulator.py
  python3 scripts/iot_simulator.py --interval 2 --heatwave
"""

import sys
import time
import json
import random
import datetime
import urllib.request
import urllib.error

# Check for paho-mqtt
try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except ImportError:
    MQTT_AVAILABLE = False

# Default parameters
BROKER_URL = "broker.emqx.io"
BROKER_PORT = 1883
INTERVAL_SEC = 3.0
HEATWAVE_MODE = "--heatwave" in sys.argv
INGEST_URL = "http://localhost:3000/api/iot/ingest"

for i, arg in enumerate(sys.argv):
    if arg == "--interval" and i + 1 < len(sys.argv):
        INTERVAL_SEC = float(sys.argv[i + 1])
    elif arg.startswith("--interval="):
        INTERVAL_SEC = float(arg.split("=")[1])
    elif arg.startswith("--broker="):
        BROKER_URL = arg.split("=")[1]


def calculate_thi(temp_c: float, rh_pct: float) -> float:
    """
    Veterinary Temperature-Humidity Index formula:
    THI = (1.8 * T + 32) - ((0.55 - 0.0055 * RH) * (1.8 * T - 26))
    """
    T = temp_c
    RH = rh_pct
    thi = (1.8 * T + 32.0) - ((0.55 - 0.0055 * RH) * (1.8 * T - 26.0))
    return round(thi, 2)


COLLARS = [
    {"rfid": "RFID-CTL-9021", "name": "Texas Queen #21", "wilaya": "Adrar", "baseTemp": 39.2, "baseAmbient": 38.5, "baseHumidity": 18, "baseHr": 72},
    {"rfid": "RFID-CTL-9022", "name": "Lone Star Beladi #22", "wilaya": "Adrar", "baseTemp": 38.9, "baseAmbient": 39.0, "baseHumidity": 16, "baseHr": 68},
    {"rfid": "RFID-CTL-9023", "name": "Rio Grande Atlas #23", "wilaya": "Biskra", "baseTemp": 38.7, "baseAmbient": 34.0, "baseHumidity": 28, "baseHr": 70},
    {"rfid": "RFID-CTL-9024", "name": "Pecos Pride #24", "wilaya": "Mila", "baseTemp": 38.5, "baseAmbient": 26.5, "baseHumidity": 45, "baseHr": 64},
]

SOIL_ZONES = [
    {"zone": "adrar_pivot_alfalfa", "nameAr": "حقل البرسيم الحجازي - أدرار", "crop": "Alfalfa (برسيم حجازي)", "wilaya": "Adrar", "baseVwc": 22.5, "baseEc": 1.85, "baseTemp": 24.2, "depth": 30},
    {"zone": "biskra_silage_corn", "nameAr": "حوض سيلاج الذرة - بسكرة", "crop": "Corn Silage (سيلاج ذرة)", "wilaya": "Biskra", "baseVwc": 28.4, "baseEc": 1.42, "baseTemp": 22.8, "depth": 45},
    {"zone": "mila_pasture_alpha", "nameAr": "مراعي الهضاب العليا - ميلة", "crop": "High Plains Pasture", "wilaya": "Mila", "baseVwc": 34.2, "baseEc": 0.95, "baseTemp": 19.5, "depth": 20},
]


def post_to_ingest_api(payload_dict):
    try:
        data = json.dumps(payload_dict).encode("utf-8")
        req = urllib.request.Request(
            INGEST_URL,
            data=data,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            pass
    except Exception:
        pass


def main():
    print("=" * 64)
    print("🌾 SOL GLOBAL • US-DZ LIVESTOCK & SOIL IoT SIMULATOR (PYTHON 3)")
    print("=" * 64)
    print(f"[Config] Interval: {INTERVAL_SEC}s | Heatwave Mode: {'ON 🔥' if HEATWAVE_MODE else 'OFF ❄'}")
    print(f"[Config] MQTT Status: {'paho-mqtt Loaded' if MQTT_AVAILABLE else 'MQTT Module not installed (using HTTP stream)'}")
    print(f"[Config] Target Broker: {BROKER_URL}:{BROKER_PORT}")
    print(f"[Config] Local Ingestion Target: {INGEST_URL}")
    print("-" * 64)

    client = None
    if MQTT_AVAILABLE:
        try:
            client = mqtt.Client(client_id=f"sol-py-sim-{random.randint(1000, 9999)}")
            client.connect(BROKER_URL, BROKER_PORT, 60)
            client.loop_start()
            print(f"[MQTT] Connected successfully to {BROKER_URL}:{BROKER_PORT}")
        except Exception as e:
            print(f"[MQTT] Warning: Could not connect to broker ({e}), proceeding with HTTP.")

    tick = 0
    try:
        while True:
            tick += 1
            now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
            print(f"\n--- [IoT Tick #{tick}] {now_iso} ---")

            # 1. Smart Collars Telemetry
            for c in COLLARS:
                heat_boost = 7.0 if HEATWAVE_MODE else 0.0
                ambient_t = round(c["baseAmbient"] + (random.random() - 0.48) * 1.5 + heat_boost, 1)
                humidity = round(max(10.0, min(85.0, c["baseHumidity"] + (random.random() - 0.5) * 2)), 1)

                thi = calculate_thi(ambient_t, humidity)
                is_alert = thi >= 75.0

                body_temp = round(c["baseTemp"] + (0.6 + (thi - 75.0) * 0.1 if is_alert else (random.random() - 0.5) * 0.2), 2)
                heart_rate = int(c["baseHr"] + (18 + (thi - 75.0) * 2 if is_alert else (random.random() - 0.5) * 4))

                if is_alert:
                    activity = "heat_stressed_lethargic"
                else:
                    r = random.random()
                    activity = "grazing" if r < 0.4 else "rumination" if r < 0.75 else "resting"

                collar_data = {
                    "deviceId": f"COLLAR-{c['rfid'].replace('RFID-CTL-', '')}",
                    "rfidTag": c["rfid"],
                    "cowName": c["name"],
                    "wilaya": c["wilaya"],
                    "timestamp": now_iso,
                    "bodyTempC": body_temp,
                    "ambientTempC": ambient_t,
                    "relativeHumidityPct": humidity,
                    "thiIndex": thi,
                    "activityState": activity,
                    "heartRateBpm": heart_rate,
                    "coolingAlertActive": is_alert,
                    "coolingIntervention": {
                        "tunnelFanSpeedPct": 100 if is_alert else 75 if thi >= 70 else 45,
                        "sprinklerIntervalMinutes": 3 if is_alert else 15,
                        "mistingActive": is_alert,
                        "rumenBufferSupplementGrams": 280 if is_alert else 180,
                    },
                }

                topic = f"sol/iot/livestock/{c['rfid']}/telemetry"
                if client:
                    client.publish(topic, json.dumps(collar_data), qos=1)

                post_to_ingest_api({"topic": topic, "type": "collar", "data": collar_data})

                status_tag = "🚨 [COOLING ALERT THI>=75]" if is_alert else "✅ [COMFORT]"
                print(f"🐄 [{c['rfid']}] Amb: {ambient_t}°C | RH: {humidity}% | Body: {body_temp}°C | THI: {thi} {status_tag}")

            # 2. Soil TDR Telemetry
            for s in SOIL_ZONES:
                vwc = round(max(8.0, min(45.0, s["baseVwc"] + (random.random() - 0.5) * 0.8)), 1)
                ec = round(max(0.3, s["baseEc"] + (random.random() - 0.5) * 0.06), 2)
                root_t = round(s["baseTemp"] + (random.random() - 0.5) * 0.4, 1)

                if vwc < 20.0:
                    irr_status = "DEFICIT_IRRIGATE_NOW"
                    water_req = 45
                elif vwc > 38.0:
                    irr_status = "SATURATED_REST"
                    water_req = 0
                else:
                    irr_status = "OPTIMAL"
                    water_req = 15

                soil_data = {
                    "sensorId": f"TDR-{s['zone'].upper()[:10]}",
                    "zoneId": s["zone"],
                    "zoneNameAr": s["nameAr"],
                    "cropType": s["crop"],
                    "wilaya": s["wilaya"],
                    "depthCm": s["depth"],
                    "timestamp": now_iso,
                    "vwcPct": vwc,
                    "ecDsM": ec,
                    "rootZoneTempC": root_t,
                    "irrigationStatus": irr_status,
                    "recommendedWaterM3Ha": water_req,
                }

                topic = f"sol/iot/soil/{s['zone']}/tdr"
                if client:
                    client.publish(topic, json.dumps(soil_data), qos=1)

                post_to_ingest_api({"topic": topic, "type": "soil", "data": soil_data})

                print(f"🌱 [{s['zone']}] Crop: {s['crop']} | VWC: {vwc}% | EC: {ec} dS/m | Root: {root_t}°C | Status: {irr_status}")

            time.sleep(INTERVAL_SEC)
    except KeyboardInterrupt:
        print("\n[Simulator] Terminated by user. Exiting cleanly...")
        if client:
            client.loop_stop()
            client.disconnect()


if __name__ == "__main__":
    main()

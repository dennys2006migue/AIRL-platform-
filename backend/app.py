import os
import time
import eventlet
eventlet.monkey_patch() 

from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from openai import OpenAI

# ====== LAB: almacenamiento simple en memoria ======
from collections import deque
import csv
from io import StringIO
from time import time


# -------- Cargar variables de entorno primero --------
load_dotenv()

# -------- Config IA (opcional; si no hay API key, queda en demo) --------
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# -------- App Flask + Socket.IO --------
app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET", "dev-secret")
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

STATE = {
    "esp32_connections": 0,
    "current_expression": "INICIO",
}

# -------- Rutas HTTP --------
LAB_STATE = {
    "session_active": False,
    "session_id": None,
    "started_at": None,
    "scenario": None,            # e.g., "MRU", "MRUA", "LED_TEST"
    "params": {},                # dict de parámetros del escenario
}
LAB_DATA = deque(maxlen=5000)    # buffer circular de telemetría/acciones

def _now():
    return int(time()*1000)

@app.route("/lab/session/start", methods=["POST"])
def lab_session_start():
    data = request.get_json(force=True) or {}
    scenario = data.get("scenario") or "CUSTOM"
    params = data.get("params") or {}
    LAB_STATE.update({
        "session_active": True,
        "session_id": f"lab_{_now()}",
        "started_at": _now(),
        "scenario": scenario,
        "params": params
    })
    # marca en la traza
    LAB_DATA.append({
        "ts": _now(), "type": "event", "event": "session_start",
        "scenario": scenario, "params": params
    })
    return {"ok": True, "state": LAB_STATE}

@app.route("/lab/session/stop", methods=["POST"])
def lab_session_stop():
    if LAB_STATE["session_active"]:
        LAB_DATA.append({"ts": _now(), "type": "event", "event": "session_stop"})
    LAB_STATE["session_active"] = False
    return {"ok": True, "state": LAB_STATE}

@app.route("/lab/ingest", methods=["POST"])
def lab_ingest():
    """
    Espera JSON de telemetría/acciones, p.ej.:
    { "device_id":"robot-001", "kind":"telemetry",
      "data": {"temp":24.5,"rssi":-60}, "ts": 1724000000000 }
    """
    item = request.get_json(force=True) or {}
    item.setdefault("ts", _now())
    item.setdefault("type", "telemetry")
    LAB_DATA.append(item)
    return {"ok": True, "n": len(LAB_DATA)}

@app.route("/lab/last")
def lab_last():
    # últimos N items
    N = int(request.args.get("n", 100))
    return {"ok": True, "items": list(LAB_DATA)[-N:]}

@app.route("/lab/export")
def lab_export():
    # Exporta CSV simple (ts,type,device_id,kind,data_json)
    si = StringIO()
    writer = csv.writer(si)
    writer.writerow(["ts","type","device_id","kind","payload"])
    for it in LAB_DATA:
        writer.writerow([
            it.get("ts"),
            it.get("type"),
            it.get("device_id",""),
            it.get("kind",""),
            it.get("data", it.get("event", "")),
        ])
    csv_bytes = si.getvalue().encode("utf-8")
    # Respuesta como archivo
    from flask import Response
    return Response(
        csv_bytes,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=lab_data.csv"}
    )

@app.route("/")
def root():
    return "AIPL backend OK. Endpoints: /health, /get_status, /edu/solve"

@app.route("/debug/ia")
def debug_ia():
    return {
        "ia_env_present": bool(os.getenv("OPENAI_API_KEY")),
        "client_initialized": client is not None,
        "model": os.getenv("OPENAI_MODEL", "")
    }

@app.route("/health")
def health():
    return {"ok": True, "ts": time.time()}

@app.route("/get_status")
def get_status():
    return {
        "esp32_connections": STATE["esp32_connections"],
        "server_active": True,
        "current_expression": STATE["current_expression"],
    }

@app.route("/edu/solve", methods=["POST"])
def edu_solve():
    data = request.get_json(force=True) or {}
    problem = (data.get("problem") or "").strip()
    subject = (data.get("subject") or "matemáticas").strip()

    if not problem:
        return jsonify({"success": False, "error": "Empty problem"}), 400

    # Modo demo si no hay clave de OpenAI configurada
    if not client:
        steps = [
            "Leer el enunciado",
            "Identificar datos",
            "Elegir fórmula",
            "Calcular",
            "Verificar",
        ]
        return jsonify({"success": True, "solution": {"steps": steps, "result": "(demo sin IA)"}})

    try:
        rsp = client.chat.completions.create(
            model=OPENAI_MODEL,
            temperature=0.3,
            max_tokens=350,
            messages=[
                {
                    "role": "system",
                    "content": f"Eres un profesor experto en {subject}. Explica paso a paso y con claridad.",
                },
                {"role": "user", "content": problem},
            ],
        )
        text = rsp.choices[0].message.content.strip()
        steps = [s for s in text.split("\n") if s.strip()]
        return jsonify({"success": True, "solution": {"steps": steps, "result": "✅ IA"}})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# -------- Eventos en tiempo real (Socket.IO) --------
@socketio.on("connect")
def on_connect():
    emit("server_status", {"msg": "connected", "ts": time.time()})

@socketio.on("telemetry_push")
def on_telemetry(data):
    # Reenvía a todos los clientes conectados (para la demo)
    emit("telemetry_broadcast", data, broadcast=True)

# -------- Arranque --------
if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))

import os
import time
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from openai import OpenAI

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
@app.route("/")
def root():
    return "AIPL backend OK. Endpoints: /health, /get_status, /edu/solve"

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

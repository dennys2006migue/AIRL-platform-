import os, time
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit

load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET", "dev-secret")
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

STATE = {
    "esp32_connections": 0,
    "current_expression": "INICIO"
}

@app.route("/health")
def health():
    return {"ok": True, "ts": time.time()}

@app.route("/get_status")
def get_status():
    return {
        "esp32_connections": STATE["esp32_connections"],
        "server_active": True,
        "current_expression": STATE["current_expression"]
    }

@app.route("/edu/solve", methods=["POST"])
def edu_solve():
    data = request.get_json(force=True) or {}
    problem = (data.get("problem") or "").strip()
    if not problem:
        return jsonify({"success": False, "error": "Empty problem"}), 400

    # DEMO: Respuesta simulada (luego conectamos OpenAI)
    steps = [
        "Leer el enunciado",
        "Identificar datos dados y requeridos",
        "Elegir la fórmula o procedimiento",
        "Calcular paso a paso",
        "Verificar el resultado"
    ]
    return jsonify({"success": True, "solution": {"steps": steps, "result": "(demo)"}})

# Eventos en tiempo real
@socketio.on("connect")
def on_connect():
    emit("server_status", {"msg": "connected", "ts": time.time()})

@socketio.on("telemetry_push")
def on_telemetry(data):
    # Reenvía a todos los clientes conectados (para la demo)
    emit("telemetry_broadcast", data, broadcast=True)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))

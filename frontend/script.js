// Cambia esta URL cuando tengas el backend en Render
const API_BASE = "http://localhost:8000"; // ej: https://aipl-backend.onrender.com

// -------- Estado del servidor --------
const btnStatus = document.getElementById("btn-status");
const statusBox = document.getElementById("status-box");

btnStatus.addEventListener("click", async () => {
  try {
    const res = await fetch(`${API_BASE}/get_status`);
    const data = await res.json();
    statusBox.textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    statusBox.textContent = "Error consultando /get_status\n" + e.message;
  }
});

// -------- Módulo EDU (demo) --------
const btnSolve = document.getElementById("btn-solve");
const solveBox = document.getElementById("solve-box");

btnSolve.addEventListener("click", async () => {
  const problem = document.getElementById("problem").value.trim();
  if (!problem) {
    solveBox.textContent = "Escribe un problema primero.";
    return;
  }
  solveBox.textContent = "Procesando...";
  try {
    const res = await fetch(`${API_BASE}/edu/solve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problem })
    });
    const data = await res.json();
    if (!data.success) {
      solveBox.textContent = "Error: " + (data.error || "desconocido");
      return;
    }
    const steps = data.solution.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
    solveBox.textContent = steps + "\nResultado: " + data.solution.result;
  } catch (e) {
    solveBox.textContent = "Error consultando /edu/solve\n" + e.message;
  }
});

// -------- Socket.IO + telemetría simulada --------
const telemetryList = document.getElementById("telemetry-list");
const btnStartTelemetry = document.getElementById("btn-start-telemetry");

// Conexión al socket del backend
let socket = null;
try {
  socket = io(API_BASE, { transports: ["websocket", "polling"] });
  socket.on("server_status", (msg) => {
    const item = document.createElement("li");
    item.textContent = `[server] ${new Date(msg.ts * 1000).toLocaleTimeString()} - ${msg.msg}`;
    telemetryList.prepend(item);
  });
  socket.on("telemetry_broadcast", (data) => {
    const item = document.createElement("li");
    item.textContent = `[telemetry] ${JSON.stringify(data)}`;
    telemetryList.prepend(item);
  });
} catch (e) {
  console.warn("Socket error:", e);
}

let simInterval = null;
btnStartTelemetry.addEventListener("click", () => {
  if (!socket) return;
  if (simInterval) {
    clearInterval(simInterval);
    simInterval = null;
    btnStartTelemetry.textContent = "Empezar simulación";
    return;
  }
  btnStartTelemetry.textContent = "Parar simulación";
  simInterval = setInterval(() => {
    const payload = { temp: (20 + Math.random() * 5).toFixed(2), ts: Date.now() };
    socket.emit("telemetry_push", payload);
  }, 1500);
});

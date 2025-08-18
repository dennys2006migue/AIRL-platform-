// ===================== CONFIG =====================
// Cambia esta URL si tu backend tiene otro dominio en Render
const API_BASE = "https://airl.onrender.com/";

// =================== /get_status ==================
const btnStatus = document.getElementById("btn-status");
const statusBox = document.getElementById("status-box");

btnStatus.addEventListener("click", async () => {
  statusBox.textContent = "⏳ Consultando estado…";
  try {
    const res = await fetch(`${API_BASE}/get_status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    statusBox.textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    statusBox.textContent = "⚠️ Error en /get_status\n" + e.message;
  }
});

// ================== Módulo EDU (IA) ===============
const btnSolve = document.getElementById("btn-solve");
const solveBox = document.getElementById("solve-box");
const problemEl = document.getElementById("problem");

// Placeholder con ejemplos rápidos
problemEl.placeholder =
  "Ej.: Calcula la derivada de x^2 + 3x\n" +
  "Ej.: Resuelve 2x + 5 = 17\n" +
  "Ej.: ¿Cómo convertir 25 °C a °F?";

btnSolve.addEventListener("click", async () => {
  const problem = problemEl.value.trim();
  if (!problem) {
    solveBox.textContent = "✍️ Escribe un problema primero.";
    problemEl.focus();
    return;
  }

  btnSolve.disabled = true;
  const originalText = btnSolve.textContent;
  btnSolve.textContent = "Resolviendo…";
  solveBox.textContent = "⏳ Consultando al tutor…";

  try {
    const res = await fetch(`${API_BASE}/edu/solve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problem, subject: "matemáticas" })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "respuesta no exitosa");
    }

    const steps = (data.solution?.steps || []).map((s, i) => `${i + 1}. ${s}`).join("\n");
    const result = data.solution?.result ? `\n\n${data.solution.result}` : "";
    solveBox.textContent = steps || "No se recibieron pasos.";
    solveBox.textContent += result;
  } catch (e) {
    solveBox.textContent = "⚠️ Error en /edu/solve\n" + e.message;
  } finally {
    btnSolve.disabled = false;
    btnSolve.textContent = originalText;
  }
});

// ====== Socket.IO + Telemetría (simulada) =========
const telemetryList = document.getElementById("telemetry-list");
const btnStartTelemetry = document.getElementById("btn-start-telemetry");

let socket = null;
let simInterval = null;

// Utilidad: agrega una línea y limita a 30 elementos
function addTelemetryLine(prefix, payload) {
  const li = document.createElement("li");
  li.textContent = `[${prefix}] ${
    typeof payload === "string" ? payload : JSON.stringify(payload)
  }`;
  telemetryList.prepend(li);
  while (telemetryList.children.length > 30) {
    telemetryList.removeChild(telemetryList.lastChild);
  }
}

// Conexión al socket del backend
try {
  socket = io(API_BASE, { transports: ["websocket", "polling"] });

  socket.on("connect", () => addTelemetryLine("socket", "conectado"));
  socket.on("disconnect", () => addTelemetryLine("socket", "desconectado"));

  socket.on("server_status", (msg) => {
    const t = new Date((msg.ts || Date.now() / 1000) * 1000).toLocaleTimeString();
    addTelemetryLine("server", `${t} - ${msg.msg || "ok"}`);
  });

  socket.on("telemetry_broadcast", (data) => {
    addTelemetryLine("telemetry", data);
  });
} catch (e) {
  console.warn("Socket error:", e);
  addTelemetryLine("socket", "⚠️ No fue posible conectar con Socket.IO");
}

// Botón toggle de simulación
btnStartTelemetry.addEventListener("click", () => {
  if (!socket) {
    addTelemetryLine("info", "Socket no disponible");
    return;
  }

  if (simInterval) {
    clearInterval(simInterval);
    simInterval = null;
    btnStartTelemetry.textContent = "Empezar simulación";
    addTelemetryLine("info", "Simulación detenida");
    return;
  }

  btnStartTelemetry.textContent = "Parar simulación";
  addTelemetryLine("info", "Simulación iniciada");

  simInterval = setInterval(() => {
    const payload = { temp: Number(20 + Math.random() * 5).toFixed(2), ts: Date.now() };
    socket.emit("telemetry_push", payload);
  }, 1500);
});

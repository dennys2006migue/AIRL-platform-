/* ===================== CONFIG ===================== */
const API_BASE = "https://airl.onrender.com"; // Backend Flask (Render)

/* ================== Subjects & Persona ============ */
const SUBJECTS = [
  { key: "calculo",         label: "Cálculo",           persona: "Eres experto en cálculo diferencial e integral. Explica con pasos y ejemplos." },
  { key: "fisica",          label: "Física",            persona: "Eres físico docente. Usa el SI, leyes y ejemplos prácticos." },
  { key: "algebra_lineal",  label: "Álgebra Lineal",    persona: "Eres experto en vectores, matrices y espacios vectoriales." },
  { key: "superior",        label: "Matemática Superior", persona: "Eres matemático. Razonamiento riguroso y demostraciones claras." },
  { key: "ingles",          label: "Inglés",            persona: "Eres profesor de inglés. Corrige gramática, vocabulario y da ejemplos." },
  { key: "programacion",    label: "Programación",      persona: "Eres ingeniero de software. Código claro y buenas prácticas." },
];

const SUBJECT_TO_BACKEND = {
  calculo: "cálculo",
  fisica: "física",
  algebra_lineal: "álgebra lineal",
  superior: "matemáticas",
  ingles: "inglés",
  programacion: "programación",
};

/* ===================== DOM refs ==================== */
const $           = (id) => document.getElementById(id);
const subjectsEl  = $("subjects");
const activeSubjectEl = $("active-subject");
const personaEl   = $("persona");
const quickEl     = $("quick");
const msgsEl      = $("msgs");
const inputEl     = $("input");
const btnSend     = $("btn-send");
const btnVoice    = $("btn-voice");
const voiceHint   = $("voice-hint");

/* ====== Vistas ====== */
const viewEdu  = $("view-edu")  || document.querySelector(".card"); // fallback si no hay id
const viewPair = $("view-pair"); // debe existir para Emparejar

function setActiveView(key) {
  try {
    if (!viewEdu || !viewPair) {
      console.warn("setActiveView: faltan contenedores de vista (view-edu o view-pair).");
      return;
    }
    if (key === "emparejar") {
      viewEdu.style.display  = "none";
      viewPair.style.display = "block";
    } else {
      viewEdu.style.display  = "block";
      viewPair.style.display = "none";
    }
  } catch (e) {
    console.error("Error setActiveView:", e);
  }
}
window.setActiveView = setActiveView; // para llamar desde el sidebar
setActiveView("edu");

/* ================== State ========================== */
let subject  = localStorage.getItem("aipl_subject") || "calculo";
let messages = [];

/* ================== Render Subjects ================ */
function renderSubjects() {
  if (!subjectsEl) return;
  subjectsEl.innerHTML = "";
  SUBJECTS.forEach((s) => {
    const btn = document.createElement("button");
    btn.textContent = s.label;
    btn.className = (s.key === subject ? "active" : "");
    btn.onclick = () => {
      try {
        subject = s.key;
        localStorage.setItem("aipl_subject", subject);
        renderSubjects();
        renderPersona();
        renderQuick();
        clearChat(true);
        setActiveView("edu");
      } catch (e) {
        console.error("Error cambiando asignatura:", e);
      }
    };
    subjectsEl.appendChild(btn);
  });
  if (activeSubjectEl) {
    activeSubjectEl.textContent = (SUBJECTS.find(x => x.key === subject)?.label) || "Cálculo";
  }
}

function renderPersona() {
  if (!personaEl) return;
  personaEl.textContent = SUBJECTS.find(x => x.key === subject)?.persona || "";
}

function renderQuick() {
  if (!quickEl) return;
  quickEl.innerHTML = "";
  const chipsBySubject = {
    calculo:        ["Deriva x^3", "Integra x^2", "Límites básicos"],
    fisica:         ["Explica V=IR", "MRU vs MRUA", "Energía potencial"],
    algebra_lineal: ["Multiplica matrices 2x2", "Autovalores", "Base y dimensión"],
    superior:       ["Demuestra la continuidad", "Convergencia de serie", "Topología básica"],
    ingles:         ["Past Perfect vs Past Simple", "Condicionales", "Phrasal verbs"],
    programacion:   ["Complejidad de quicksort", "Pilas y colas", "Promise vs async/await"],
  };
  (chipsBySubject[subject] || []).forEach((txt) => {
    const b = document.createElement("button");
    b.className = "subjects";
    b.style = "border:1px solid #e5e5e5;border-radius:14px;padding:6px 10px;background:#fff";
    b.textContent = txt;
    b.onclick = () => {
      if (!inputEl) return;
      inputEl.value = inputEl.value ? inputEl.value + " " + txt : txt;
      inputEl.focus();
    };
    quickEl.appendChild(b);
  });
}

function clearChat(showWelcome = true) {
  messages = [];
  if (msgsEl) {
    msgsEl.innerHTML = "";
    if (showWelcome) {
      const div = document.createElement("div");
      div.className = "muted";
      div.innerHTML  = 'Hola, soy <b>Llama Roja</b>. Cuéntame qué necesitas.';
      msgsEl.appendChild(div);
    }
  }
  if (inputEl) inputEl.value = "";
}

/* ========== KaTeX, limpieza y helpers matemáticos ========= */
function katexReady(cb) {
  if (window.katex) return cb();
  const t = setInterval(() => {
    if (window.katex) { clearInterval(t); cb(); }
  }, 50);
}
function tidyMarkdown(s) {
  return (s || "")
    .replace(/^#+\s*/gm, "")                         // ## Título -> Título
    .replace(/\*\*(.*?)\*\*/g, "$1")                 // **negrita** -> negrita
    .replace(/__([^_]+)__/g, "$1")                   // __negrita__ -> negrita
    .replace(/^\s*(\d+)\.\s*(\d+)\.\s*/gm, "$2. ")   // arregla "1. 1."
    .replace(/^\s*\d+\.\s*\\\[$/gm, "\\[")           // arregla bloques partidos
    .replace(/^\s*\d+\.\s*\\\]$/gm, "\\]")
    .trim();
}
function unescapeLatexDelimiters(s) {
  return (s || "")
    .replace(/\\\\\(/g, "\\(")
    .replace(/\\\\\)/g, "\\)")
    .replace(/\\\\\[/g, "\\[")
    .replace(/\\\\\]/g, "\\]")
    .replace(/\\\\/g, "\\");
}
function renderInlineLatex(expr) {
  try {
    return katex.renderToString(expr, { throwOnError:false, output:"html", strict:"ignore" });
  } catch { return expr; }
}
function toHeuristicLatex(text) {
  let t = text || "";
  t = t.replace(/O\(\s*[^)]+\s*\)/g, (m) => {
    let inner = m.slice(2, -1)
      .replace(/\blog\b/gi, "\\log")
      .replace(/([a-zA-Z])\^(\d+)/g, "$1^{\\$2}");
    return renderInlineLatex(`O(${inner})`);
  });
  t = t.replace(/sqrt\s*\(\s*([^)]+)\s*\)/gi, (_, a) => renderInlineLatex(`\\sqrt{${a}}`));
  t = t.replace(/\blog\s*\(?\s*([a-zA-Z0-9]+)\s*\)?/gi, (_, a) => renderInlineLatex(`\\log ${a}`));
  t = t.replace(/\b([a-zA-Z])\^(\d+)\b/g, (_, v, p) => renderInlineLatex(`${v}^{${p}}`));
  t = t.replace(/\(\s*([a-zA-Z0-9]+)\s*\/\s*([a-zA-Z0-9]+)\s*\)/g, (_, a, b) => renderInlineLatex(`\\frac{${a}}{${b}}`));
  return t;
}
function mergeMathBlocks(lines) {
  const out = [];
  let buf = null, mode = null;
  const isOpen  = (l) => /^\s*(\\\[|\$\$)\s*$/.test(l);
  const isClose = (l) => (mode==="\\[" && /^\s*\\\]\s*$/.test(l)) || (mode==="$$" && /^\s*\$\$\s*$/.test(l));
  for (const raw of (lines||[])) {
    const l = String(raw || "").trim();
    if (buf) {
      if (isClose(l)) { out.push(buf.trim()); buf=null; mode=null; }
      else { buf += "\n" + l; }
      continue;
    }
    if (isOpen(l)) { buf=""; mode = l.includes("$$") ? "$$" : "\\["; continue; }
    out.push(l);
  }
  if (buf) out.push(buf.trim());
  return out;
}
function renderMathAware(text) {
  let s = tidyMarkdown(text);
  s = unescapeLatexDelimiters(s);
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, body) => `<div class="math-block">${renderInlineLatex(body)}</div>`);
  s = s.replace(/\\\[((?:.|\n)+?)\\\]/g, (_, body) => `<div class="math-block">${renderInlineLatex(body)}</div>`);
  s = s.replace(/\\\((.+?)\\\)/g,        (_, body) => renderInlineLatex(body));
  s = s.replace(/(?<!\$)\$([^\$]+?)\$(?!\$)/g, (_, body) => renderInlineLatex(body));
  s = toHeuristicLatex(s);
  return s;
}
function renderStepHtml(s) {
  let html = renderMathAware(s);
  const hasKatex = /class="katex|class="math-block/.test(html);
  if (!hasKatex && /\\[a-zA-Z]+/.test(s || "")) {
    html = renderInlineLatex(s); // fuerza LaTeX inline
  }
  return html;
}

/* =============== Chat (usuario) ================== */
function addUserLine(text) {
  if (!msgsEl) return;
  const div = document.createElement("div");
  div.className = "msg user";
  div.textContent = text;
  msgsEl.appendChild(div);
  msgsEl.scrollTop = msgsEl.scrollHeight;
}

/* =============== Pasos dinámicos (asistente) ====== */
function renderAssistantSteps(text) {
  const wrapper = document.createElement("div");
  wrapper.className = "assistant-steps";

  let rawLines = String(text || "").split(/\n+/).map(tidyMarkdown).filter(Boolean);
  rawLines = mergeMathBlocks(rawLines);

  const steps = [];
  for (let l of rawLines) {
    l = l.replace(/^Paso\s+\d+:\s*/i, "");
    const m = l.match(/^\d+\.\s*(.*)$/);
    if (m) steps.push(m[1]);
    else if (l.startsWith("###")) steps.push(l.replace(/^#+\s*/, ""));
    else steps.push(l);
  }

  let current = 0;
  let showingAll = false;

  const stepsContainer = document.createElement("div");
  stepsContainer.className = "steps-container";
  wrapper.appendChild(stepsContainer);

  const controls = document.createElement("div");
  controls.className = "steps-controls";
  controls.innerHTML = `
    <button class="btn-prev" title="Anterior">← Anterior</button>
    <button class="btn-next" title="Siguiente">Siguiente →</button>
    <button class="btn-all"  title="Mostrar todo">Mostrar todo</button>
  `;
  wrapper.appendChild(controls);

  function render() {
    stepsContainer.innerHTML = "";
    if (!steps.length) return;
    if (showingAll) {
      steps.forEach((s, i) => {
        const card = document.createElement("div");
        card.className = "step-card";
        card.innerHTML = `<div class="step-title">Paso ${i + 1}</div><div class="step-body">${renderStepHtml(s)}</div>`;
        stepsContainer.appendChild(card);
      });
    } else {
      const s = steps[current];
      const card = document.createElement("div");
      card.className = "step-card";
      card.innerHTML = `<div class="step-title">Paso ${current + 1}</div><div class="step-body">${renderStepHtml(s)}</div>`;
      stepsContainer.appendChild(card);
    }
  }

  const prev = controls.querySelector(".btn-prev");
  const next = controls.querySelector(".btn-next");
  const all  = controls.querySelector(".btn-all");

  if (prev) prev.onclick = () => { if (current > 0) { current--; render(); } };
  if (next) next.onclick = () => { if (current < steps.length - 1) { current++; render(); } };
  if (all)  all.onclick  = () => { showingAll = !showingAll; all.textContent = showingAll ? "Ver paso a paso" : "Mostrar todo"; render(); };

  render();
  return wrapper;
}
function maybeAppendResult(container, resultText) {
  if (!resultText) return;
  const box = document.createElement("div");
  box.className = "step-card result";
  box.innerHTML  = `<div class="step-title">Resultado</div><div class="step-body">${renderStepHtml(resultText)}</div>`;
  container.appendChild(box);
}
function addAssistantSteps(stepsArray, resultText) {
  if (!msgsEl) return;
  const div  = document.createElement("div");
  div.className = "msg";
  const flow    = renderAssistantSteps((stepsArray || []).join("\n"));
  div.appendChild(flow);
  maybeAppendResult(flow, resultText);
  msgsEl.appendChild(div);
  msgsEl.scrollTop = msgsEl.scrollHeight;
}
function addAssistantLine(text) {
  if (!msgsEl) return;
  const div = document.createElement("div");
  div.className = "msg";
  katexReady(() => {
    const html  = renderMathAware(text);
    const parts = String(html || "").split(/\n+/).map(s => s.trim()).filter(Boolean);
    div.innerHTML = parts.map(p => p.startsWith('<div class="math-block">') ? p : `<p>${p}</p>`).join("");
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  });
}

/* ================== Send message =================== */
async function sendMessage() {
  try {
    if (!inputEl) return;
    const q = inputEl.value.trim();
    if (!q) return;
    addUserLine(q);
    inputEl.value = "";

    const res = await fetch(`${API_BASE}/edu/solve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problem: q, subject: SUBJECT_TO_BACKEND[subject] || "matemáticas" }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "respuesta no exitosa");

    const steps  = (data.solution?.steps || []).map((s) => tidyMarkdown(String(s)));
    const result = data.solution?.result || "";
    if (steps.length) addAssistantSteps(steps, result);
    else addAssistantLine(result || "No se recibieron pasos.");
  } catch (e) {
    console.error("sendMessage error:", e);
    addAssistantLine("⚠️ Error al consultar al tutor:\n" + (e?.message || String(e)));
  }
}

/* ================== Voice recognition ============== */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, listening = false;

function updateVoiceHint(msg, show = true) {
  if (!voiceHint) return;
  voiceHint.textContent = msg;
  voiceHint.style.display = show ? "block" : "none";
}
function startVoice() {
  if (!SR) { updateVoiceHint("Tu navegador no soporta Web Speech API. Usa Chrome."); return; }
  if (listening) return;
  try {
    rec = new SR();
    rec.lang = "es-ES";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev) => {
      let interim = "", finalTxt = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalTxt += t; else interim += t;
      }
      if (inputEl) inputEl.value = (inputEl.value + " " + (finalTxt || interim)).trim();
    };
    rec.onend   = () => { listening = false; if (btnVoice) btnVoice.textContent = "🎤"; updateVoiceHint("Grabación detenida", true); };
    rec.onerror = ()  => { listening = false; if (btnVoice) btnVoice.textContent = "🎤"; updateVoiceHint("Error de micrófono", true); };
    rec.start();
    listening = true;
    if (btnVoice) btnVoice.textContent = "■";
    updateVoiceHint("Escuchando… pulsa el botón para detener.", true);
  } catch (e) {
    console.error("startVoice error:", e);
  }
}
function stopVoice() {
  try { if (rec) rec.stop(); } catch {}
  listening = false;
  if (btnVoice) btnVoice.textContent = "🎤";
  updateVoiceHint("Grabación detenida", true);
}

/* ================== EMPAREJAR (MQTT) =============== */
// DOM (si no existen, se ignora esta vista)
const pairDeviceEl = $("pair-device-id");
const pairSaveBtn  = $("pair-save");
const brokerSel    = $("mqtt-broker");
const mqttBtn      = $("mqtt-connect");
const mqttStatus   = $("mqtt-status");
const telList      = $("pair-telemetry");
const logBox       = $("pair-log");

const btnPing  = $("cmd-ping");
const btnLedOn = $("cmd-led-on");
const btnLedOff= $("cmd-led-off");

function pairSet(id){ try{ localStorage.setItem("aipl_device_id", id);}catch{} }
function pairGet(){ try{ return localStorage.getItem("aipl_device_id") || ""; }catch{ return ""; } }

function log(...args){
  if (!logBox) return;
  const txt = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  logBox.textContent = (txt + "\n" + logBox.textContent).slice(0, 10000);
}
function addTelemetry(prefix, payload){
  if (!telList) return;
  const li = document.createElement("li");
  const text = (typeof payload === "string" ? payload : JSON.stringify(payload));
  li.textContent = `[${prefix}] ${text}`;
  telList.prepend(li);
  while (telList.children.length > 120) telList.removeChild(telList.lastChild);
}

let mqttClient = null;
function topicFor(id, kind){ return `aipl/${id}/${kind}`; } // status|telemetry|cmd|ack

function connectMQTT(){
  try {
    const deviceId = (pairDeviceEl?.value?.trim() || pairGet());
    if (!deviceId) { alert("Ingresa un Device ID."); return; }
    pairSet(deviceId);

    const url = brokerSel?.value || "wss://test.mosquitto.org:8081/mqtt";
    const opts = {
      clientId: "web_" + Math.random().toString(16).slice(2),
      clean: true,
      connectTimeout: 8000,
      // username/password si usas broker privado
    };

    if (mqttClient) { try { mqttClient.end(true); } catch {} mqttClient = null; }
    if (typeof mqtt === "undefined" || !mqtt.connect) {
      log("⚠️ mqtt.js no está cargado. Revisa el <script defer src=\"https://unpkg.com/mqtt/dist/mqtt.min.js\">");
      return;
    }

    mqttClient = mqtt.connect(url, opts);

    mqttClient.on("connect", () => {
      if (mqttStatus) mqttStatus.textContent = "conectado";
      log("🟢 MQTT conectado", url);
      ["status","telemetry","ack"].forEach((kind) => {
        const t = topicFor(deviceId, kind);
        mqttClient.subscribe(t, (err) => err ? log("❌ sub", t, err) : log("📡 sub", t));
      });
    });

mqttClient.on("message", (topic, payload) => {
  const msg = payload.toString();
  let parsed = null;
  try { parsed = JSON.parse(msg); } catch {}
  addTelemetry(topic, parsed || msg);

  // Ingesta en backend para registro
  try {
    const deviceId = (pairDeviceEl?.value?.trim() || pairGet());
    const kind = topic.endsWith("/telemetry") ? "telemetry"
               : topic.endsWith("/status")    ? "status"
               : topic.endsWith("/ack")       ? "ack"
               : "other";
    fetch(`${API_BASE}/lab/ingest`, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        ts: Date.now(),
        device_id: deviceId || "",
        type: kind === "telemetry" ? "telemetry" : "event",
        kind, data: parsed || msg
      })
    }).catch(()=>{});
  } catch {}
});


    mqttClient.on("message", (topic, payload) => {
      const msg = payload.toString();
      try {
        const parsed = JSON.parse(msg);
        addTelemetry(topic, parsed);
      } catch {
        addTelemetry(topic, msg);
      }
    });

    mqttClient.on("error", (e) => { if (mqttStatus) mqttStatus.textContent = "error"; log("MQTT error", e?.message||e); });
    mqttClient.on("close", () => { if (mqttStatus) mqttStatus.textContent = "desconectado"; log("MQTT cerrado"); });
  } catch (e) {
    console.error("connectMQTT error:", e);
    log("connectMQTT error:", e?.message || e);
  }
}
function sendCmd(cmd, data = {}) {
  try {
    const deviceId = (pairDeviceEl?.value?.trim() || pairGet());
    if (!deviceId) return alert("Empareja primero un Device ID.");
    if (!mqttClient || !mqttClient.connected) return alert("Conéctate a MQTT primero.");

    const t = topicFor(deviceId, "cmd");
    const payload = JSON.stringify({ cmd, data, ts: Date.now() });
    mqttClient.publish(t, payload, { qos: 0 }, (err) => err ? log("❌ publish", err) : log("📤", t, payload));
  } catch (e) {
    console.error("sendCmd error:", e);
    log("sendCmd error:", e?.message || e);
  }
}

/* ================== Wire up ========================= */
if (btnSend)  btnSend.addEventListener("click", sendMessage);
if (inputEl)  inputEl.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
if (btnVoice) btnVoice.addEventListener("click", () => listening ? stopVoice() : startVoice());

// Emparejar
if (pairSaveBtn) pairSaveBtn.onclick = () => {
  const id = pairDeviceEl?.value?.trim();
  if (!id) return alert("Ingresa un Device ID.");
  pairSet(id);
  log("✅ Guardado Device ID:", id);
};
if (mqttBtn)   mqttBtn.onclick   = connectMQTT;
if (btnPing)   btnPing.onclick   = () => sendCmd("ping");
if (btnLedOn)  btnLedOn.onclick  = () => sendCmd("led:on");
if (btnLedOff) btnLedOff.onclick = () => sendCmd("led:off");

// Restaurar ID guardado si existe
if (pairDeviceEl && !pairDeviceEl.value) pairDeviceEl.value = pairGet();

/* ================== Inicial ========================= */
renderSubjects();
renderPersona();
renderQuick();
if (activeSubjectEl) activeSubjectEl.textContent = (SUBJECTS.find(x => x.key === subject)?.label) || "";

// ====== LAB refs ======
const labView         = document.getElementById("view-lab");
const labScenarioSel  = document.getElementById("lab-scenario");
const labParam1       = document.getElementById("lab-param-1");
const labParam2       = document.getElementById("lab-param-2");
const labStartBtn     = document.getElementById("lab-start");
const labStopBtn      = document.getElementById("lab-stop");
const labStateSpan    = document.getElementById("lab-session-state");
const labCmdStart     = document.getElementById("lab-cmd-start");
const labCmdStop      = document.getElementById("lab-cmd-stop");
const labCmdCalib     = document.getElementById("lab-cmd-calibrate");
const labCmdLed       = document.getElementById("lab-cmd-led");
const labRefreshBtn   = document.getElementById("lab-refresh");
const labExportA      = document.getElementById("lab-export");
const labTableBody    = document.getElementById("lab-tbody");
const labAskInput     = document.getElementById("lab-ask");
const labAskSend      = document.getElementById("lab-ask-send");

function setLabStateText(s) {
  if (!labStateSpan) return;
  labStateSpan.textContent = s;
}
function renderLabRows(items=[]) {
  if (!labTableBody) return;
  labTableBody.innerHTML = "";
  items.forEach(it => {
    const tr = document.createElement("tr");
    const td = (txt) => {
      const d = document.createElement("td");
      d.style.padding = "6px"; d.style.borderBottom = "1px solid #eee";
      d.textContent = typeof txt === "string" ? txt : JSON.stringify(txt);
      return d;
    };
    tr.appendChild(td(new Date(it.ts || Date.now()).toLocaleTimeString()));
    tr.appendChild(td(it.type || ""));
    tr.appendChild(td(it.device_id || ""));
    tr.appendChild(td(it.kind || it.event || ""));
    tr.appendChild(td(it.data || ""));
    labTableBody.appendChild(tr);
  });
}

if (labStartBtn) labStartBtn.onclick = async () => {
  const scenario = labScenarioSel?.value || "CUSTOM";
  const params = {};
  if (labParam1?.value) params["param1"] = labParam1.value;
  if (labParam2?.value) params["param2"] = labParam2.value;

  try {
    const r = await fetch(`${API_BASE}/lab/session/start`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ scenario, params })
    });
    const j = await r.json();
    setLabStateText(j.ok ? `Sesión activa (${j.state.session_id}) — ${j.state.scenario}` : "Error al iniciar sesión");
    // Envía configuración al dispositivo (opcional)
    sendCmd("lab:set", { scenario, params });
  } catch (e) {
    setLabStateText("Error al iniciar sesión");
  }
};

if (labStopBtn) labStopBtn.onclick = async () => {
  try {
    const r = await fetch(`${API_BASE}/lab/session/stop`, { method:"POST" });
    const j = await r.json();
    setLabStateText("Sesión detenida");
    // Aviso al dispositivo
    sendCmd("lab:stop", {});
  } catch (e) {
    setLabStateText("Error al detener sesión");
  }
};

if (labRefreshBtn) labRefreshBtn.onclick = async () => {
  try {
    const r = await fetch(`${API_BASE}/lab/last?n=100`);
    const j = await r.json();
    if (j.ok) renderLabRows(j.items);
  } catch {}
};

if (labExportA) {
  labExportA.href = `${API_BASE}/lab/export`; // descarga directa
}

if (labCmdStart)    labCmdStart.onclick    = () => sendCmd("lab:start");
if (labCmdStop)     labCmdStop.onclick     = () => sendCmd("lab:stop");
if (labCmdCalib)    labCmdCalib.onclick    = () => sendCmd("lab:calibrate");
if (labCmdLed)      labCmdLed.onclick      = () => sendCmd("led:toggle");

if (labAskSend) labAskSend.onclick = () => {
  const q = labAskInput?.value?.trim();
  if (!q) return;
  // Envía la pregunta al mismo flujo de chat EDU
  if (inputEl) {
    inputEl.value = q;
    setActiveView("edu");  // salta al chat
    setTimeout(() => { document.getElementById("btn-send")?.click(); }, 50);
  }
};

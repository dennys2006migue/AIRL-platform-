// ===================== CONFIG =====================
const API_BASE = "https://airl.onrender.com"; // <-- Pon tu URL de backend Render

// ================== Subjects & Persona =============
const SUBJECTS = [
  { key: "calculo", label: "Cálculo", persona: "Eres experto en cálculo diferencial e integral. Explica con pasos y ejemplos." },
  { key: "fisica", label: "Física", persona: "Eres físico docente. Usa el SI, leyes y ejemplos prácticos." },
  { key: "algebra_lineal", label: "Álgebra Lineal", persona: "Eres experto en vectores, matrices y espacios vectoriales." },
  { key: "superior", label: "Matemática Superior", persona: "Eres matemático. Razonamiento riguroso y demostraciones claras." },
  { key: "ingles", label: "Inglés", persona: "Eres profesor de inglés. Corrige gramática, vocabulario y da ejemplos." },
  { key: "programacion", label: "Programación", persona: "Eres ingeniero de software. Código claro y buenas prácticas." },
];

const SUBJECT_TO_BACKEND = {
  calculo: "cálculo",
  fisica: "física",
  algebra_lineal: "álgebra lineal",
  superior: "matemáticas",
  ingles: "inglés",
  programacion: "programación"
};

// ===================== DOM refs ====================
const $ = (id) => document.getElementById(id);
const subjectsEl = $("subjects");
const activeSubjectEl = $("active-subject");
const personaEl = $("persona");
const quickEl = $("quick");
const msgsEl = $("msgs");
const inputEl = $("input");
const btnSend = $("btn-send");
const btnVoice = $("btn-voice");
const voiceHint = $("voice-hint");

// ================== State ==========================
let subject = localStorage.getItem("aipl_subject") || "calculo";
let messages = [];

// ================== Render Subjects ================
function renderSubjects() {
  subjectsEl.innerHTML = "";
  SUBJECTS.forEach(s => {
    const btn = document.createElement("button");
    btn.textContent = s.label;
    btn.className = s.key === subject ? "active" : "";
    btn.onclick = () => {
  subject = s.key;
  localStorage.setItem("aipl_subject", subject);
  renderSubjects();
  renderPersona();
  renderQuick();
  clearChat(true);         
};
    subjectsEl.appendChild(btn);
  });
  activeSubjectEl.textContent = (SUBJECTS.find(x=>x.key===subject)?.label) || "Cálculo";
}
function renderPersona() {
  personaEl.textContent = SUBJECTS.find(x=>x.key===subject)?.persona || "";
}
function renderQuick() {
  quickEl.innerHTML = "";
  const chipsBySubject = {
    calculo: ["Deriva x^3", "Integra x^2", "Límites básicos"],
    fisica: ["Explica V=IR", "MRU vs MRUA", "Energía potencial"],
    algebra_lineal: ["Multiplica matrices 2x2", "Autovalores", "Base y dimensión"],
    superior: ["Demuestra la continuidad", "Convergencia de serie", "Topología básica"],
    ingles: ["Past Perfect vs Past Simple", "Condicionales", "Phrasal verbs"],
    programacion: ["Complejidad de quicksort", "Pilas y colas", "Promise vs async/await"]
  };
  (chipsBySubject[subject] || []).forEach(txt => {
    const b = document.createElement("button");
    b.className = "subjects"; // simple pill style
    b.style = "border:1px solid #e5e5e5;border-radius:14px;padding:6px 10px;background:#fff";
    b.textContent = txt;
    b.onclick = () => { inputEl.value = inputEl.value ? inputEl.value + " " + txt : txt; inputEl.focus(); };
    quickEl.appendChild(b);
  });
}

function clearChat(showWelcome = true) {
  messages = [];
  msgsEl.innerHTML = "";
  if (showWelcome) {
    const div = document.createElement("div");
    div.className = "muted";
    div.innerHTML = 'Hola, soy <b>Llama Roja</b>. Cuéntame qué necesitas.';
    msgsEl.appendChild(div);
  }
  inputEl.value = "";
}

// --- util: espera a que KaTeX esté disponible
function katexReady(cb) {
  if (window.katex) return cb();
  const t = setInterval(() => {
    if (window.katex) { clearInterval(t); cb(); }
  }, 50);
}

// --- limpia markdown y numeraciones ruidosas
function tidyMarkdown(s) {
  return s
    .replace(/^#+\s*/gm, "")            // ## Título -> Título
    .replace(/\*\*(.*?)\*\*/g, "$1")    // **negrita** -> negrita
    .replace(/__([^_]+)__/g, "$1")      // __negrita__ -> negrita
    .replace(/^\s*(\d+)\.\s*(\d+)\.\s*/gm, "$2. ") // arregla "1. 1."
    // arregla bloques LaTeX partidos por líneas numeradas:
    .replace(/^\s*\d+\.\s*\\\[$/gm, "\\[")
    .replace(/^\s*\d+\.\s*\\\]$/gm, "\\]")
    .trim();
}

// --- des-escapa delimitadores cuando llegan doble-escapados
function unescapeLatexDelimiters(s) {
  return s
    .replace(/\\\\\(/g, "\\(")
    .replace(/\\\\\)/g, "\\)")
    .replace(/\\\\\[/g, "\\[")
    .replace(/\\\\\]/g, "\\]")
    .replace(/\\\\/g, "\\");
}

function renderInlineLatex(expr) {
  try {
    return katex.renderToString(expr, {
      throwOnError: false,
      output: "html",
      strict: "ignore"
    });
  } catch {
    return expr; // fallback
  }
}

// heurísticos: Big-O, sqrt, log, n^2, (a/b)
function toHeuristicLatex(text) {
  let t = text;

  t = t.replace(/O\(\s*[^)]+\s*\)/g, (m) => {
    let inner = m.slice(2, -1)
      .replace(/\blog\b/gi, "\\log")
      .replace(/([a-zA-Z])\^(\d+)/g, "$1^{\$2}");
    return renderInlineLatex(`O(${inner})`);
  });

  t = t.replace(/sqrt\s*\(\s*([^)]+)\s*\)/gi, (_, a) => renderInlineLatex(`\\sqrt{${a}}`));
  t = t.replace(/\blog\s*\(?\s*([a-zA-Z0-9]+)\s*\)?/gi, (_, a) => renderInlineLatex(`\\log ${a}`));
  t = t.replace(/\b([a-zA-Z])\^(\d+)\b/g, (_, v, p) => renderInlineLatex(`${v}^{${p}}`));
  t = t.replace(/\(\s*([a-zA-Z0-9]+)\s*\/\s*([a-zA-Z0-9]+)\s*\)/g, (_, a, b) => renderInlineLatex(`\\frac{${a}}{${b}}`));

  return t;
}

// renderizador “consciente” de matemáticas (bloques + inline + heurísticos)
function renderMathAware(text) {
  let s = tidyMarkdown(text);
  s = unescapeLatexDelimiters(s);

  // Bloques $$...$$
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, body) => `<div class="math-block">${renderInlineLatex(body)}</div>`);
  // Bloques \[...\] (multilínea)
  s = s.replace(/\\\[((?:.|\n)+?)\\\]/g, (_, body) => `<div class="math-block">${renderInlineLatex(body)}</div>`);
  // Inline \(...\)
  s = s.replace(/\\\((.+?)\\\)/g, (_, body) => renderInlineLatex(body));
  // Inline $...$ (sin confundir con $$...$$)
  s = s.replace(/(?<!\$)\$([^\$]+?)\$(?!\$)/g, (_, body) => renderInlineLatex(body));

  // Heurísticos
  s = toHeuristicLatex(s);

  return s;
}

// --- reemplaza SOLO esta función en tu chat:
function addAssistantLine(text) {
  const div = document.createElement("div");
  div.className = "msg";

  katexReady(() => {
    const html = renderMathAware(text);  // procesa TODO el texto primero
    const parts = html.split(/\n+/).map(s => s.trim()).filter(Boolean);
    // No envolvemos bloques .math-block en <p>
    div.innerHTML = parts.map(p => p.startsWith('<div class="math-block">') ? p : `<p>${p}</p>`).join("");
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  });
}


function addAssistantLine(text) {
  const div = document.createElement("div");
  div.className = "msg"; // globo del asistente

  const paragraphs = text.split(/\n+/).map(s => s.trim()).filter(Boolean);
  div.innerHTML = paragraphs.map(p => `<p>${renderMathAware(p)}</p>`).join("");

  msgsEl.appendChild(div);
  msgsEl.scrollTop = msgsEl.scrollHeight;
}

// ================== Chat UI helpers =================
function addLine(role, text) {
  const div = document.createElement("div");
  div.className = "msg " + (role === "user" ? "user" : "assistant");
  div.textContent = text;
  msgsEl.appendChild(div);
  msgsEl.scrollTop = msgsEl.scrollHeight;
}
function addAssistantLine(text) { addLine("assistant", text); }
function addUserLine(text) { addLine("user", text); }

// ================== Send message ====================
async function sendMessage() {
  const q = inputEl.value.trim();
  if (!q) return;
  addUserLine(q);
  inputEl.value = "";

  // Llama a tu backend /edu/solve (ya existe en Flask)
  // Ver app.py: acepta { problem, subject } y responde pasos/result (demo si no hay API key). :contentReference[oaicite:5]{index=5}
  try {
    const res = await fetch(`${API_BASE}/edu/solve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problem: q,
        subject: SUBJECT_TO_BACKEND[subject] || "matemáticas"
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "respuesta no exitosa");

    const steps = (data.solution?.steps || []).map((s,i)=> `${i+1}. ${s}`).join("\n");
    const result = data.solution?.result ? `\n\n${data.solution.result}` : "";
    addAssistantLine(steps + result || "No se recibieron pasos.");
  } catch (e) {
    addAssistantLine("⚠️ Error al consultar al tutor:\n" + e.message);
  }
}

// ================== Voice recognition ===============
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
let listening = false;

function updateVoiceHint(msg, show=true) {
  voiceHint.textContent = msg;
  voiceHint.style.display = show ? "block" : "none";
}

function startVoice() {
  if (!SR) { updateVoiceHint("Tu navegador no soporta Web Speech API. Usa Chrome."); return; }
  if (listening) return;
  rec = new SR();
  rec.lang = "es-ES";
  rec.continuous = true;
  rec.interimResults = true;

  rec.onresult = (ev) => {
    let interim = "", finalTxt = "";
    for (let i=ev.resultIndex;i<ev.results.length;i++){
      const t = ev.results[i][0].transcript;
      if (ev.results[i].isFinal) finalTxt += t;
      else interim += t;
    }
    inputEl.value = (inputEl.value + " " + (finalTxt || interim)).trim();
  };
  rec.onend = () => { listening = false; btnVoice.textContent = "🎤"; updateVoiceHint("Grabación detenida", true); };
  rec.onerror = () => { listening = false; btnVoice.textContent = "🎤"; updateVoiceHint("Error de micrófono", true); };

  rec.start();
  listening = true;
  btnVoice.textContent = "■";
  updateVoiceHint("Escuchando… pulsa el botón para detener.", true);
}

function stopVoice() {
  if (rec) rec.stop();
  listening = false;
  btnVoice.textContent = "🎤";
  updateVoiceHint("Grabación detenida", true);
}

// ================== Wire up =========================
btnSend.addEventListener("click", sendMessage);
inputEl.addEventListener("keydown", (e)=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendMessage(); }});
btnVoice.addEventListener("click", ()=> listening ? stopVoice() : startVoice());

// Inicial
renderSubjects();
renderPersona();
renderQuick();
activeSubjectEl.textContent = (SUBJECTS.find(x=>x.key===subject)?.label) || "";

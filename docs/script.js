// Client-only verification with animated UI and hash preview.

function q(k) { const u = new URL(location.href); return u.searchParams.get(k) ?? ""; }

async function sha256(text) {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  } catch { return "(unavailable)"; }
}

async function fetchLatest() {
  try {
    const res = await fetch("latest/main.tex", { cache: "no-store" });
    if (!res.ok) throw new Error(res.statusText);
    return await res.text();
  } catch (e) {
    return "% latest main.tex unavailable on Pages";
  }
}

function setBadge(ok) {
  const el = document.getElementById("badge");
  el.textContent = ok ? "verified" : "review";
  el.style.background = ok ? "linear-gradient(135deg, rgba(34,197,94,.2), rgba(99,102,241,.2))" : "linear-gradient(135deg, rgba(239,68,68,.2), rgba(99,102,241,.2))";
}

function renderTimeline(list) {
  const ul = document.getElementById("releases");
  ul.innerHTML = "";
  list.forEach(r => {
    const li = document.createElement("li");
    li.innerHTML = `<div class="dot"></div><div class="entry"><strong>${r.id}</strong> — ${r.updated_at}${r.current ? " <em>(current)</em>" : ""}</div>`;
    ul.appendChild(li);
  });
}

async function render(id) {
  const docs = (window.DOCS || []).slice();
  const rec = docs.find(d => (d.id || "").toLowerCase() === (id || "").toLowerCase());
  const result = document.getElementById("result");
  const metaRef = document.getElementById("metaRef");
  const latestCode = document.getElementById("latexPreview");
  const docId = document.getElementById("docId");
  const docHash = document.getElementById("docHash");
  const docUpdated = document.getElementById("docUpdated");

  const latest = await fetchLatest();
  latestCode.textContent = latest.slice(0, 2000);
  try { if (window.Prism && Prism.highlightElement) Prism.highlightElement(latestCode); } catch {}

  const latestHash = await sha256(latest);

  const unknown = !id;
  if (unknown || !rec) {
    result.className = "result bad";
    result.textContent = unknown ? "No document ID supplied. Append ?doc=YOUR_ID to the URL." : `Unknown document ID: ${id}`;
    docId.textContent = id || "—";
    docHash.textContent = latestHash;
    docUpdated.textContent = "—";
    setBadge(false);
  } else {
    result.className = rec.current ? "result ok" : "result bad";
    result.textContent = rec.current ? `Verified: ${rec.id} is up‑to‑date and official.` : `Out‑of‑date: ${rec.id}. Showing latest reference.`;
    docId.textContent = rec.id;
    docHash.textContent = latestHash;
    docUpdated.textContent = rec.updated_at || "—";
    setBadge(!!rec.current);
  }

  metaRef.textContent = JSON.stringify(rec || { id: id || "(none)", current: false }, null, 2);
  renderTimeline(docs.sort((a,b) => (a.updated_at < b.updated_at ? 1 : -1)));

  // QR preview for current ID
  // QR preview for current ID with robust loader
  (function drawQR(){
    const canvas = document.getElementById("qrCanvas");
    const img = document.getElementById("qrImg");
    const previewId = (docId.textContent && docId.textContent !== "—") ? docId.textContent : (id || "");
    const url = previewId ? `https://adzetto.github.io/internshipDiaryVerificationRobot/?doc=${encodeURIComponent(previewId)}` : "";
    if (!canvas || !url) return;
    function getLib(){ return window.QRCode || window.qrcode || null; }
    function renderCanvas(){
      const lib = getLib();
      if (!lib) return false;
      const opts = { width: 132, margin: 2, color: { dark: "#000000", light: "#ffffff" } };
      try {
        (lib.toCanvas ? lib : window.QRCode).toCanvas(canvas, url, opts, () => {});
        if (img) img.style.display = "none";
        canvas.style.display = "block";
        return true;
      } catch { return false; }
    }
    function renderImg(){
      const lib = getLib();
      if (!lib || !img) return false;
      const opts = { margin: 2, color: { dark: "#000000", light: "#ffffff" } };
      try {
        (lib.toDataURL ? lib : window.QRCode).toDataURL(url, opts, (err, dataUrl) => {
          if (err) return;
          img.src = dataUrl; img.style.display = "block"; canvas.style.display = "none";
        });
        return true;
      } catch { return false; }
    }
    if (renderCanvas()) return;
    // If lib not ready yet (defer), wait and retry (then fallback to img)
    let tries = 0; const t = setInterval(() => {
      if (renderCanvas()) { clearInterval(t); return; }
      if (++tries > 12) { renderImg(); clearInterval(t); }
    }, 150);
  })();

  // robust copy buttons with fallback + visual feedback
  function copyText(text) {
    if (!text) return Promise.reject();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
    }
    return legacyCopy(text);
  }
  function legacyCopy(text) {
    return new Promise((resolve) => {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.left = "-9999px";
      document.body.appendChild(ta);
      const range = document.createRange(); range.selectNodeContents(ta);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      try { document.execCommand("copy"); } catch {}
      sel.removeAllRanges(); document.body.removeChild(ta); resolve();
    });
  }
  function flash(btn, ok=true) {
    if (!btn) return;
    const prev = btn.textContent;
    btn.textContent = ok ? "Copied!" : "Unable to copy";
    btn.style.filter = ok ? "brightness(1.15)" : "saturate(.6)";
    setTimeout(() => { btn.textContent = prev; btn.style.filter = ""; }, 900);
  }
  // Copy handlers are set globally
}
function attachCopyHandlers() {
  if (window.__copyBound) return; window.__copyBound = true;
  const btnCopyId = document.getElementById("copyId");
  const btnCopyURL = document.getElementById("copyURL");
  const docId = document.getElementById("docId");
  function copyText(text) {
    if (!text) return Promise.reject();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
    }
    return legacyCopy(text);
  }
  function legacyCopy(text) {
    return new Promise((resolve) => {
      const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.left = "-9999px"; document.body.appendChild(ta);
      ta.select(); try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta); resolve();
    });
  }
  function flash(btn, ok=true) { if (!btn) return; const prev = btn.textContent; btn.textContent = ok ? "Copied!" : "Unable to copy"; setTimeout(() => { btn.textContent = prev; }, 900); }
  if (btnCopyId) btnCopyId.addEventListener("click", (e) => { e.preventDefault(); copyText((docId.textContent || "").trim()).then(() => flash(btnCopyId, true)).catch(() => flash(btnCopyId, false)); });
  if (btnCopyURL) btnCopyURL.addEventListener("click", (e) => { e.preventDefault(); copyText(location.href).then(() => flash(btnCopyURL, true)).catch(() => flash(btnCopyURL, false)); });
}

window.addEventListener("DOMContentLoaded", () => {
  try { render(q("doc")); } catch {}
  attachCopyHandlers();
  // Ensure QR is drawn even if library loads late
  setTimeout(() => { try { render(q("doc")); } catch {} }, 800);
});

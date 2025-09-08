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
  Prism.highlightElement(latestCode);

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

  // copy buttons
  document.getElementById("copyId").onclick = () => navigator.clipboard.writeText(docId.textContent);
  document.getElementById("copyURL").onclick = () => navigator.clipboard.writeText(location.href);
}

window.addEventListener("DOMContentLoaded", () => { render(q("doc")); });

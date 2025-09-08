// Simple client-only verification. In practice this can be backed by a server or signed JSON.

function q(k) {
  const u = new URL(window.location.href);
  return u.searchParams.get(k) ?? "";
}

function render(id) {
  const rec = (window.DOCS || []).find(d => (d.id || "").toLowerCase() === (id || "").toLowerCase());
  const result = document.getElementById("result");
  const latestRef = document.getElementById("latestRef");
  const metaRef = document.getElementById("metaRef");

  if (!id) {
    result.className = "result bad";
    result.textContent = "No document ID supplied. Append ?doc=YOUR_ID to the URL.";
    latestRef.textContent = "";
    metaRef.textContent = "";
    return;
  }

  if (!rec) {
    result.className = "result bad";
    result.textContent = `Unknown document ID: ${id}`;
    latestRef.textContent = `Latest main.tex: ${location.origin + location.pathname}latest/main.tex`;
    metaRef.textContent = JSON.stringify({
      id,
      current: false,
      info: "Provided ID not found; showing latest reference only."
    }, null, 2);
    return;
  }

  if (rec.current) {
    result.className = "result ok";
    result.textContent = `Verified: ${rec.id} is up-to-date and official.`;
  } else {
    result.className = "result bad";
    result.textContent = `Out-of-date: ${rec.id}. Showing latest reference.`;
  }

  latestRef.textContent = `Latest main.tex: ${location.origin + location.pathname}latest/main.tex`;
  metaRef.textContent = JSON.stringify(rec, null, 2);
}

window.addEventListener("DOMContentLoaded", () => {
  render(q("doc"));
});


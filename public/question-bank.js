(function () {
  const STORAGE_KEY = "aiMockInterviewerReadingProgress";
  const content = document.querySelector("#qbContent");
  const progressCountEl = document.querySelector("#qbProgressCount");
  const progressFillEl = document.querySelector("#qbProgressFill");
  const searchEl = document.querySelector("#qbSearch");
  const jumpButton = document.querySelector("#qbJumpToLast");

  let entries = [];
  let seen = new Set();
  let lastId = null;
  let saveTimer = null;

  // Stable id from the question text itself (not array index), so re-running
  // the answer-bank build - which can add/remove/reorder entries - doesn't
  // silently invalidate everyone's existing reading bookmarks.
  function hashId(text) {
    const normalized = String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    let hash = 2166136261;
    for (let i = 0; i < normalized.length; i++) {
      hash ^= normalized.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      seen = new Set(Array.isArray(saved.seen) ? saved.seen : []);
      lastId = saved.lastId || null;
    } catch {
      seen = new Set();
      lastId = null;
    }
  }

  function saveProgress() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        seen: Array.from(seen),
        lastId,
        updatedAt: new Date().toISOString()
      }));
    }, 300);
  }

  function updateProgressUi() {
    const total = entries.length;
    const read = entries.reduce((sum, entry) => sum + (seen.has(entry.qid) ? 1 : 0), 0);
    progressCountEl.textContent = `${read} / ${total} read`;
    progressFillEl.style.width = total ? `${Math.round((read / total) * 100)}%` : "0%";
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function groupBySection(list) {
    const order = [];
    const groups = new Map();
    for (const entry of list) {
      const key = entry.section || "General";
      if (!groups.has(key)) {
        groups.set(key, []);
        order.push(key);
      }
      groups.get(key).push(entry);
    }
    return order.map((key) => ({ section: key, items: groups.get(key) }));
  }

  function render(list) {
    const sections = groupBySection(list);
    if (!sections.length) {
      content.innerHTML = `<p class="qb-loading">No questions match your filter.</p>`;
      return;
    }
    content.innerHTML = sections.map((group) => `
      <details class="qb-section" open>
        <summary>${escapeHtml(group.section)} <span class="qb-section-count">${group.items.length}</span></summary>
        <div class="qb-section-body">
          ${group.items.map((entry) => `
            <article class="qb-question${seen.has(entry.qid) ? " qb-seen" : ""}" id="q-${entry.qid}" data-qid="${entry.qid}">
              ${entry.category ? `<span class="qb-category">${escapeHtml(entry.category)}</span>` : ""}
              <p class="qb-q">${escapeHtml(entry.question)}</p>
              <p class="qb-a">${escapeHtml(entry.answer)}</p>
            </article>
          `).join("")}
        </div>
      </details>
    `).join("");
    observeQuestions();
  }

  let observer = null;
  function observeQuestions() {
    if (observer) observer.disconnect();
    observer = new IntersectionObserver((observedEntries) => {
      let changed = false;
      observedEntries.forEach((observed) => {
        if (!observed.isIntersecting) return;
        const qid = observed.target.dataset.qid;
        if (!seen.has(qid)) {
          seen.add(qid);
          observed.target.classList.add("qb-seen");
          changed = true;
        }
        lastId = qid;
      });
      if (changed) updateProgressUi();
      saveProgress();
    }, { rootMargin: "0px 0px -60% 0px", threshold: 0.1 });

    content.querySelectorAll(".qb-question").forEach((el) => observer.observe(el));
  }

  function applyFilter(query) {
    const term = query.trim().toLowerCase();
    if (!term) {
      render(entries);
      return;
    }
    const filtered = entries.filter((entry) =>
      entry.question.toLowerCase().includes(term) || entry.answer.toLowerCase().includes(term)
    );
    render(filtered);
  }

  jumpButton.addEventListener("click", () => {
    if (!lastId) {
      window.alert("No reading history yet - scroll through some questions first.");
      return;
    }
    const target = document.querySelector(`#q-${lastId}`);
    if (!target) {
      window.alert("That question isn't in the current filtered view. Clear the filter and try again.");
      return;
    }
    const details = target.closest("details");
    if (details) details.open = true;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("qb-highlight");
    setTimeout(() => target.classList.remove("qb-highlight"), 2000);
  });

  let searchTimer = null;
  searchEl.addEventListener("input", (event) => {
    clearTimeout(searchTimer);
    const value = event.target.value;
    searchTimer = setTimeout(() => applyFilter(value), 200);
  });

  async function init() {
    loadProgress();
    try {
      const response = await fetch("/qa-dataset.json");
      const data = await response.json();
      entries = (Array.isArray(data) ? data : []).map((entry) => ({ ...entry, qid: hashId(entry.question) }));
    } catch {
      entries = [];
    }
    if (!entries.length) {
      content.innerHTML = `<p class="qb-loading">Could not load the question bank.</p>`;
      return;
    }
    render(entries);
    updateProgressUi();
  }

  init();
})();

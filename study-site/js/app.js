(function () {
  "use strict";

  const M = typeof marked !== "undefined" ? marked : null;
  if (!M) {
    document.getElementById("content").textContent =
      "Marked library failed to load.";
    return;
  }

  if (typeof M.use === "function") {
    M.use({ gfm: true });
  } else if (typeof M.setOptions === "function") {
    M.setOptions({ gfm: true });
  }

  const parse =
    typeof M.parse === "function"
      ? M.parse.bind(M)
      : M.marked && typeof M.marked.parse === "function"
        ? M.marked.parse.bind(M.marked)
        : typeof M === "function"
          ? M
          : null;

  if (!parse) {
    document.getElementById("content").textContent =
      "Marked API not recognized.";
    return;
  }

  const listEl = document.getElementById("list");
  const searchEl = document.getElementById("search");
  const metaEl = document.getElementById("meta");
  const titleEl = document.getElementById("question-title");
  const contentEl = document.getElementById("content");
  const prevBtn = document.getElementById("prev");
  const nextBtn = document.getElementById("next");
  const themeBtn = document.getElementById("theme-toggle");
  const hljsLight = document.getElementById("hljs-light");
  const hljsDark = document.getElementById("hljs-dark");

  const STORAGE_KEY = "study:lastQuestion";
  const THEME_KEY = "study:theme";

  let questions = [];
  let filteredIndices = [];
  let currentIndex = 0;

  function getTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    if (hljsLight && hljsDark) {
      hljsLight.disabled = theme !== "light";
      hljsDark.disabled = theme !== "dark";
    }
  }

  themeBtn.addEventListener("click", () => {
    const next = getTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
  });

  applyTheme(getTheme());

  function hashToIndex() {
    const m = /^#q\/(\d+)$/.exec(window.location.hash);
    if (!m) return -1;
    const num = parseInt(m[1], 10);
    const idx = questions.findIndex((q) => q.number === num);
    return idx >= 0 ? idx : -1;
  }

  function setHashForIndex(idx) {
    const q = questions[idx];
    if (q) {
      const next = `#q/${q.number}`;
      if (window.location.hash !== next) {
        history.replaceState(null, "", next);
      }
    }
  }

  function highlightCodeBlocks(root) {
    if (typeof hljs === "undefined" || !root) return;
    root.querySelectorAll("pre code").forEach((block) => {
      try {
        hljs.highlightElement(block);
      } catch (_) {
        /* ignore */
      }
    });
  }

  function showQuestion(idx) {
    if (!questions.length || idx < 0 || idx >= questions.length) return;
    currentIndex = idx;
    const q = questions[idx];
    titleEl.textContent = `${q.number}. ${q.title}`;

    const md =
      "### " + q.title + "\n\n" + (q.bodyMarkdown || "").trim() + "\n";
    contentEl.innerHTML = parse(md);
    highlightCodeBlocks(contentEl);

    listEl.querySelectorAll("button").forEach((btn, i) => {
      btn.setAttribute(
        "aria-current",
        filteredIndices[i] === idx ? "true" : "false"
      );
    });

    const active = listEl.querySelector('[aria-current="true"]');
    if (active && typeof active.scrollIntoView === "function") {
      active.scrollIntoView({ block: "nearest" });
    }

    setHashForIndex(idx);
    localStorage.setItem(STORAGE_KEY, String(q.number));

    prevBtn.disabled = idx <= 0;
    nextBtn.disabled = idx >= questions.length - 1;
  }

  function buildList() {
    const q = searchEl.value.trim().toLowerCase();
    filteredIndices = [];
    const frag = document.createDocumentFragment();

    questions.forEach((item, idx) => {
      const hay = `${item.number} ${item.title}`.toLowerCase();
      if (q && !hay.includes(q)) return;
      filteredIndices.push(idx);

      const btn = document.createElement("button");
      btn.type = "button";
      const spanNum = document.createElement("span");
      spanNum.className = "num";
      spanNum.textContent = `${item.number}.`;
      btn.appendChild(spanNum);
      btn.appendChild(document.createTextNode(` ${item.title}`));
      btn.addEventListener("click", () => showQuestion(idx));
      frag.appendChild(btn);
    });

    listEl.innerHTML = "";
    listEl.appendChild(frag);
    metaEl.textContent = `${filteredIndices.length} of ${questions.length} shown`;

    if (!filteredIndices.length) {
      titleEl.textContent = "No matches";
      contentEl.innerHTML = "";
      return;
    }

    let pick = filteredIndices.indexOf(currentIndex);
    if (pick < 0) pick = 0;
    showQuestion(filteredIndices[pick]);
  }

  searchEl.addEventListener("input", () => buildList());

  prevBtn.addEventListener("click", () => {
    const pos = filteredIndices.indexOf(currentIndex);
    if (pos > 0) showQuestion(filteredIndices[pos - 1]);
    else if (currentIndex > 0) showQuestion(currentIndex - 1);
  });

  nextBtn.addEventListener("click", () => {
    const pos = filteredIndices.indexOf(currentIndex);
    if (pos >= 0 && pos < filteredIndices.length - 1) {
      showQuestion(filteredIndices[pos + 1]);
    } else if (currentIndex < questions.length - 1) {
      showQuestion(currentIndex + 1);
    }
  });

  window.addEventListener("hashchange", () => {
    const idx = hashToIndex();
    if (idx >= 0) showQuestion(idx);
  });

  fetch("data/questions.json")
    .then((r) => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json();
    })
    .then((data) => {
      questions = data;
      let start = hashToIndex();
      if (start < 0) {
        const saved = parseInt(localStorage.getItem(STORAGE_KEY) || "", 10);
        if (!Number.isNaN(saved)) {
          start = questions.findIndex((q) => q.number === saved);
        }
      }
      if (start < 0) start = 0;
      currentIndex = start;
      buildList();
    })
    .catch((err) => {
      titleEl.textContent = "Could not load questions";
      contentEl.innerHTML =
        "<p>Run <code>npm run build:study</code> from the repo root, then refresh.</p>" +
        `<p class="muted">${String(err.message || err)}</p>`;
      metaEl.textContent = "";
    });
})();

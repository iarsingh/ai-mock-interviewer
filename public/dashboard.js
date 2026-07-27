const DASHBOARD_STORAGE_KEY = "aiMockInterviewerState";
const dashboardProfiles = {
  devops: { label: "DevOps Engineer", role: "Senior DevOps Engineer", technology: "kubernetes", focus: "Kubernetes, Docker, Terraform, CI/CD and GitOps, Linux, cloud networking, security, observability, SRE, incident response" },
  frontend: { label: "Frontend Developer", role: "Senior Frontend Developer", technology: "frontend", focus: "HTML, CSS, JavaScript, TypeScript, React, state management, accessibility, responsive design, testing, web performance" },
  backend: { label: "Backend Developer", role: "Senior Backend Developer", technology: "backend", focus: "Python, FastAPI, Go, REST and GraphQL APIs, SQL and NoSQL databases, caching, messaging, security, distributed systems, system design" },
  mlops: { label: "MLOps Engineer", role: "Senior MLOps Engineer", technology: "mlops", focus: "Python, MLflow, Kubeflow, Vertex AI, training pipelines, feature stores, model registry, model serving, drift monitoring, Kubernetes, CI/CD for ML" },
  "system-design": { label: "System Design", role: "Software Engineer - System Design Round", technology: "scenario", focus: "requirements clarification, capacity estimation, API design, data modeling, caching, queues, load balancing, horizontal scaling, consistency, reliability, security, observability, and architecture trade-offs" },
  dsa: { label: "Data Structures & Algorithms", role: "Software Engineer - DSA Round", technology: "coding", focus: "arrays, strings, hash maps, linked lists, stacks, queues, trees, graphs, recursion, sorting, searching, greedy algorithms, dynamic programming, and time and space complexity" },
  cumulative: { label: "Cumulative Random Interview", role: "Cross-functional Software Engineering Interview", technology: "all", focus: "DevOps, frontend, backend, MLOps, cloud, system design, data structures and algorithms, security, behavioral questions, and production scenarios", questionOrder: "random", practiceDay: "all", mockSet: "random-bank" },
  "python-dev": { label: "Python Developer", role: "Senior Python Developer", technology: "all", focus: "GIL, generators, decorators, context managers, garbage collection, type hints, asyncio, metaclasses, common pitfalls", mockSet: "set-99" },
  "go-dev": { label: "Go Developer", role: "Senior Go Developer", technology: "all", focus: "Goroutines and channels, select, error handling philosophy, interfaces, race detection, context.Context, pprof, table-driven tests", mockSet: "set-100" },
  "javascript-dev": { label: "JavaScript Developer", role: "Senior JavaScript Developer", technology: "all", focus: "Closures, event loop, prototypal inheritance, this binding, Promises/async-await, hoisting, ==/===, debounce/throttle, memory leaks, CommonJS vs ESM", mockSet: "set-101" },
  "bash-scripting": { label: "Shell and Bash Scripting", role: "DevOps Engineer - Shell Scripting Round", technology: "all", focus: "set -euo pipefail, quoting pitfalls, trap for cleanup, process substitution, heredocs, arrays, parameter expansion, cron robustness, debugging, xargs, sed/awk", mockSet: "set-102" },
  rag: { label: "RAG (Retrieval-Augmented Generation)", role: "AI Engineer - RAG Round", technology: "all", focus: "Hybrid search, multi-hop retrieval, chunking strategy, groundedness evaluation, access control, production RAG monitoring", mockSet: "set-94" },
  llm: { label: "LLM Engineering Fundamentals", role: "AI Engineer - LLM Engineering Round", technology: "all", focus: "Transformer internals, tokenization, sampling parameters, function calling, structured output, model selection, embeddings", mockSet: "set-95" },
  llmops: { label: "LLMOps Production Operations", role: "MLOps/LLMOps Engineer", technology: "all", focus: "Prompt versioning, cost tracking, regression testing for non-deterministic output, prompt caching, observability tooling, PII handling", mockSet: "set-96" },
  "agentic-ai": { label: "Agentic AI Architecture", role: "AI Engineer - Agentic AI Round", technology: "all", focus: "ReAct vs Plan-and-Execute, agent memory design, OWASP LLM Top 10 for agents, multi-agent communication, agentic RAG", mockSet: "set-97" },
  genai: { label: "Generative AI Beyond Text", role: "AI Engineer - Generative AI Round", technology: "all", focus: "Diffusion models, enterprise GenAI use cases, ethics/bias/copyright, content moderation, synthetic data, watermarking", mockSet: "set-98" }
};

const roleCards = document.querySelectorAll("[data-dashboard-role]");
const selectedTrack = document.querySelector("#selectedTrack");
const launchTitle = document.querySelector("#launchTitle");
const launchDescription = document.querySelector("#launchDescription");
const startButton = document.querySelector("#startTrackInterview");

const skillLogoNames = {
  kubernetes: "K8", docker: "D", gcp: "G", linux: "Lx", terraform: "Tf", "ci/cd": "CI", gitops: "Git", ansible: "An",
  sre: "SR", observability: "Ob", security: "Sc", html: "H5", css: "C3", javascript: "JS", typescript: "TS", react: "R",
  "state management": "St", components: "Co", testing: "T", accessibility: "A11", performance: "Pf", python: "Py", go: "Go",
  fastapi: "FA", sql: "SQL", nosql: "No", redis: "Rd", queues: "Q", "rest apis": "API", "system design": "SD", mlflow: "ML",
  "model registry": "MR", "feature stores": "FS", "vertex ai": "VA", kubeflow: "KF", "model serving": "MS", drift: "Dr", "ml ci/cd": "MC",
  requirements: "Rq", apis: "API", "data modeling": "DB", caching: "Ca", scaling: "Sc", reliability: "Re", "trade-offs": "Tr",
  arrays: "[]", strings: "S", "hash maps": "#", trees: "Tr", graphs: "Gr", recursion: "Rc", "dynamic programming": "DP", complexity: "O(n)"
};

const skillQuestionPatterns = {
  kubernetes: /\b(kubernetes|k8s|gke|pod|helm|kubectl)\b/i, docker: /\b(docker|container|dockerfile)\b/i, gcp: /\b(gcp|google cloud|cloud run|compute engine)\b/i,
  linux: /\b(linux|systemd|kernel|bash|filesystem)\b/i, terraform: /\b(terraform|infrastructure as code|\biac\b)\b/i, "ci/cd": /\b(ci\/cd|cicd|continuous integration|pipeline|jenkins|github actions)\b/i,
  gitops: /\b(gitops|argocd|argo cd)\b/i, ansible: /\b(ansible|playbook)\b/i, sre: /\b(sre|sli|slo|error budget|reliability)\b/i, observability: /\b(observability|monitoring|prometheus|grafana|tracing)\b/i,
  security: /\b(security|iam|rbac|vulnerability|devsecops)\b/i, html: /\b(html|semantic markup)\b/i, css: /\b(css|responsive design|flexbox|grid layout)\b/i, javascript: /\b(javascript|\bjs\b|event loop|dom)\b/i,
  typescript: /\b(typescript|type system)\b/i, react: /\b(react|jsx|hooks)\b/i, "state management": /\b(state management|redux|context api)\b/i, components: /\b(component|component design)\b/i,
  testing: /\b(testing|unit test|integration test|pytest|jest)\b/i, accessibility: /\b(accessibility|a11y|aria|wcag)\b/i, performance: /\b(performance|latency|optimization|bottleneck)\b/i,
  python: /\b(python|pytest|pydantic)\b/i, go: /\b(golang|go programming|goroutine|channel)\b/i, fastapi: /\b(fastapi|uvicorn|asgi)\b/i, sql: /\b(sql|postgres|mysql|relational database)\b/i,
  nosql: /\b(nosql|mongodb|document database)\b/i, redis: /\b(redis|in-memory cache)\b/i, queues: /\b(queue|pub\/sub|kafka|rabbitmq|messaging)\b/i, "rest apis": /\b(rest api|restful|http api)\b/i,
  "system design": /\b(system design|design a|architecture|scalable system)\b/i, mlflow: /\b(mlflow|experiment tracking)\b/i, "model registry": /\b(model registry|model version)\b/i,
  "feature stores": /\b(feature store|feature engineering)\b/i, "vertex ai": /\b(vertex ai|vertex pipeline)\b/i, kubeflow: /\b(kubeflow|kserve)\b/i, "model serving": /\b(model serving|model deployment|inference)\b/i,
  drift: /\b(data drift|model drift|concept drift)\b/i, "ml ci/cd": /\b(ml ci\/cd|ml pipeline|training pipeline)\b/i, requirements: /\b(requirements|functional requirement|non-functional)\b/i,
  apis: /\b(api|endpoint|rest|graphql)\b/i, "data modeling": /\b(data model|schema|database design)\b/i, caching: /\b(cache|caching|cdn)\b/i, scaling: /\b(scale|scaling|autoscal)\b/i,
  reliability: /\b(reliability|availability|fault toler|resilien)\b/i, "trade-offs": /\b(trade-?off|consistency|cap theorem)\b/i, arrays: /\b(array|list)\b/i, strings: /\b(string|substring)\b/i,
  "hash maps": /\b(hash map|hashmap|dictionary)\b/i, trees: /\b(tree|binary search tree|bst)\b/i, graphs: /\b(graph|bfs|dfs)\b/i, recursion: /\b(recursion|recursive|backtracking)\b/i,
  "dynamic programming": /\b(dynamic programming|memoization|tabulation)\b/i, complexity: /\b(time complexity|space complexity|big o|o\([^)]+\))\b/i
};

function collectQuestionText(value, output) {
  if (Array.isArray(value)) return value.forEach((item) => collectQuestionText(item, output));
  if (!value || typeof value !== "object") return;
  if (typeof value.question === "string") output.add(value.question.trim());
  Object.values(value).forEach((item) => collectQuestionText(item, output));
}

async function loadQuestionCoverage() {
  const sources = ["/api/question-bank", "/mock-interview-sets.json", "/30-day-plan.json"];
  const questions = new Set();
  await Promise.all(sources.map(async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return;
      collectQuestionText(await response.json(), questions);
    } catch (_) {}
  }));

  let availableSkills = 0;
  document.querySelectorAll(".role-skill-group span, .core-round-skills span").forEach((skill) => {
    const nameNode = Array.from(skill.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
    const name = (nameNode?.textContent || skill.textContent).trim();
    const pattern = skillQuestionPatterns[name.toLowerCase()];
    const count = pattern ? Array.from(questions).filter((question) => pattern.test(question)).length : 0;
    const status = document.createElement("em");
    status.className = count ? "skill-availability available" : "skill-availability unavailable";
    status.textContent = count ? `${count} Q` : "No Q";
    status.setAttribute("aria-label", count ? `${count} questions available` : "No matching questions available");
    skill.classList.toggle("has-questions", count > 0);
    skill.classList.toggle("no-questions", count === 0);
    skill.title = count ? `${count} matching questions available` : "No matching questions currently available";
    skill.append(status);
    if (count) availableSkills += 1;
  });
  const totalSkills = document.querySelectorAll(".role-skill-group span, .core-round-skills span").length;
  const summary = document.querySelector("#coverageSummary");
  if (summary) summary.textContent = `${questions.size} questions checked · ${availableSkills}/${totalSkills} skills covered`;
}

function decorateSkillLogos() {
  document.querySelectorAll(".role-skill-group span, .core-round-skills span").forEach((skill) => {
    const name = skill.textContent.trim();
    const key = name.toLowerCase();
    const logo = document.createElement("i");
    logo.className = "skill-logo";
    logo.dataset.logo = key.replace(/[^a-z0-9]+/g, "-");
    logo.setAttribute("aria-hidden", "true");
    logo.textContent = skillLogoNames[key] || name.slice(0, 2).toUpperCase();
    skill.prepend(logo);
  });
}

function selectDashboardRole(key, persist = true) {
  const profile = dashboardProfiles[key];
  if (!profile) return;
  roleCards.forEach((card) => {
    const active = card.dataset.dashboardRole === key;
    card.classList.toggle("active", active);
    card.setAttribute("aria-pressed", String(active));
  });
  if (specializedRoundSelect) {
    specializedRoundSelect.value = specializedRoundSelect.querySelector(`option[value="${key}"]`) ? key : "";
  }
  selectedTrack.textContent = profile.label;
  launchTitle.textContent = `${profile.label} interview is ready`;
  launchDescription.textContent = `The question pool will focus on ${profile.focus}.`;
  startButton.classList.remove("disabled");
  startButton.removeAttribute("aria-disabled");
  if (persist) {
    const state = JSON.parse(localStorage.getItem(DASHBOARD_STORAGE_KEY) || "{}");
    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify({
      ...state,
      role: profile.role,
      topic: profile.focus,
      technology: profile.technology,
      careerProfile: key,
      questionOrder: profile.questionOrder || "random",
      practiceDay: profile.practiceDay || "all",
      mockSet: profile.mockSet || "all",
      interviewNumber: 1,
      interviews: [],
      questionBankIndex: 0,
      usedQuestionKeys: []
    }));
  }
}

roleCards.forEach((card) => card.addEventListener("click", () => selectDashboardRole(card.dataset.dashboardRole)));

const specializedRoundSelect = document.querySelector("#specializedRoundSelect");
specializedRoundSelect?.addEventListener("change", () => {
  if (specializedRoundSelect.value) selectDashboardRole(specializedRoundSelect.value);
});
decorateSkillLogos();
loadQuestionCoverage();
startButton.addEventListener("click", (event) => { if (startButton.getAttribute("aria-disabled") === "true") event.preventDefault(); });

try {
  const saved = JSON.parse(localStorage.getItem(DASHBOARD_STORAGE_KEY) || "{}");
  if (dashboardProfiles[saved.careerProfile]) selectDashboardRole(saved.careerProfile, false);
} catch (_) {}

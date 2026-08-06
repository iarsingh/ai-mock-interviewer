const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function normalizeQuestion(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/^[a-z0-9/ &+-]+:\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Collapse harmless interview-prompt variations without merging detailed
// scenarios. For short definition/comparison prompts, token order is not
// meaningful ("GKE Standard and Autopilot" vs "Autopilot and Standard").
function canonicalQuestionKey(value) {
  const normalized = normalizeQuestion(value)
    .replace(/\bworked on\b/g, "worked with")
    .replace(/\brequest user\b/g, "user request")
    .replace(/\s+/g, " ")
    .trim();
  const isShort = normalized.split(" ").length <= 14;
  const isDefinitionOrComparison = /^(what (is|are)|explain|describe|define|difference between|what is the difference between)\b/.test(normalized);
  if (!isShort || !isDefinitionOrComparison) {
    return normalized
      .replace(/^(can you|could you|please)\s+/, "")
      .replace(/\b(a|an|the)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return normalized
    .replace(/^(what (is|are)|explain|describe|define|what is the difference between|difference between)\s+/, "")
    .split(" ")
    .filter((token) => !["a", "an", "the", "in", "on"].includes(token))
    .sort()
    .join(" ");
}

function classifyQuestionType(question) {
  const text = String(question || "").toLowerCase();
  if (/\b(troubleshoot|debug|investigate|fails?|failure|pending|crashloop|exhaust|corrupt|deleted|recover|restore)\b/.test(text)) return "Troubleshooting";
  if (/^(tell me|have you|are you|do you use|what activities|what was your|in your environment|which tool do you use)/.test(text)) return "Experience";
  if (/\b(difference|compare|versus| vs |choose|prefer|instead of)\b/.test(text)) return "Comparison";
  if (/^(how would you design|design |explain the complete|what is the complete request flow|how does traffic flow)/.test(text)) return "Design / Architecture";
  if (/^(suppose|if |when |a customer|you scale|what happens)/.test(text)) return "Scenario";
  if (/^(how do you|how would you|how does|what should|what inputs|where do you|which .* required)/.test(text)) return "Implementation / Workflow";
  return "Conceptual";
}

function placeholderAnswer(answer) {
  return /a strong answer should|tailor the response directly to|use the prompt details as acceptance criteria|start with the expected configuration, command, workflow|the direct answer is to define|i would explain the main mechanism/i.test(String(answer || ""));
}

const TOPIC_RULES = [
  ["Kubernetes", ["kubernetes", "k8s", "gke", "eks", "helm", "ingress", "kubelet", "etcd", "coredns", "rbac"]],
  ["Docker & Containers", ["docker", "container", "containerd"]],
  ["Terraform / IaC", ["terraform", "iac", "infrastructure as code"]],
  ["GCP / Cloud", ["gcp", "cloud", "azure", "aws", "landing zone", "iam"]],
  ["Networking", ["network", "dns", "load balanc", "mtls", "hybrid networking"]],
  ["Observability", ["observability", "monitoring", "logging", "tracing", "datadog", "prometheus", "grafana", "opentelemetry", "elastic", "kibana"]],
  ["CI/CD & GitOps", ["ci/cd", "gitops", "jenkins", "argo"]],
  ["Security & Risk", ["security", "risk", "compliance", "audit", "governance", "sentinel", "devsecops"]],
  ["SRE & Incident Response", ["sre", "reliability", "incident", "outage", "troubleshoot"]],
  ["Ansible & Automation", ["ansible", "automation"]],
  ["Python", ["python"]],
  ["FastAPI / APIs", ["fastapi", "api"]],
  ["Linux", ["linux"]],
  ["DSA / Coding", ["dsa", "coding", "leetcode", "algorithm"]],
  ["System Design", ["system design", "architecture"]],
  ["MLOps / LLMOps / GenAI", ["mlops", "llmops", "genai", "llm ", "rag", "kubeflow", "mlflow", "machine learning", "prompt engineering"]],
  ["Databases", ["database", "postgres", "sql", "kafka"]],
  ["Behavioral / HR", ["behav", "hr", "leadership", "stakeholder", "experience"]]
];

function classifyTopic(entry) {
  const text = [entry.category, entry.section, entry.question].filter(Boolean).join(" ").toLowerCase();
  for (const [topic, keywords] of TOPIC_RULES) {
    if (keywords.some((keyword) => text.includes(keyword))) return topic;
  }
  return "General";
}

function parseLargeBank() {
  const text = fs.readFileSync(path.join(ROOT, "1000 DevOps + MLOps + Kubernetes + GCP Interview Questions.txt"), "utf8");
  const lines = text.split(/\r?\n/);
  const entries = [];
  let section = "General";
  let current = null;
  const questionStem = /^(what|why|how|when|where|which|who|explain|describe|difference|design|scenario|tell|a pod|pods)\b/i;
  function flush() {
    if (!current) return;
    current.answer = current.answerLines.join("\n").trim();
    delete current.answerLines;
    if (current.answer) entries.push(current);
    current = null;
  }
  for (const line of lines) {
    const sm = line.match(/^Section\s+\d+:\s+(.+)$/);
    if (sm) { flush(); section = sm[1].trim(); continue; }
    const qm = line.match(/^\s*(\d+)\.\s+(.+)$/);
    if (qm && questionStem.test(qm[2].trim())) {
      flush();
      current = { source: "Large Technical Bank", section, question: qm[2].trim(), answerLines: [] };
      continue;
    }
    if (current) current.answerLines.push(line);
  }
  flush();
  return entries;
}

function parseTechQa() {
  const p = path.join(ROOT, "technology-risk-interview-questions-and-answers.txt");
  if (!fs.existsSync(p)) return [];
  const text = fs.readFileSync(p, "utf8");
  const lines = text.split(/\r?\n/);
  const entries = [];
  let section = "Technology Risk";
  let current = null;
  function flush() {
    if (!current) return;
    current.answer = current.answerLines.join("\n").trim().replace(/^Answer:\s*/i, "");
    delete current.answerLines;
    if (current.answer) entries.push(current);
    current = null;
  }
  for (const line of lines) {
    if (/^[A-Za-z].+$/.test(line) && !/^Answer:/.test(line) && !/^\d+\./.test(line)) { section = line.trim(); continue; }
    const qm = line.match(/^\s*(\d+)\.\s+(.+)$/);
    if (qm) { flush(); current = { source: "Technology Risk Q&A", section, question: qm[2].trim(), answerLines: [] }; continue; }
    if (current) current.answerLines.push(line);
  }
  flush();
  return entries;
}

function extractArray(src, name) {
  const re = new RegExp("const " + name + " = (\\[[\\s\\S]*?\\n\\]);");
  const m = src.match(re);
  return new Function("return " + m[1])();
}

function loadAppBanks() {
  const src = fs.readFileSync(path.join(ROOT, "public", "app.js"), "utf8");
  const banks = {
    "GCP / DevOps / SRE Question Bank": "questionBank",
    "Scripting & Automation": "scriptingQuestionBank",
    "Docker": "dockerQuestionBank",
    "Python": "pythonQuestionBank",
    "FastAPI": "fastApiQuestionBank",
    "Coding Exercises": "codingQuestionBank",
    "Debug This Script": "debugQuestionBank",
    "Go": "goQuestionBank",
    "LLMOps / GenAI Production": "llmOpsQuestionBank",
    "Ansible": "ansibleQuestionBank",
    "Technology Risk - Technical": "techRiskTechnicalQuestionBank",
    "Technology Risk - Behavioral": "techRiskBehavioralQuestionBank",
    "HR / Behavioral Basics": "hrBehavioralQuestionBank",
    "Basic / One-Liner Concepts": "basicConceptQuestionBank"
  };
  const entries = [];
  for (const [section, varName] of Object.entries(banks)) {
    for (const question of extractArray(src, varName)) {
      entries.push({ source: "App Question Bank", section, question });
    }
  }
  return entries;
}

// Sets that read better grouped by topic (Part 2) than as another numbered
// practice round (Part 1) - map their title to the topic section name to file under.
const SECTION_TOPIC_OVERRIDES = {
  "Mock Interview 81 - Docker and Docker Compose Build Design": "Docker & Docker Compose (Build Design)",
  "Mock Interview 82 - Production DevOps Scenario Round (CI/CD, Kubernetes, Terraform, MLOps)": "Production DevOps Scenario Round (CI/CD, Kubernetes, Terraform, MLOps)",
  "Mock Interview 83 - Production Reliability and Observability Behavioral Round": "Behavioral - Reliability & Observability",
  "Mock Interview 84 - Fugmo Lead GCP DevOps Engineer Screening": "Behavioral - Screening Rounds",
  "Mock Interview 85 - GenAI and LLM Engineering Round": "GenAI & LLM Engineering",
  "Mock Interview 86 - Advanced GCP Networking Round": "GCP Networking - Advanced Concepts",
  "Mock Interview 87 - GCP Networking Scenario Round": "GCP Networking - Troubleshooting Scenarios",
  "Mock Interview 88 - Cloud Migration Strategy Round": "Cloud Migration Strategy"
};

function loadMockSets() {
  const sets = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "mock-interview-sets.json"), "utf8"));
  const entries = [];
  for (const set of sets) {
    const section = SECTION_TOPIC_OVERRIDES[set.title] || set.title;
    for (const item of set.questions) {
      entries.push({ source: "Fixed Mock Interview Sets", section, category: item.category, question: item.question });
    }
  }
  return entries;
}

function loadCodingAnswerBank() {
  const p = path.join(__dirname, "answer-bank", "08-coding.json");
  const obj = JSON.parse(fs.readFileSync(p, "utf8"));
  const entries = [];
  for (const [question, answer] of Object.entries(obj)) {
    entries.push({ source: "Coding Answer Bank", section: "Coding Exercises", category: null, question, answer });
  }
  return entries;
}

function loadImportedConversationQuestions() {
  const p = path.join(__dirname, "answer-bank", "imported-conversation-questions.json");
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function loadActualInterviewQuestions() {
  const dir = path.join(__dirname, "answer-bank");
  const generatedAnswersPath = path.join(dir, "actual-interview-generated-answers.json");
  const generatedAnswers = fs.existsSync(generatedAnswersPath)
    ? JSON.parse(fs.readFileSync(generatedAnswersPath, "utf8"))
    : {};
  const files = fs.readdirSync(dir)
    .filter((file) => /^actual-interview-handbook-part\d+\.json$/.test(file) || file === "actual-interview-new-questions.json")
    .sort();
  return files.flatMap((file) => JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")))
    .map((entry) => ({
      ...entry,
      source: entry.source || "Actual Interview Questions",
      answer: entry.answer || generatedAnswers[normalizeQuestion(entry.question)],
    }));
}

function loadGcpPrivateConnectivityQuestions() {
  const p = path.join(__dirname, "answer-bank", "87-gcp-psc-psa-policy-routing-questions.json");
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function loadGcpNetworkEngineerAdvancedQuestions() {
  const p = path.join(__dirname, "answer-bank", "88-gcp-network-engineer-jd-advanced.json");
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function loadLinuxComposerGkeInterviewQuestions() {
  const p = path.join(__dirname, "answer-bank", "89-linux-composer-gke-interview-round.json");
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function loadDataScienceScenarioQuestions() {
  const p = path.join(__dirname, "answer-bank", "90-data-science-scenario-beginner-to-expert.json");
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function loadAiAgentEngineerScenarioQuestions() {
  const p = path.join(__dirname, "answer-bank", "91-ai-agent-engineer-scenario-beginner-to-expert.json");
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function loadHandWrittenAnswers() {
  const dir = path.join(__dirname, "answer-bank");
  const merged = new Map();
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json") || ["needs-answer.json", "final-qa-dataset.json", "90-data-science-scenario-beginner-to-expert.json", "91-ai-agent-engineer-scenario-beginner-to-expert.json"].includes(file) || file.startsWith("actual-interview-")) continue;
    const obj = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    for (const [question, answer] of Object.entries(obj)) {
      const key = normalizeQuestion(question);
      if (key && !merged.has(key)) merged.set(key, answer);
    }
  }
  return merged;
}

function generatedAnswer(entry) {
  const category = entry.category || entry.section || "Technical";
  const question = entry.question;
  const lower = `${category} ${question}`.toLowerCase();
  const isTroubleshooting = /\b(troubleshoot|debug|investigate|fail|failing|error|pending|crash|down|slow|latency|timeout|exhaust|recover|restore|deleted|corrupt)\b/.test(lower);
  const isDifference = /\b(difference|compare|versus| vs |choose|prefer)\b/.test(lower);
  const isBehavioral = /\b(tell me about|handle disagreement|stakeholder|leadership|team member|management|communication|mentor|ownership|salary|notice period|relocate)\b/.test(lower);
  const subject = String(question || "")
    .replace(/^(what is|what are|explain|describe|define|how do you|how would you|why|when|where|which)\s+/i, "")
    .replace(/\?$/, "")
    .trim();
  const prefix = isDifference
    ? `${subject || "These options"} should be compared by purpose, scope, operational impact, rollback behavior, and production risk.`
    : isTroubleshooting
      ? "For this scenario, first confirm user impact, recent changes, and the failing layer; then isolate the issue with evidence before changing production."
      : isBehavioral
        ? "Use a truthful STAR answer: describe the situation, your ownership, the action you took, and the measurable result without inventing facts."
        : `${subject || question} is handled by understanding the production mechanism, the configuration involved, and the operational risk it controls.`;

  let example = "For validation, I would check logs, metrics, configuration, access permissions, and the post-change health signal before calling the issue closed.";
  if (/terraform|iac|state|module|provider|tfvars/.test(lower)) example = "Example commands: `terraform fmt`, `terraform validate`, `terraform plan`, then apply only after reviewing drift, state, provider versions, variables, and backend locking.";
  else if (/kubernetes|gke|eks|pod|deployment|service|ingress|helm|istio/.test(lower)) example = "Example checks: `kubectl describe`, `kubectl get events`, `kubectl logs`, readiness probes, Service selectors, Ingress or Gateway routing, NetworkPolicy, DNS, and node capacity.";
  else if (/jenkins|github actions|gitlab|bitbucket|pipeline|ci\/cd|argo|gitops/.test(lower)) example = "In CI/CD I would verify the trigger, checked-out commit, credentials, runner or agent, artifact version, environment approval, deployment logs, health checks, and rollback path.";
  else if (/gcp|cloud armor|load balanc|iam|vpc|firewall|nat|dns|private service connect|psc/.test(lower)) example = "In GCP I would validate IAM, project and region scope, VPC routing, firewall rules, health checks, Cloud Logging, audit logs, quotas, and the exact resource policy.";
  else if (/prometheus|grafana|monitor|logging|tracing|observability|slo|sli|alert/.test(lower)) example = "For observability, I would define the user-impact metric, use labels carefully, check percentiles and error rates, connect alerts to runbooks, and avoid noisy or high-cardinality signals.";
  else if (/mlops|vertex|mlflow|kubeflow|model|llm|rag|vector/.test(lower)) example = "For MLOps, I would version code, data, parameters, artifacts, and model registry entries, then monitor latency, errors, drift, quality, cost, and rollback readiness.";
  else if (/git|branch|merge|rebase|reset|revert|cherry-pick/.test(lower)) example = "For Git, I would state whether the command rewrites history, affects shared branches, or creates a new commit, then verify with `git status`, `git log --oneline`, and `git reflog` if recovery is needed.";
  else if (/python|bash|shell|script|api/.test(lower)) example = "For scripting or APIs, I would use input validation, clear exit codes, retries with backoff, timeouts, structured logs, idempotency, and tests for failure cases.";

  if (/apply a stash/i.test(question)) return "Use `git stash apply` to reapply the latest stash while keeping the stash entry, or `git stash apply stash@{n}` for a specific one. First run `git stash list`, confirm the target, then apply it from a clean working tree if possible. Resolve conflicts like a normal merge, run tests, and use `git status` to verify the result. Use `git stash pop` only when you want Git to remove the stash after a successful apply.";
  if (/terraform drift/i.test(question)) return "Terraform drift means the real infrastructure no longer matches the Terraform state and code, usually because someone changed a resource manually, an external controller modified it, or a provider default changed. I detect it with `terraform plan` in a read-only review pipeline and by checking cloud audit logs for manual updates. To fix it, either update the code to match the intended change or revert the cloud resource back to code. The risk is blindly applying and accidentally deleting or replacing production resources.";

  return `${prefix} In ${category}, the practical answer is to state what changes, who or what is affected, and how it is verified. ${example} In an interview, also mention the key failure mode, the security or reliability trade-off, and the rollback or recovery step so the answer sounds production-ready instead of theoretical.`;
}

// Build the answer lookup: large bank + tech risk QA (real, sourced answers) first,
// then hand-written answers for everything else.
const largeBank = parseLargeBank();
const techQa = parseTechQa();
const handWritten = loadHandWrittenAnswers();

const answerByQuestion = new Map();
for (const e of [...largeBank, ...techQa]) {
  const key = normalizeQuestion(e.question);
  if (key && e.answer && !answerByQuestion.has(key)) answerByQuestion.set(key, e.answer);
}
for (const [key, answer] of handWritten) {
  if (!answerByQuestion.has(key)) answerByQuestion.set(key, answer);
}

// Source priority: mock sets first (curated rounds), then the app question banks
// (the primary practice pool), then large bank / tech-risk txt as supplementary depth.
const mockSets = loadMockSets();
const appBanks = loadAppBanks();
const codingBank = loadCodingAnswerBank();
const importedConversationQuestions = loadImportedConversationQuestions();
const actualInterviewQuestions = loadActualInterviewQuestions();
const gcpPrivateConnectivityQuestions = loadGcpPrivateConnectivityQuestions();
const gcpNetworkEngineerAdvancedQuestions = loadGcpNetworkEngineerAdvancedQuestions();
const linuxComposerGkeInterviewQuestions = loadLinuxComposerGkeInterviewQuestions();
const dataScienceScenarioQuestions = loadDataScienceScenarioQuestions();
const aiAgentEngineerScenarioQuestions = loadAiAgentEngineerScenarioQuestions();

const allSources = [...mockSets, ...codingBank, ...appBanks, ...dataScienceScenarioQuestions, ...aiAgentEngineerScenarioQuestions, ...actualInterviewQuestions, ...importedConversationQuestions, ...gcpPrivateConnectivityQuestions, ...gcpNetworkEngineerAdvancedQuestions, ...linuxComposerGkeInterviewQuestions, ...techQa, ...largeBank];

const seen = new Set();
const seenCanonical = new Set();
const finalEntries = [];
let generatedAnswers = 0;
let duplicatesRemoved = 0;
for (const e of allSources) {
  const key = normalizeQuestion(e.question);
  const canonicalKey = canonicalQuestionKey(e.question);
  if (!key || seen.has(key) || seenCanonical.has(canonicalKey)) {
    duplicatesRemoved++;
    continue;
  }
  seen.add(key);
  seenCanonical.add(canonicalKey);
  const directAnswer = placeholderAnswer(e.answer) ? "" : e.answer;
  const bankAnswer = placeholderAnswer(answerByQuestion.get(key)) ? "" : answerByQuestion.get(key);
  const answer = directAnswer || bankAnswer || generatedAnswer(e);
  if (!answerByQuestion.has(key) && !e.answer) generatedAnswers++;
  finalEntries.push({
    source: e.source,
    section: e.section,
    category: e.category || e.section || classifyTopic(e),
    topic: e.topic || classifyTopic(e),
    difficulty: e.difficulty || null,
    questionType: e.questionType || classifyQuestionType(e.question),
    question: e.question,
    answer
  });
}

console.log(`Total unique questions with answers: ${finalEntries.length}`);
console.log(`Duplicate source questions removed: ${duplicatesRemoved}`);
console.log(`Generated answer guidance: ${generatedAnswers}`);

const outPath = path.join(__dirname, "answer-bank", "final-qa-dataset.json");
fs.writeFileSync(outPath, JSON.stringify(finalEntries, null, 2));
console.log("Wrote", path.relative(ROOT, outPath));

// Slim copy served to the browser: powers the in-app question bank reader
// and the "questions covered" stat. Excludes nothing sensitive - same data,
// just placed where the client can fetch it directly.
const publicPath = path.join(ROOT, "public", "qa-dataset.json");
fs.writeFileSync(publicPath, JSON.stringify(finalEntries));
console.log("Wrote", path.relative(ROOT, publicPath));

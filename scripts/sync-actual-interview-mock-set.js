const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const sourcePath = path.join(__dirname, "answer-bank", "actual-interview-new-questions.json");
const mockSetsPath = path.join(root, "public", "mock-interview-sets.json");
const reservedId = "actual-interview-latest";

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const unique = new Map();
for (const entry of source) {
  const key = normalize(entry.question);
  if (key && !unique.has(key)) unique.set(key, entry);
}

const sets = JSON.parse(fs.readFileSync(mockSetsPath, "utf8")).filter((set) => set.id !== reservedId);
if (unique.size) {
  sets.push({
    id: reservedId,
    title: "Actually Asked Interview Questions - Latest Additions",
    focus: "New interview questions captured from real interview messages",
    questions: [...unique.values()].map((entry) => ({
      category: entry.category || entry.section || "Actual Interview",
      question: entry.question,
    })),
  });
}
fs.writeFileSync(mockSetsPath, `${JSON.stringify(sets, null, 2)}\n`);
console.log(`Synced ${unique.size} latest actual-interview questions into mock-interview-sets.json`);

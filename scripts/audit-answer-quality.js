const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const targets = [
  path.join(__dirname, "answer-bank", "final-qa-dataset.json"),
  path.join(root, "public", "qa-dataset.json"),
];
const placeholderPatterns = [
  /a strong answer should/i,
  /tailor the response directly to/i,
  /use the prompt details as acceptance criteria/i,
  /start with the expected configuration, command, workflow/i,
  /the direct answer is to define/i,
  /i would explain the main mechanism/i,
];

let failed = false;
for (const target of targets) {
  const entries = JSON.parse(fs.readFileSync(target, "utf8"));
  const placeholders = entries.filter((entry) => placeholderPatterns.some((pattern) => pattern.test(entry.answer || "")));
  console.log(`${path.relative(root, target)}: ${placeholders.length} placeholder-style answers out of ${entries.length}`);
  if (placeholders.length) failed = true;
}

if (failed) process.exitCode = 1;

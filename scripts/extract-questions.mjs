import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const README_PATH = path.join(__dirname, "../README.md");
const OUT_DIR = path.join(__dirname, "../study-site/data");
const OUT_FILE = path.join(OUT_DIR, "questions.json");

const QUESTIONS_START_MARKER = "<!-- QUESTIONS_START -->";
const QUESTIONS_END_MARKER = "<!-- QUESTIONS_END -->";

const QUESTION_HEADING_RE = /^(\d+)\.\s+###\s+(.+)$/;

const BACK_TO_TOP_RE = /\n?\s*\*\*\[⬆ Back to Top\]\(#table-of-contents\)\*\*\s*\n?/g;

function stripBackToTop(md) {
  return md.replace(BACK_TO_TOP_RE, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

const raw = fs
  .readFileSync(README_PATH)
  .toString()
  .replace(/\r\n/g, "\n");

const lines = raw.split("\n");
const startIdx = lines.findIndex((l) => l === QUESTIONS_START_MARKER);
const endIdx = lines.findIndex((l) => l === QUESTIONS_END_MARKER);

if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
  throw new Error("QUESTIONS_START / QUESTIONS_END markers not found or invalid order.");
}

const sectionLines = lines.slice(startIdx + 1, endIdx);

const questions = [];
let current = null;

for (const line of sectionLines) {
  const m = line.match(QUESTION_HEADING_RE);
  if (m) {
    if (current) {
      questions.push({
        number: current.number,
        title: current.title,
        bodyMarkdown: stripBackToTop(current.bodyLines.join("\n")),
      });
    }
    current = {
      number: parseInt(m[1], 10),
      title: m[2].trim(),
      bodyLines: [],
    };
  } else if (current) {
    current.bodyLines.push(line);
  }
}

if (current) {
  questions.push({
    number: current.number,
    title: current.title,
    bodyMarkdown: stripBackToTop(current.bodyLines.join("\n")),
  });
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(questions, null, 0), "utf8");

console.info(`Wrote ${questions.length} questions to ${path.relative(process.cwd(), OUT_FILE)}`);

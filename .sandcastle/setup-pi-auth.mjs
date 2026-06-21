import fs from "node:fs";
import os from "node:os";

const key = process.env.OLLAMA_API_KEY;
if (!key) {
  console.error("OLLAMA_API_KEY is required — set it in .sandcastle/.env");
  process.exit(1);
}

const dir = `${os.homedir()}/.pi/agent`;
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(
  `${dir}/auth.json`,
  JSON.stringify({ "ollama-cloud": { type: "api_key", key } }),
);

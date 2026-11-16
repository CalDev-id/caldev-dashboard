#!/usr/bin/env node

import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { open } from "node:fs/promises";
import { createInterface, emitKeypressEvents } from "node:readline";
import { basename, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const scrypt = promisify(scryptCallback);
const projectRoot = fileURLToPath(new URL("../../", import.meta.url));

function ask(question) {
  return new Promise((resolve) => {
    const terminal = createInterface({ input: process.stdin, output: process.stdout });
    terminal.question(question, (answer) => {
      terminal.close();
      resolve(answer);
    });
  });
}

function askHidden(question) {
  return new Promise((resolve, reject) => {
    let value = "";
    const input = process.stdin;
    const wasRaw = Boolean(input.isRaw);
    process.stdout.write(question);
    emitKeypressEvents(input);
    input.setRawMode(true);
    input.resume();

    function finish(error) {
      input.off("keypress", onKeypress);
      input.setRawMode(wasRaw);
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    }

    function onKeypress(character, key) {
      if (key?.ctrl && key.name === "c") {
        finish(new Error("Dibatalkan."));
      } else if (key?.name === "return" || key?.name === "enter") {
        finish();
      } else if (key?.name === "backspace") {
        value = Array.from(value).slice(0, -1).join("");
      } else if (character && !key?.ctrl && !key?.meta && character >= " " && character !== "\x7f") {
        value += character;
      }
    }

    input.on("keypress", onKeypress);
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 0 && (args.length !== 2 || args[0] !== "--output" || !args[1])) {
    throw new Error("Gunakan tanpa argumen atau --output PATH. Password tidak diterima sebagai argumen.");
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Terminal interaktif diperlukan.");
  const outputPath = args.length === 2
    ? resolve(args[1])
    : fileURLToPath(new URL("../.env.local", import.meta.url));
  const filename = basename(outputPath);
  if (outputPath.startsWith(projectRoot) && filename !== ".env" && !filename.startsWith(".env.")) {
    throw new Error("Di dalam project, output harus bernama .env atau .env.* agar diabaikan Git.");
  }

  const email = (await ask("Admin email: ")).trim().toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) {
    throw new Error("Format email tidak valid.");
  }

  const password = await askHidden("Password admin (minimal 8 karakter): ");
  const confirmation = await askHidden("Ulangi password: ");
  if (password.length < 8) throw new Error("Password minimal 8 karakter.");
  if (password !== confirmation) throw new Error("Password tidak cocok.");

  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  const secret = randomBytes(32).toString("base64url");
  const contents = [
    `AUTH_SECRET=${secret}`,
    `ADMIN_EMAIL=${email}`,
    `ADMIN_PASSWORD_HASH=scrypt:32768:8:1:${salt.toString("hex")}:${hash.toString("hex")}`,
    "",
  ].join("\n");

  const file = await open(outputPath, "wx", 0o600);
  try {
    await file.writeFile(contents, "utf8");
  } finally {
    await file.close();
  }
  process.stdout.write(`Credentials disimpan ke ${outputPath} (mode 0600). Nilainya tidak ditampilkan.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Gagal menyiapkan credentials."}\n`);
  process.exitCode = 1;
});

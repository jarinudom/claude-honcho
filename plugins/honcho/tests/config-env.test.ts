import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { runInSandbox } from "./sandbox";

function loadSaveMessages(fileConfig: Record<string, unknown>, env: Record<string, string>): boolean {
  const home = mkdtempSync(join(tmpdir(), "honcho-home-"));
  try {
    mkdirSync(join(home, ".honcho"), { recursive: true });
    writeFileSync(join(home, ".honcho", "config.json"), JSON.stringify({ apiKey: "k", peerName: "t", ...fileConfig }));
    const out = runInSandbox(
      home,
      `import { loadConfig } from "./src/config.ts";
       console.log(JSON.stringify(loadConfig("claude_code")?.saveMessages));`,
      env,
    );
    return JSON.parse(out);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

describe("HONCHO_SAVE_MESSAGES over a config file", () => {
  // The README documents HONCHO_SAVE_MESSAGES=false as the way to stop saving
  // messages. Whenever config.json exists the env var has to win over it, or
  // it silently does nothing.
  test.each([
    ["file without saveMessages, env false", {}, { HONCHO_SAVE_MESSAGES: "false" }, false],
    ["root saveMessages: true, env false", { saveMessages: true }, { HONCHO_SAVE_MESSAGES: "false" }, false],
    ["host-block saveMessages: true, env false", { hosts: { claude_code: { saveMessages: true } } }, { HONCHO_SAVE_MESSAGES: "false" }, false],
    ["file saveMessages: false, env true (env only turns saving off)", { saveMessages: false }, { HONCHO_SAVE_MESSAGES: "true" }, false],
    ["file saveMessages: true, env unset", { saveMessages: true }, {}, true],
  ])("%s", (_name, fileConfig, env, expected) => {
    expect(loadSaveMessages(fileConfig, env)).toBe(expected);
  });
});

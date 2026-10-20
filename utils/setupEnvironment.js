const fs = require("node:fs");
const path = require("node:path");
const { randomBytes } = require("node:crypto");
const { parseEnv } = require("node:util");

function setupEnvironment(directory) {
  const localPath = path.join(directory, ".env.local");
  const contents = fs.existsSync(localPath)
    ? fs.readFileSync(localPath, "utf8")
    : fs.readFileSync(path.join(directory, ".env.example"), "utf8");
  const { JWT_SECRET } = parseEnv(contents);
  if (
    !JWT_SECRET ||
    JWT_SECRET.trim().length < 32 ||
    JWT_SECRET === "replace_with_a_generated_private_secret"
  ) {
    const secret = randomBytes(32).toString("hex");
    const updated = /^JWT_SECRET\s*=/m.test(contents)
      ? contents.replace(/^JWT_SECRET\s*=.*$/m, `JWT_SECRET=${secret}`)
      : `${contents.trimEnd()}\nJWT_SECRET=${secret}\n`;
    fs.writeFileSync(localPath, updated, { mode: 0o600 });
  } else if (!fs.existsSync(localPath)) {
    fs.writeFileSync(localPath, contents, { mode: 0o600 });
  }
}

module.exports = setupEnvironment;

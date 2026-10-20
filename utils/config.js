const { JWT_SECRET } = process.env;

if (
  typeof JWT_SECRET !== "string" ||
  JWT_SECRET.trim().length < 32 ||
  JWT_SECRET === "replace_with_a_generated_private_secret"
) {
  throw new Error(
    "Set JWT_SECRET to a private random value of at least 32 characters"
  );
}

module.exports = { JWT_SECRET };

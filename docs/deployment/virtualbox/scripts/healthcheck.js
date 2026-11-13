
const API_URL = process.env.HEALTHCHECK_URL || "http://127.0.0.1:3001/";

async function checkApi() {
  const response = await fetch(API_URL, {
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Express returned HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== "ok") {
    throw new Error("Unexpected API health response");
  }

  console.log("Express HTTP status:", response.status);
}

checkApi().catch((error) => {
  console.error("Health check failed:", error.message);
  process.exitCode = 1;
});

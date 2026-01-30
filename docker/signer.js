import http from "http";
import crypto from "crypto";

/**
 * Base64url encode helper
 */
function b64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * Convert SHA1 hex thumbprint to base64url (for x5t header)
 */
function hexToB64UrlThumbprint(hex) {
  const clean = (hex || "").replace(/[^0-9a-fA-F]/g, "");
  return b64url(Buffer.from(clean, "hex"));
}

/**
 * Normalize PEM key from env:
 * - strip quotes
 * - convert literal \\n → real newlines
 * - validate PEM structure
 */
function normalizePrivateKeyFromEnv(envValue) {
  if (!envValue) throw new Error("missing GRAPH_PRIVATE_KEY_PEM");

  const key = String(envValue)
    .trim()
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "")
    .replace(/\\n/g, "\n");

  if (!key.includes("BEGIN PRIVATE KEY")) {
    throw new Error("GRAPH_PRIVATE_KEY_PEM is not a valid PEM (missing BEGIN PRIVATE KEY)");
  }

  if (!key.includes("\n")) {
    throw new Error("GRAPH_PRIVATE_KEY_PEM has no newlines after normalization");
  }

  return key;
}

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/assertion") {
    res.writeHead(404);
    return res.end();
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    try {
      // Parse request body
      const { tenantId, clientId, thumbprintSha1 } = JSON.parse(body || "{}");

      if (!tenantId || !clientId || !thumbprintSha1) {
        throw new Error("missing tenantId, clientId or thumbprintSha1");
      }

      // Normalize private key from env
      const privateKeyPem = normalizePrivateKeyFromEnv(
        process.env.GRAPH_PRIVATE_KEY_PEM
      );

      // Build token
      const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
      const now = Math.floor(Date.now() / 1000);

      const header = {
        alg: "RS256",
        typ: "JWT",
        x5t: hexToB64UrlThumbprint(thumbprintSha1),
      };

      const payload = {
        aud: tokenUrl,
        iss: clientId,
        sub: clientId,
        jti: crypto.randomUUID(),
        nbf: now - 10,
        exp: now + 300,
      };

      const unsignedJwt =
        `${b64url(JSON.stringify(header))}.` +
        `${b64url(JSON.stringify(payload))}`;

      // Sign
      const signer = crypto.createSign("RSA-SHA256");
      signer.update(unsignedJwt);
      signer.end();

      const signature = signer.sign(privateKeyPem);
      const jwt = `${unsignedJwt}.${b64url(signature)}`;

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          tokenUrl,
          client_assertion: jwt,
        })
      );
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err.message || err) }));
    }
  });
});

server.listen(3003, "0.0.0.0", () => {
  console.log("graph-signer listening on :3003");
});

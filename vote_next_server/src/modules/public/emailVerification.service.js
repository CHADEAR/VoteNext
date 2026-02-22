const dns = require("dns").promises;
const https = require("https");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * ตรวจ format อีเมล
 */
function checkFormat(email) {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  return EMAIL_REGEX.test(trimmed);
}

/**
 * ตรวจ MX record ของ domain
 */
async function checkMx(email) {
  const domain = email.split("@")[1];
  if (!domain) return false;
  try {
    const records = await dns.resolveMx(domain);
    return Array.isArray(records) && records.length > 0;
  } catch {
    return false;
  }
}

/**
 * ตรวจอีเมลผ่าน Hunter API (รวม Gmail — ไม่ข้าม)
 * valid, accept_all, unknown = อนุญาต | invalid = ไม่อนุญาต (กันเมลปลอมเช่น gg@gmail.com)
 */
async function checkHunter(email, apiKey) {
  if (!apiKey) {
    console.warn("HUNTER_API_KEY not set, skipping Hunter check");
    return true;
  }
  const encoded = encodeURIComponent(email);
  const url = `https://api.hunter.io/v2/email-verifier?email=${encoded}&api_key=${apiKey}`;
  return new Promise((resolve) => {
    https
      .get(url, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(body);
            const status = json?.data?.status;
            const errors = json?.errors;

            if (errors) {
              console.warn("[Hunter] API error for", email, errors);
              resolve(false);
              return;
            }

            const ok =
              status === "valid" ||
              status === "accept_all" ||
              status === "unknown";
            if (!ok) {
              console.warn("[Hunter] status not accepted for", email, "status:", status);
            }
            resolve(ok);
          } catch (e) {
            console.warn("[Hunter] parse error", e.message, "body length:", body?.length);
            resolve(false);
          }
        });
      })
      .on("error", (err) => {
        console.warn("[Hunter] request error", err.message);
        resolve(false);
      });
  });
}

module.exports = {
  checkFormat,
  checkMx,
  checkHunter,
};

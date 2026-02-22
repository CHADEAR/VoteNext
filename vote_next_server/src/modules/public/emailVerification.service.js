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
 * ตรวจอีเมลผ่าน Hunter API v2 (ทุกโดเมน)
 * อนุญาตเฉพาะ status === "valid" เท่านั้น
 * invalid, accept_all, disposable, unknown → return false
 */
async function checkHunter(email, apiKey) {
  // ถ้าไม่มี API key ให้ใช้ค่าจาก environment variable
  const hunterKey = apiKey || process.env.HUNTER_API_KEY;
  
  if (!hunterKey) {
    console.warn("HUNTER_API_KEY not set, skipping Hunter check");
    console.warn("Please add HUNTER_API_KEY to your .env file");
    return true;
  }
  
  console.log(`[Hunter] Verifying email: ${email}`);
  
  const encoded = encodeURIComponent(email);
  const url = `https://api.hunter.io/v2/email-verifier?email=${encoded}&api_key=${hunterKey}`;

  let body;
  try {
    body = await new Promise((resolve, reject) => {
      const req = https.get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      });
      
      req.on("error", reject);
      req.on("timeout", () => reject(new Error("Request timeout")));
      
      req.setTimeout(10000); // 10 seconds timeout
    });
  } catch (err) {
    console.warn("[Hunter] request error", err.message);
    throw new Error("การตรวจสอบอีเมลล้มเหลว (เชื่อมต่อ Hunter ไม่ได้)");
  }

  try {
    const json = JSON.parse(body);
    console.log(`[Hunter] Response for ${email}:`, json);
    
    if (json?.errors) {
      console.warn("[Hunter] API error for", email, json.errors);
      const errMsg = json.errors?.[0]?.message || json.errors?.message || JSON.stringify(json.errors);
      throw new Error(`การตรวจสอบอีเมลล้มเหลว (Hunter: ${errMsg})`);
    }
    
    const data = json?.data ?? {};
    const status = data.status;
    const disposable = data.disposable === true;
    const acceptAll = data.accept_all === true;
    const block = data.block === true;

    console.log(`[Hunter] Email ${email} - Status: ${status}, Disposable: ${disposable}, Accept All: ${acceptAll}`);

    if (block) {
      throw new Error("อีเมลนี้ถูก block โดย Hunter");
    }
    if (disposable) {
      throw new Error("ไม่อนุญาตอีเมลแบบใช้แล้วทิ้ง (disposable)");
    }
    if (acceptAll) {
      throw new Error("โดเมนนี้ไม่สามารถยืนยันได้ (accept-all)");
    }
    if (status !== "valid") {
      const reason =
        status === "invalid"
          ? "อีเมลไม่ถูกต้องหรือไม่มีอยู่จริง"
          : status === "unknown"
            ? "ไม่สามารถยืนยันอีเมลนี้ได้ (unknown)"
            : `อีเมลไม่ผ่านการตรวจสอบ (สถานะ: ${status || "ไม่มีข้อมูล"})`;
      throw new Error(reason);
    }
    
    console.log(`[Hunter] Email ${email} verified successfully`);
    return true;
  } catch (e) {
    if (e.message && e.message.startsWith("การตรวจสอบ") && !e.message.includes("parse")) {
      throw e;
    }
    console.warn("[Hunter] parse error", e.message, "body length:", body?.length);
    throw new Error("การตรวจสอบอีเมลล้มเหลว (ข้อมูลตอบกลับไม่ถูกต้อง)");
  }
}

module.exports = {
  checkFormat,
  checkMx,
  checkHunter,
};

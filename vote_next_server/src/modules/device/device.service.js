// vote_next_server/src/modules/device/device.service.js
const DeviceModel = require("./device.model");

// เก็บสถานะ active แบบ in-memory (ช่วยให้ push ไปหาอุปกรณ์ได้ทันที)
const activeByShow = new Map(); // showId -> payload

let wssRef = null;
function attachWss(wss) {
  wssRef = wss;
}

function broadcast(obj) {
  if (!wssRef) return;
  const msg = JSON.stringify(obj);
  wssRef.clients.forEach((c) => {
    if (c.readyState === 1) c.send(msg);
  });
}

// admin เรียกตอน "เปิดโหวต"
function setActivePoll(showId, payload) {
  activeByShow.set(String(showId), payload);
  broadcast({ type: "poll_open", payload });
}

// admin เรียกตอน "ปิดโหวต"
function closePoll(showId) {
  activeByShow.delete(String(showId));
  broadcast({ type: "poll_close", payload: { showId: String(showId) } });
}

// device เรียกเพื่อขอสถานะปัจจุบัน
async function getActivePoll(showId) {
  const key = String(showId);
  if (activeByShow.has(key)) return activeByShow.get(key);

  // fallback: ดึงจาก DB ตาม schema จริง
  const round = await DeviceModel.getCurrentVotingRound(showId);
  if (!round) return null;

  const contestants = await DeviceModel.getContestantsByShow(showId, 4);
  const payload = {
    showId: String(showId),
    roundId: String(round.id),
    title: round.round_name || "Voting",
    open: true,
    choices: contestants.map((c) => ({
      id: String(c.id),
      label: c.stage_name,
      imageUrl: c.image_url || "",
    })),
  };

  activeByShow.set(key, payload);
  return payload;
}

module.exports = {
  attachWss,
  setActivePoll,
  closePoll,
  getActivePoll,
};

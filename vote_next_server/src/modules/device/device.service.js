// vote_next_server/src/modules/device/device.service.js
const DeviceModel = require("./device.model");

let _wss = null;
const _activePollByShow = new Map();

function attachWss(wss) {
  _wss = wss;
}

function broadcast(type, payload) {
  if (!_wss) return;
  const msg = JSON.stringify({ type, payload });
  _wss.clients.forEach((c) => {
    if (c.readyState === 1) c.send(msg);
  });
}

function setActivePoll(showId, payload) {
  const sid = String(showId);
  _activePollByShow.set(sid, payload);

  // ส่งให้ TFT ได้ทั้ง 2 แบบ กันพัง
  broadcast("active", payload);
  broadcast("poll_open", payload);
}

function closePoll(showId) {
  const sid = String(showId);
  _activePollByShow.delete(sid);
  broadcast("poll_close", { showId: sid });
}

async function getActivePoll(showId) {
  const sid = String(showId);
  if (_activePollByShow.has(sid)) return _activePollByShow.get(sid);

  // fallback: ดึงจาก DB
  const round = await DeviceModel.getCurrentVotingRound(sid);
  if (!round) return null;

  const contestants = await DeviceModel.getContestantsByRound(String(round.id), 4);

  const payload = {
    showId: sid,
    roundId: String(round.id),
    title: round.round_name || "Voting",
    open: true,
    choices: (contestants || []).map((c) => ({
      id: String(c.id),
      label: c.stage_name,
      imageUrl: c.image_url || "",
    })),
  };

  _activePollByShow.set(sid, payload);
  return payload;
}

module.exports = {
  attachWss,
  setActivePoll,
  closePoll,
  getActivePoll,
};

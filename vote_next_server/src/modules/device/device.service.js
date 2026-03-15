// vote_next_server/src/modules/device/device.service.js
const DeviceModel = require("./device.model");

let _wss = null;
const _activePollByShow = new Map();

function attachWss(wss) {
  _wss = wss;
}

function normalizeChoice(item = {}) {
  const id =
    item.id ||
    item.contestantId ||
    item.contestant_id ||
    item.choiceId ||
    item.choice_id ||
    "";

  const label =
    item.label ||
    item.stage_name ||
    item.stageName ||
    item.name ||
    item.title ||
    "";

  const imageUrl =
    item.imageUrl ||
    item.image_url ||
    item.photoUrl ||
    item.photo_url ||
    item.imgUrl ||
    item.avatar ||
    "";

  if (!id) return null;

  return {
    id: String(id),
    label: String(label || id),
    imageUrl: String(imageUrl || ""),
  };
}

function normalizePayload(showId, payload = {}) {
  const rawChoices = Array.isArray(payload.choices)
    ? payload.choices
    : Array.isArray(payload.contestants)
    ? payload.contestants
    : Array.isArray(payload.candidates)
    ? payload.candidates
    : Array.isArray(payload.options)
    ? payload.options
    : Array.isArray(payload.items)
    ? payload.items
    : [];

  const choices = rawChoices.map(normalizeChoice).filter(Boolean);

  return {
    showId: String(showId),
    roundId: String(
      payload.roundId ||
        payload.round_id ||
        payload.pollId ||
        payload.poll_id ||
        payload.id ||
        ""
    ),
    title:
      payload.title ||
      payload.round_name ||
      payload.roundName ||
      payload.name ||
      "Voting",
    description:
      payload.description ||
      payload.desc ||
      payload.detail ||
      payload.details ||
      "",
    open: payload.open !== false,
    choices,
  };
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
  const normalized = normalizePayload(sid, payload);

  _activePollByShow.set(sid, normalized);

  broadcast("active", normalized);
  broadcast("poll_open", normalized);
}

function closePoll(showId) {
  const sid = String(showId);
  _activePollByShow.delete(sid);
  broadcast("poll_close", { showId: sid });
}

async function getActivePoll(showId) {
  const sid = String(showId);

  if (_activePollByShow.has(sid)) {
    return _activePollByShow.get(sid);
  }

  const round = await DeviceModel.getCurrentVotingRound(sid);
  if (!round) {
    console.log("[device] no active voting round for showId =", sid);
    return null;
  }

  let contestants = await DeviceModel.getContestantsByRound(String(round.id));

  // fallback ถ้า round_contestants ยังไม่มีข้อมูล
  if (!contestants || contestants.length === 0) {
    contestants = await DeviceModel.getContestantsByShow(sid, 4);
  }

  const payload = normalizePayload(sid, {
    roundId: round.id,
    title: round.round_name || "Voting",
    description: round.description || "",
    open: true,
    choices: (contestants || []).map((c) => ({
      id: c.id,
      label: c.stage_name,
      imageUrl: c.image_url || "",
    })),
  });

  console.log("[device] getActivePoll =>", {
    showId: sid,
    roundId: round.id,
    choiceCount: payload.choices.length,
  });

  _activePollByShow.set(sid, payload);
  return payload;
}

module.exports = {
  attachWss,
  setActivePoll,
  closePoll,
  getActivePoll,
};
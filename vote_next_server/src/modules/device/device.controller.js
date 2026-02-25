// vote_next_server/src/modules/device/device.controller.js
const DeviceModel = require("./device.model");
const DeviceService = require("./device.service");

async function registerDevice(req, res, next) {
  try {
    const { deviceId, ownerLabel } = req.body;
    if (!deviceId) return res.status(400).json({ ok: false, message: "deviceId required" });

    const row = await DeviceModel.upsertRemoteDevice(String(deviceId), ownerLabel || null);
    return res.json({
      ok: true,
      deviceUuid: row.id,
      deviceId: row.device_id,
      ownerLabel: row.owner_label,
    });
  } catch (e) {
    next(e);
  }
}

async function getActive(req, res, next) {
  try {
    const showId = req.query.showId || req.query.roomId; // เผื่อเรียก roomId
    if (!showId) return res.status(400).json({ ok: false, message: "showId required" });

    const payload = await DeviceService.getActivePoll(showId);
    return res.json({ ok: true, payload });
  } catch (e) {
    next(e);
  }
}

async function vote(req, res, next) {
  try {
    const { deviceId, showId, roundId, contestantId, choiceId } = req.body;

    // ✅ รองรับทั้ง contestantId และ choiceId (กันฝั่ง ESP32 ส่งคนละชื่อ)
    const cid = contestantId || choiceId;

    if (!deviceId || !cid) {
      return res.status(400).json({ ok: false, message: "deviceId and contestantId required" });
    }

    // ถ้าไม่ส่ง roundId มา ให้ server หาให้จาก showId
    let rid = roundId;
    let sid = showId;

    if (!rid) {
      if (!sid) return res.status(400).json({ ok: false, message: "showId required when roundId missing" });

      const round = await DeviceModel.getCurrentVotingRound(String(sid));
      if (!round) return res.status(404).json({ ok: false, message: "no active voting round" });
      rid = round.id;
    }

    let dev = await DeviceModel.findRemoteDeviceByDeviceId(String(deviceId));
    if (!dev) dev = await DeviceModel.upsertRemoteDevice(String(deviceId), null);

    const inserted = await DeviceModel.insertRemoteVote({
      roundId: String(rid),
      contestantId: String(cid),
      remoteDeviceUuid: String(dev.id),
    });

    if (!inserted) {
      return res.status(409).json({ ok: false, message: "already voted for this round" });
    }

    return res.json({ ok: true, roundId: String(rid) });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  registerDevice,
  getActive,
  vote,
};

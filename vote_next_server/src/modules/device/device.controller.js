// vote_next_server/src/modules/device/device.controller.js
const DeviceModel = require("./device.model");
const DeviceService = require("./device.service");

async function registerDevice(req, res, next) {
  try {
    const { deviceId, ownerLabel } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        ok: false,
        message: "deviceId required",
      });
    }

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
    // ✅ ใช้ showId จริงเท่านั้น
    const showId = req.query.showId;

    if (!showId) {
      return res.status(400).json({
        ok: false,
        message: "showId required",
      });
    }

    const payload = await DeviceService.getActivePoll(String(showId));

    return res.json({
      ok: true,
      payload: payload || null,
    });
  } catch (e) {
    next(e);
  }
}

async function vote(req, res, next) {
  try {
    const {
      deviceId,
      showId,
      roundId,
      pollId,        // ✅ รองรับเพิ่ม
      contestantId,
      choiceId,
    } = req.body;

    // ✅ รองรับหลายชื่อจากฝั่ง client/ESP32
    const cid = contestantId || choiceId;
    let rid = roundId || pollId;
    const sid = showId;

    if (!deviceId || !cid) {
      return res.status(400).json({
        ok: false,
        message: "deviceId and contestantId required",
      });
    }

    // ✅ ถ้าไม่มี roundId/pollId ให้หา active round จาก showId
    if (!rid) {
      if (!sid) {
        return res.status(400).json({
          ok: false,
          message: "showId required when roundId missing",
        });
      }

      const round = await DeviceModel.getCurrentVotingRound(String(sid));
      if (!round) {
        return res.status(404).json({
          ok: false,
          message: "no active voting round",
        });
      }

      rid = round.id;
    }

    let dev = await DeviceModel.findRemoteDeviceByDeviceId(String(deviceId));
    if (!dev) {
      dev = await DeviceModel.upsertRemoteDevice(String(deviceId), null);
    }

    const inserted = await DeviceModel.insertRemoteVote({
      roundId: String(rid),
      contestantId: String(cid),
      remoteDeviceUuid: String(dev.id),
    });

    if (!inserted) {
      return res.status(409).json({
        ok: false,
        message: "already voted for this round or contestant not in round",
      });
    }

    return res.json({
      ok: true,
      roundId: String(rid),
    });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  registerDevice,
  getActive,
  vote,
};
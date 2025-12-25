// vote_next_server/src/modules/admin/admin.poll.controller.js
const DeviceService = require("../device/device.service");

// เปิดโพลและ push ไป device ผ่าน WS
async function openPoll(req, res, next) {
  try {
    const { roomId = "default", pollId = "1", title = "Vote Poll", choices = [] } = req.body || {};

    const safeChoices = (Array.isArray(choices) ? choices : [])
      .slice(0, 4)
      .map((c, i) => ({
        id: String(c.id ?? i + 1),
        label: String(c.label ?? `Choice ${i + 1}`),
        desc: String(c.desc ?? ""),
      }));

    const poll = {
      id: String(pollId),
      title: String(title),
      roomId: String(roomId),
      open: true,
      choices: safeChoices,
    };

    DeviceService.setActivePoll(roomId, poll);

    return res.json({ ok: true, poll });
  } catch (err) {
    next(err);
  }
}

// ปิดโพลและ push ไป device
async function closePoll(req, res, next) {
  try {
    const { roomId = "default" } = req.body || {};
    DeviceService.closePoll(roomId);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { openPoll, closePoll };

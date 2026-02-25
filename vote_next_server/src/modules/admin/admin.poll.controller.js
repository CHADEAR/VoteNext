// vote_next_server/src/modules/admin/admin.poll.controller.js
const DeviceService = require("../device/device.service");
const DeviceModel = require("../device/device.model");
const { pool } = require("../../config/db");

// เปิดโพล mock แล้ว push ไป device ผ่าน WS
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

    // ใช้ roomId เป็น key แบบเดิม (กัน UI เพื่อนพัง)
    DeviceService.setActivePoll(String(roomId), poll);

    return res.json({ ok: true, poll });
  } catch (err) {
    next(err);
  }
}

// ปิดโพล mock แล้ว push ไป device
async function closePoll(req, res, next) {
  try {
    const { roomId = "default" } = req.body || {};
    DeviceService.closePoll(String(roomId));
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ✅ เปิดโพล "จาก DB จริง" แล้ว push ไป TFT
// POST /api/admin/polls/open-round
// body: { showId, roundId? }
async function openRoundPoll(req, res, next) {
  try {
    const { showId, roundId } = req.body || {};
    if (!showId && !roundId) {
      return res.status(400).json({ ok: false, message: "showId or roundId required" });
    }

    // 1) หา round
    let roundRow = null;

    if (roundId) {
      const r = await pool.query(
        `SELECT id, show_id, round_name, status
         FROM rounds
         WHERE id = $1`,
        [roundId]
      );
      if (!r.rowCount) return res.status(404).json({ ok: false, message: "Round not found" });
      roundRow = r.rows[0];
    } else {
      // ถ้าไม่ส่ง roundId มา จะเปิด “รอบที่กำลัง voting”
      roundRow = await DeviceModel.getCurrentVotingRound(showId);
      if (!roundRow) {
        return res.status(404).json({ ok: false, message: "No active voting round for this show" });
      }
    }

    const sid = String(roundRow.show_id || showId);
    const rid = String(roundRow.id);

    // 2) ดึง contestants ตามรอบ (สำคัญ)
    const contestants = await DeviceModel.getContestantsByRound(rid, 4);

    const payload = {
      showId: sid,
      roundId: rid,
      title: roundRow.round_name || "Voting",
      open: true,
      choices: contestants.map((c) => ({
        id: String(c.id),
        label: c.stage_name,
        imageUrl: c.image_url || "",
      })),
    };

    // 3) push ไป device ผ่าน WS (key = showId)
    DeviceService.setActivePoll(sid, payload);

    return res.json({ ok: true, payload });
  } catch (err) {
    next(err);
  }
}

// ✅ ปิดโพลของ show (ชื่อใหม่)
async function closeShowPoll(req, res, next) {
  try {
    const { showId } = req.body || {};
    if (!showId) return res.status(400).json({ ok: false, message: "showId required" });

    DeviceService.closePoll(String(showId));
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ✅ alias: UI เพื่อนเรียก /close-round อยู่ → อย่าเปลี่ยนชื่อให้พัง
async function closeRoundPoll(req, res, next) {
  return closeShowPoll(req, res, next);
}

// ✅ admin ดู active poll ปัจจุบัน
async function getActivePoll(req, res, next) {
  try {
    const showId = String(req.query.showId || "default");
    const poll = DeviceService.getActivePoll(showId); // ต้องมีใน DeviceService
    return res.json({ ok: true, poll: poll || null });
  } catch (err) {
    next(err);
  }
}


module.exports = {
  openPoll,
  closePoll,
  openRoundPoll,
  closeShowPoll,
  closeRoundPoll,
  getActivePoll,
};

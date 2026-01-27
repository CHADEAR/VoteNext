// vote_next_server/src/realtime/wsEvents.js

// 1) ชื่อ event ที่ใช้คุยผ่าน WS
const WS_EVENTS = Object.freeze({
  CONNECTED: "connected",

  // client -> server
  GET_ACTIVE: "get_active",
  GET_RESULT: "get_result",        // (ถ้าจะทำผลผ่าน WS ในอนาคต)
  PING: "ping",

  // server -> client
  ACTIVE: "active",               // ส่ง active poll ปัจจุบัน (หรือ null)
  POLL_OPEN: "poll_open",          // มีการเปิดโพล
  POLL_CLOSE: "poll_close",        // ปิดโพล
  RESULT: "result",               // (ถ้าจะทำผลผ่าน WS ในอนาคต)
  PONG: "pong",
  ERROR: "error",
});

// 2) helper สร้าง message ให้อยู่รูปเดียวกันเสมอ
function makeMsg(type, payload = null, meta = {}) {
  return {
    type,
    payload,
    meta: {
      ts: Date.now(),
      ...meta,
    },
  };
}

// 3) helper สร้าง payload มาตรฐานสำหรับ “poll”
function makePollPayload({ showId, roundId, title, open = true, choices = [] }) {
  return {
    showId: String(showId ?? ""),
    roundId: String(roundId ?? ""),
    title: String(title ?? ""),
    open: !!open,
    // จำกัด 4 choice เพื่อให้ตรงกับ TFT/รีโมท
    choices: (Array.isArray(choices) ? choices : [])
      .slice(0, 4)
      .map((c, i) => ({
        id: String(c.id ?? i + 1),
        label: String(c.label ?? c.stage_name ?? `Choice ${i + 1}`),
        imageUrl: String(c.imageUrl ?? c.image_url ?? ""),
        desc: String(c.desc ?? ""),
      })),
  };
}

module.exports = {
  WS_EVENTS,
  makeMsg,
  makePollPayload,
};

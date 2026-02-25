// vote_next_server/src/modules/shows/shows.controller.js
const { createShowInDb, findShowById, listShows } = require("./shows.service");

async function createShow(req, res, next) {
  try {
    const { title, description } = req.body || {};

    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: true, message: "title จำเป็นต้องกรอก" });
    }

    const show = await createShowInDb({
      title,
      description: description || null,
      createdBy: null,
    });

    return res.status(201).json(show);
  } catch (err) {
    next(err);
  }
}

async function getShowById(req, res, next) {
  try {
    const { id } = req.params;
    const show = await findShowById(id);

    if (!show) {
      return res.status(404).json({ error: true, message: "ไม่พบรายการแข่งขัน (show) นี้" });
    }

    return res.json(show);
  } catch (err) {
    next(err);
  }
}

async function getShows(req, res, next) {
  try {
    const rows = await listShows(50);

    // ส่งเป็น Array ตรง ๆ (Arduino parse ง่าย)
    res.json(
      rows.map((x) => ({
        id: x.id,
        title: x.title,
        status: x.status,
        createdAt: x.created_at ? new Date(x.created_at).toISOString() : "",
      }))
    );
  } catch (err) {
    next(err);
  }
}

module.exports = { createShow, getShowById, getShows };

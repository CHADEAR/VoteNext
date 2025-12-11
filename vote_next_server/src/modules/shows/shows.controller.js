// vote_next_server/src/modules/shows/shows.controller.js
const { createShowInDb, findShowById } = require("./shows.service");

async function createShow(req, res, next) {
  try {
    const { title, description } = req.body;

    if (!title || typeof title !== "string") {
      return res
        .status(400)
        .json({ error: true, message: "title จำเป็นต้องกรอก" });
    }

    // ภายหลังถ้ามี authAdmin ค่อยใช้ req.admin.id แทน null
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
      return res.status(404).json({
        error: true,
        message: "ไม่พบรายการแข่งขัน (show) นี้",
      });
    }

    return res.json(show);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createShow,
  getShowById,
};

async function getHealth(req, res, next) {
  res.json({
    status: "ok",
    service: "Vote Next Server",
    timestamp: new Date().toISOString(),
  });
}

module.exports = { getHealth };

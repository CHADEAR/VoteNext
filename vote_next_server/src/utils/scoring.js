function calculateFinalScore({ judgePct, remotePct, onlinePct }) {
  return judgePct * 0.4 + remotePct * 0.3 + onlinePct * 0.3;
}

module.exports = { calculateFinalScore };

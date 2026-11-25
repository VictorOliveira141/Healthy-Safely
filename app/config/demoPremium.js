function demoPremiumEnabled() {
  return (
    (process.env.DEMO_PREMIUM_ENABLED || "").trim().toLowerCase() === "true"
  );
}

function demoPremiumAuthorized(userId) {
  if (!demoPremiumEnabled()) return false;

  const authorizedUserId = (process.env.DEMO_PREMIUM_USER_ID || "").trim();
  const currentUserId = String(userId || "").trim();
  if (!/^[1-9]\d*$/.test(authorizedUserId)) return false;

  return currentUserId === authorizedUserId;
}

module.exports = { demoPremiumEnabled, demoPremiumAuthorized };

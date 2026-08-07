function normalizeProto(value) {
  if (!value) return "http";
  return String(value).split(",")[0].trim().toLowerCase() || "http";
}

function buildGoogleCallbackUrl(req, env = process.env) {
  if (env?.GOOGLE_CALLBACK_URL) {
    return env.GOOGLE_CALLBACK_URL;
  }

  const forwardedProto = req?.headers?.["x-forwarded-proto"];
  const forwardedHost = req?.headers?.["x-forwarded-host"];
  const forwardedPort = req?.headers?.["x-forwarded-port"];

  const protocol = normalizeProto(
    forwardedProto || (req?.secure ? "https" : req?.protocol) || "http",
  );
  const hostHeader = forwardedHost || req?.get?.("host") || "localhost:3000";
  const hasPort = /:\d+$/.test(hostHeader) || hostHeader.includes("]");
  const normalizedPort =
    forwardedPort && !["80", "443"].includes(String(forwardedPort))
      ? `:${forwardedPort}`
      : "";
  const host = hasPort ? hostHeader : `${hostHeader}${normalizedPort}`;

  return `${protocol}://${host}/auth/google/callback`;
}

module.exports = {
  buildGoogleCallbackUrl,
};

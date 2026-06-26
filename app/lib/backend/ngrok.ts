export function isNgrokUrl(url: string) {
  try {
    return new URL(url).hostname.includes("ngrok");
  } catch {
    return false;
  }
}

export function applyNgrokBypassHeader(headers: Headers, baseUrl: string) {
  if (isNgrokUrl(baseUrl)) {
    headers.set("ngrok-skip-browser-warning", "true");
  }

  return headers;
}

/**
 * Parse a fetch Response as JSON. Surfaces a clear error when the server
 * returns HTML (Next error page, 404 document, etc.) instead of JSON.
 */
export async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const t = text.trim();
  if (!t) {
    throw new Error(`Empty response (HTTP ${res.status})`);
  }
  if (t.startsWith("<") || t.toLowerCase().startsWith("<!doctype")) {
    throw new Error(
      `Got a web page instead of API JSON (HTTP ${res.status}). Use the same origin as the app (e.g. http://localhost:3000), restart the dev server, or check the terminal for a server crash.`,
    );
  }
  try {
    return JSON.parse(t) as T;
  } catch {
    throw new Error(
      `Invalid JSON (HTTP ${res.status}): ${t.slice(0, 120)}${t.length > 120 ? "…" : ""}`,
    );
  }
}

/** fetch + readJsonResponse + throw with API { error } message when !res.ok */
export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, init);
  const raw = await readJsonResponse<unknown>(res);
  if (!res.ok) {
    let msg = `Request failed (HTTP ${res.status})`;
    if (raw && typeof raw === "object" && raw !== null && "error" in raw) {
      const e = (raw as { error: unknown }).error;
      if (typeof e === "string") msg = e;
    }
    throw new Error(msg);
  }
  return raw as T;
}

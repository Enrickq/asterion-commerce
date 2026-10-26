// Return the endpoint's complete JSON payload. A receipt has an `agreement`
// section alongside its payment, consent, events and integrity proof.
export async function api(path, body, { fetchImpl = globalThis.fetch } = {}) {
  const response = await fetchImpl(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error
      : data.error?.message || data.message || `Request failed (${response.status})`);
  }
  return data;
}

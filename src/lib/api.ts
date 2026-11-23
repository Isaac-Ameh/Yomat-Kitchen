export async function parseApiJson<T>(
  res: Response,
  fallbackError = 'Unexpected response from the server.'
): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  const trimmed = text.trimStart();

  if (
    trimmed.startsWith('<!') ||
    trimmed.startsWith('<html') ||
    contentType.includes('text/html')
  ) {
    throw new Error(
      'Received an HTML page instead of a JSON API response. Reload the page on the Development App URL and ensure the backend server is running.'
    );
  }

  let parsed: unknown = null;
  if (trimmed.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(fallbackError);
    }
  }

  if (!res.ok) {
    const serverMessage =
      parsed &&
      typeof parsed === 'object' &&
      'error' in parsed &&
      typeof (parsed as { error?: unknown }).error === 'string'
        ? (parsed as { error: string }).error
        : `${fallbackError} (HTTP ${res.status})`;
    throw new Error(serverMessage);
  }

  if (parsed === null) {
    throw new Error(fallbackError);
  }

  return parsed as T;
}

import { MOBILE_API_URL, REQUEST_TIMEOUT_MS } from './config';

export class ApiError extends Error {
  /** HTTP status; 0 when the request never reached the server. */
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }

  /** Nothing was recorded server-side for sure only when the server said so (4xx). */
  get isClientError() {
    return this.status >= 400 && this.status < 500;
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

type Session = {
  token: string | null;
  deviceId: string | null;
  onUnauthorized: () => void;
};

const session: Session = {
  token: null,
  deviceId: null,
  onUnauthorized: () => {},
};

export function configureApiSession(next: Partial<Session>) {
  Object.assign(session, next);
}

type QueryValue = string | number | boolean | null | undefined;

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** Skip the Authorization header (login). */
  anonymous?: boolean;
};

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const params = Object.entries(query ?? {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

  return `${MOBILE_API_URL}${path}${params.length ? `?${params.join('&')}` : ''}`;
}

function messageFrom(body: unknown, status: number) {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (Array.isArray(message)) return message.join('\n');
    if (typeof message === 'string' && message) return message;
  }
  return `Request failed (${status})`;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (session.deviceId) headers['X-Device-Id'] = session.deviceId;
  if (!options.anonymous && session.token) headers.Authorization = `Bearer ${session.token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your internet connection and try again.', 0);
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !options.anonymous) {
      session.onUnauthorized();
    }
    throw new ApiError(messageFrom(body, response.status), response.status);
  }

  return body as T;
}

const rawBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? '';

/** Server root, e.g. https://billing.ndtech.ph/isp-billing/backend (no trailing slash). */
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

/** Every call in this app goes through the collector-only mobile API. */
export const MOBILE_API_URL = `${API_BASE_URL}/mobile/v1/collector`;

export const REQUEST_TIMEOUT_MS = 20_000;

export const isApiConfigured = API_BASE_URL.length > 0;

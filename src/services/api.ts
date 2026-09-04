import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios';

/**
 * Centralized Axios instance for all API calls.
 *
 * Reads `VITE_API_URL` from environment variables so every
 * request targets the correct backend without hard-coding URLs.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/* ------------------------------------------------------------------ */
/*  Request Interceptor                                                */
/* ------------------------------------------------------------------ */

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // TODO: Inject auth token when authentication is implemented
    // const token = getAuthToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

/* ------------------------------------------------------------------ */
/*  Response Interceptor                                               */
/* ------------------------------------------------------------------ */

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // Centralized error handling — extend as needed
    if (error.response) {
      const { status } = error.response;

      switch (status) {
        case 401:
          // TODO: Handle unauthorized — redirect to login, clear tokens, etc.
          console.error('[API] Unauthorized — 401');
          break;
        case 403:
          console.error('[API] Forbidden — 403');
          break;
        case 404:
          console.error('[API] Not Found — 404');
          break;
        case 500:
          console.error('[API] Internal Server Error — 500');
          break;
        default:
          console.error(`[API] Error — ${status}`);
      }
    } else if (error.request) {
      // Request was made but no response received (network error)
      console.error('[API] Network error — no response received');
    } else {
      console.error('[API] Request setup error:', error.message);
    }

    return Promise.reject(error);
  },
);

export default api;

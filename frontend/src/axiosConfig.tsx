import axios from "axios";
import {clearAuthData, getAccessToken, refreshAccessToken} from "./features/authentication/authApi.ts";

interface FailedRequest {
  resolve: (value: string | null) => void;
  reject: (reason?: unknown | null) => void;
}

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Boolean to check if access token is currently being refreshed.
let isRefreshing = false;

// Queue for storing failed requests (Likely because of access token)
let failedQueue: FailedRequest[] = [];

const devMode: boolean = import.meta.env.VITE_DEV.toLowerCase() === 'true';

/**
 * Process failed queue for rerunning failed requests after token refresh.
 */
const processQueue = (error: unknown | null, token: string | null = null) => {
  failedQueue.forEach(promise => {
    // If refresh failed, send rejection otherwise retry with valid token.
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
}

/**
 * Request interceptor. Add auth token, handle request errors, and additionally print details if environment is in dev mode.
 */
axiosInstance.interceptors.request.use(
  (request) => {
    // Add token to header.
    const token = getAccessToken();

    if (token && request.headers) {
      request.headers["Authorization"] = `Bearer ${token}`;
    }

    if (devMode) {
      console.log("--------------------");
      console.log("[Request]");

      console.log("BaseURL: ", request.baseURL);
      console.log("Url: ", request.url);

      console.log("Method: ", request.method?.toUpperCase());
      console.log("Headers: ", JSON.stringify(request.headers, null, 2));

      if (request.params) {
        console.log("Params: ", JSON.stringify(request.params, null, 2));
      }

      if (request.data) {
        console.log("Data: ", JSON.stringify(request.data, null, 2));
      }

      console.log("--------------------");
    }

    return request;
  },
  (error) => {
    if (devMode) {
      console.error("--------------------");
      console.error("[Request Error]");
      console.error("Error: ", error);
      console.error("--------------------");
    }
    return Promise.reject(error);
  }
)

/**
 * Response interceptor. Add auth token and additionally print details if environment is in dev mode.
 */
axiosInstance.interceptors.response.use(
  (response) => {
    // Successful response (2xx)
    if (devMode) {
      console.log("--------------------");
      console.log("[Response]");

      console.log("BaseURL:   ", response.config.baseURL);
      console.log("Url:       ", response.config.url);

      console.log("Status:    ", response.status);
      console.log("Headers:   ", JSON.stringify(response.headers, null, 2));
      console.log("Data:      ", JSON.stringify(response.data, null, 2));
      console.log("--------------------");
    }
    return response;
  },
  async (error) => {
    // An error response (network error, 4xx, 5xx, etc.)
    const originalRequest = error.config;
    const response = error.response; // may be undefined if there was no response

    if (devMode) {
      console.error("--------------------");
      console.error("[Response Error]");

      console.error("Request BaseURL: ", originalRequest.baseURL);
      console.error("Request Url: ", originalRequest.url);

      console.error("Request Method: ", originalRequest.method?.toUpperCase());
      console.error("Request Headers: ", JSON.stringify(originalRequest.headers, null, 2));

      if (originalRequest.data) {
        console.error("Request Payload: ", JSON.stringify(originalRequest.data, null, 2));
      }

      if (response) {
        // Server replied with a status code (e.g. 400, 401, 500)
        console.error("Response Status: ", response.status);
        console.error("Response Headers: ", JSON.stringify(response.headers, null, 2));
        console.error("Response Data: ", JSON.stringify(response.data, null, 2));
      } else {
        // No response received (network error, CORS, DNS, etc.)
        console.error("No response received (network error or CORS issue)");
      }

      console.error("Error Object: ", error);
      console.error("--------------------");
    }

    // Check if the request was to any of the auth endpoints to prevent a loop.
    const attemptRetry = (originalRequest.url !== '/auth/refresh' &&
        originalRequest.url !== '/auth/login' &&
        originalRequest.url !== '/auth/logout' &&
        originalRequest.url !== '/auth/register');

    // If we got a 401 and haven’t retried yet, attempt to refresh the access token
    if (response?.status === 401 && !originalRequest._retry && attemptRetry) {
      if (isRefreshing) {
        // A refresh is currently happening, add to failed queue
        // and queue rerun and failure response.
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        }).catch(error => {
          return Promise.reject(error);
        })
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log("No access token found, attempting revalidate with refresh token.")
        const newToken = await refreshAccessToken();
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

        // Process queue with new token
        processQueue(null, newToken);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.log("Refresh failed, rejecting original promise.")
        // If refresh fails, clear auth data and reject
        processQueue(refreshError, null);
        clearAuthData();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
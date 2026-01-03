import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

let failedQueue: { resolve: (value: any) => void; reject: (reason: any) => void }[] = [];

axiosInstance.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {

    }
  }
)
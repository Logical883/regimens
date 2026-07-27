import axios from "axios";

// Local Vite uses proxy → "/api". Production SPA is served by the same Express host.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("regimens_token") || sessionStorage.getItem("regimens_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const onLogin = window.location.pathname.startsWith("/login");
      if (!onLogin) {
        localStorage.removeItem("regimens_token");
        localStorage.removeItem("regimens_user");
        sessionStorage.removeItem("regimens_token");
        sessionStorage.removeItem("regimens_user");
      }
    }
    return Promise.reject(error);
  }
);

export default api;

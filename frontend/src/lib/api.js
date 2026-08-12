import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Send cookies for session-based Emergent Google auth
const client = axios.create({ baseURL: API, withCredentials: true });

// Legacy Bearer token support (for old admin JWT flow)
client.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("kv_admin_token");
  if (token && !cfg.headers.Authorization) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default client;

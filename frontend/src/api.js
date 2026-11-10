import axios from "axios";
const api = axios.create({ baseURL: "http://localhost:5000/api" });
export const imageUrl = (path) => path?.startsWith("http") ? path : `http://localhost:5000${path || ""}`;
export default api;

import axios from "axios";

const api = axios.create({
  baseURL: "https://believable-harmony-production.up.railway.app"
});

export default api;

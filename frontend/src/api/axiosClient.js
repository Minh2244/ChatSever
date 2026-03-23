import axios from "axios";

const axiosClient = axios.create({
  baseURL: "https://chatsever-production.up.railway.app",
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosClient;

import axios from "axios";

const axiosClient = axios.create({
  baseURL: "chatsever-production.up.railway.app",
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosClient;

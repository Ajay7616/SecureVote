import axios from "axios";

// const api = axios.create({
//   // baseURL: "http://localhost:5000/api",
//   baseURL: "http://192.168.0.106:5000/api",
//   withCredentials: true,
// });

const api = axios.create({
  baseURL: window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'http://192.168.0.106:5000/api',
  withCredentials: true,
});

export default api;

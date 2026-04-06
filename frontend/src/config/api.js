import axios from "axios";
import store from "../store/store";

import {
  generateAESKey,
  exportRawKey,
  encryptAES,
  encryptKey,
  sign,
  decryptAES,
} from "../utils/secureCrypto";
import { logoutUser } from "../store/slices/authSlice";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // sends HttpOnly cookie automatically
});

let isLoggingOut = false;

/* ─────────────────────────────────────────────────────────────────────────── */
/* REQUEST INTERCEPTOR — encrypt outgoing body                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
api.interceptors.request.use(
  async (config) => {
    const state = store.getState();
    const token = state.auth?.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
 
    // ✅ Skip encryption for FormData (file uploads like voter list)
    // FormData is sent as-is — axios will set the correct
    // multipart/form-data Content-Type with boundary automatically.
    if (config.data && !(config.data instanceof FormData)) {
      // 1. Generate a fresh AES-256 key for this request
      const aesKey    = await generateAESKey();
      const rawKey    = await exportRawKey(aesKey); // Uint8Array (32 bytes)
 
      // 2. Encrypt the body with AES-256-GCM
      const encrypted = await encryptAES(config.data, aesKey);
 
      // 3. RSA-wrap the raw key so only the server can unwrap it
      const encryptedKey = encryptKey(rawKey);
 
      // 4. HMAC-sign payload+nonce+timestamp to prevent tampering
      const nonce     = Date.now().toString();
      const timestamp = Date.now().toString();
      const signature = await sign(encrypted.payload, nonce, timestamp);
 
      config.data = {
        key:       encryptedKey,
        payload:   encrypted.payload,
        iv:        encrypted.iv,
        tag:       encrypted.tag,
        nonce,
        timestamp,
        signature,
      };
    }
 
    return config;
  },
  (error) => Promise.reject(error)
);
 
/* ─────────────────────────────────────────────────────────────────────────── */
/* RESPONSE INTERCEPTOR — decrypt incoming body                                */
/* ─────────────────────────────────────────────────────────────────────────── */
api.interceptors.response.use(
  async (response) => {
    const { payload, iv, tag, key } = response.data || {};
    if (payload && iv && tag && key) {
      try {
        const rawKey = Uint8Array.from(atob(key), (c) => c.charCodeAt(0));
        const aesKey = await crypto.subtle.importKey(
          "raw", rawKey, { name: "AES-GCM" }, false, ["decrypt"]
        );
        response.data = await decryptAES(payload, iv, tag, aesKey);
      } catch (err) {}
    }
    return response;
  },
  async (error) => {
    // Decrypt error response first
    const errData = error.response?.data;
    if (errData?.payload && errData?.iv && errData?.tag && errData?.key) {
      try {
        const rawKey = Uint8Array.from(atob(errData.key), (c) => c.charCodeAt(0));
        const aesKey = await crypto.subtle.importKey(
          "raw", rawKey, { name: "AES-GCM" }, false, ["decrypt"]
        );
        error.response.data = await decryptAES(errData.payload, errData.iv, errData.tag, aesKey);
      } catch (err) {}
    }
 
    // Handle 401 logout
    const isTokenExpired =
      error.response?.status === 401 ||
      error.response?.data?.error === "Token expired";
 
    if (isTokenExpired && !isLoggingOut) {
      isLoggingOut = true;
      store.dispatch(logoutUser());
      window.location.href = "/";
    }
 
    return Promise.reject(error);
  }
);
// api.interceptors.request.use(
//   (config) => {
//     // const token = localStorage.getItem("token");
//     const state = store.getState();
//     const token = state.auth?.token || state.votes?.token;

//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }

//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     const data = error.response?.data;

//     const isTokenExpired =
//       error.response?.status === 401 ||
//       data?.error === "Token expired";

//     if (isTokenExpired && !isLoggingOut) {
//       isLoggingOut = true;
//       store.dispatch(logoutUser());
//       window.location.href = "/";
//     }

//     return Promise.reject(error);
//   }
// );

export default api;
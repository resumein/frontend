import axios from "axios";
import { useUserStore } from "../store/userStore";

const host = "http://localhost:7071";

export const BaseAPI = axios.create({
    baseURL: host,
    headers: { "Content-Type": "application/json" },
});

export const API = axios.create({
    baseURL: host,
    headers: { "Content-Type": "application/json" },
});

API.interceptors.request.use((config) => {// Update global state AND save to browser automatically
    const token = useUserStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const getWithToken = async (url: string) => {
    return await API.get(url);
};
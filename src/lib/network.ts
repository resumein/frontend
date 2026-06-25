import axios from "axios";
import { useUserStore } from "../store/userStore";

const host = import.meta.env.VITE_API_URL || "https://resumein.azurewebsites.net/"

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

API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            useUserStore.getState().clearAuth();
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export const getErrorMessage = (error: any, defaultMsg: string): string => {
    if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        const serverMessage = data?.message || data?.error || (typeof data === 'string' ? data : null) || error.response.statusText;
        if (serverMessage) {
            return `${defaultMsg} (${serverMessage} - HTTP ${status})`;
        }
        return `${defaultMsg} (HTTP ${status})`;
    }
    if (error.message) {
        return `${defaultMsg} (${error.message})`;
    }
    return defaultMsg;
};

export const getWithToken = async <T = any>(url: string) => {
    return await API.get<T>(url);
};

export const postWithToken = async <T = any>(url: string, data: any) => {
    return await API.post<T>(url, data);
};

export const deleteWithToken = async <T = any>(url: string, config?: any) => {
    return await API.delete<T>(url, config);
};

export const putWithToken = async <T = any>(url: string, data: any) => {
    return await API.put<T>(url, data);
};
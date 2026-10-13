import axios from "axios";
import { useAuthStore } from "@/stores/auth.store";
import router from "@/router";

const apiBase = import.meta.env.VITE_API_BASE || "/api/v1";

const api = axios.create({
  baseURL: apiBase,
  timeout: 15000
});

export interface NormalizedHttpError {
  status: number;
  code: string;
  message: string;
  requestId?: string;
  method?: string;
  url?: string;
  requestData?: unknown;
  responseData?: unknown;
}

function normalizeHttpError(error: any): NormalizedHttpError {
  const status = error?.response?.status || 0;
  const responseData = error?.response?.data;
  const detail = responseData?.detail;
  const message =
    (typeof detail === "string" && detail) ||
    responseData?.message ||
    responseData?.errorDescription ||
    error?.message ||
    "Error HTTP no controlado";

  return {
    status,
    code: responseData?.resultObj?.errorCode || responseData?.errorDescription || `HTTP_${status || 0}`,
    message,
    requestId: responseData?.resultObj?.requestId || error?.response?.headers?.["x-request-id"],
    method: error?.config?.method?.toUpperCase?.() || error?.config?.method,
    url: error?.config?.url,
    requestData: error?.config?.data,
    responseData,
  };
}

// Flag global para evitar múltiples ejecuciones
let isHandling401 = false;

api.interceptors.request.use((config) => {
  const store = useAuthStore();
  config.headers = axios.AxiosHeaders.from(config.headers);

  if (store?.token) {
    config.headers.set("Authorization", `${store.tokenType || "Bearer"} ${store.token}`);
  }

  config.headers.set("accept", "application/json");
  config.headers.set("Content-Type", "application/json");
  return config;
});

// INTERCEPTOR DE RESPUESTA - EJECUTA LOGOUT INMEDIATAMENTE
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const requestUrl = String(error?.config?.url || "");
    const isLoginRequest = requestUrl.includes("/auth/login");
    const normalized = normalizeHttpError(error);
    error.normalized = normalized;
    
    // LOG DE DEPURACIÓN
    console.group('HTTP ERROR', 'color: red; font-weight: bold; font-size: 14px');
    console.log('Status:', status);
    console.log('URL:', error.config?.url);
    console.log('Method:', error.config?.method);
    console.log('Response:', error.response?.data);
    console.log('Normalized:', normalized);
    console.groupEnd();
    
    // MANEJO DE 401 - EJECUTAR LOGOUT INMEDIATAMENTE
    if (status === 401 && !isHandling401 && !isLoginRequest) {
      isHandling401 = true;
      
      console.group('TOKEN EXPIRADO', 'color: orange; font-weight: bold; font-size: 16px');
      console.log('Se detectó un 401 Unauthorized');
      console.log('Ejecutando logout INMEDIATAMENTE...');
      
      // PASO 1: Limpiar localStorage INMEDIATAMENTE
      localStorage.removeItem("token");
      localStorage.removeItem("tokenType");
      localStorage.removeItem("email");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("userRole");
      console.log('LocalStorage limpiado');
      
      // PASO 2: Actualizar el store
      try {
        const store = useAuthStore();
        store.token = "";
        store.email = "";
        store.currentUser = null;
        store.userRole = null;
        store.stopTokenValidityCheck();
        console.log('Store limpiado');
      } catch (err) {
        console.error('Error limpiando store:', err);
      }
      
      // PASO 3: Mostrar mensaje AL USUARIO
      console.log('Mostrando mensaje al usuario...');
      
      // Intentar diferentes métodos para notificar
      let messageShown = false;
      
      // Método 1: Dialog de Vue (si está disponible)
      if (typeof (window as any).showSessionExpiredDialog === 'function') {
        (window as any).showSessionExpiredDialog();
        messageShown = true;
        console.log('Dialog de sesión expirada mostrado');
      }
      
      // Método 2: Confirm (más confiable que alert)
      if (!messageShown) {
        try {
          // Usar confirm en lugar de alert porque es más confiable
          const userClicked = confirm(
            'SESIÓN EXPIRADA\n\n' +
            'Tu sesión ha finalizado por seguridad.\n\n' +
            'Haz clic en OK para ir a la página de inicio de sesión.'
          );
          console.log('Mensaje confirm mostrado, usuario clickeó:', userClicked);
          messageShown = true;
        } catch (err) {
          console.error('Error mostrando confirm:', err);
        }
      }
      
      // Método 3: Console.log grande como último recurso
      if (!messageShown) {
        console.log(
          'TU SESIÓN HA EXPIRADO',
          'color: white; background: red; font-size: 20px; padding: 10px; font-weight: bold'
        );
      }
      
      // PASO 4: Redirigir a login DESPUÉS de un pequeño delay
      setTimeout(() => {
        try {
          router.replace({ name: "login" });
          console.log('Redirigido a login');
        } catch (err) {
          console.error('Error redirigiendo:', err);
          // Fallback: usar window.location
          window.location.href = '/login';
        }
      }, 100);
      
      console.groupEnd();
      
      // Resetear flag después de 2 segundos
      setTimeout(() => {
        isHandling401 = false;
      }, 2000);
    }
    
    // Manejo de 403
    if (status === 403) {
      console.warn('Acceso denegado (403)');
      
      // Mostrar notificación si está disponible
      if (typeof (window as any).showNotification === 'function') {
        (window as any).showNotification(
          'No tienes permisos para realizar esta acción',
          'warning',
          5000
        );
      }
    }

    return Promise.reject(error);
  }
);

export default api;
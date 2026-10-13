import { defineStore } from "pinia";
import api from "@/api/http";
import router from "@/router";
import type { User, Role, RoleName } from "@/types";

type LoginResponse = {
  resultCode: string;
  message: string;
  errorDescription: string | null;
  resultObj: { access_token: string; token_type: string };
  systemTime: number;
};

type UserResponse = {
  resultCode: string;
  message: string;
  errorDescription: string | null;
  resultObj: User;
  systemTime: number;
};

type LoginPayload = { email: string; password: string };

// Matriz de permisos basada en la documentación del backend
const PERMISSIONS_MATRIX = {
  USERS: {
    list: ['superuser', 'admin', 'manager', 'viewer'],
    get: ['superuser', 'admin', 'manager', 'viewer'],
    get_me: ['superuser', 'admin', 'manager', 'viewer'],
    create: ['superuser', 'admin'],
    update: ['superuser', 'admin'],
    delete: ['superuser', 'admin'],
    activate: ['superuser', 'admin'],
    deactivate: ['superuser', 'admin'],
  },
  APPLICATIONS: {
    list: ['superuser', 'admin', 'manager', 'viewer'],
    get: ['superuser', 'admin', 'manager', 'viewer'],
    create: ['superuser', 'admin', 'manager'],
    update: ['superuser', 'admin', 'manager'],
    delete: ['superuser', 'admin'],
  },
  ENTITIES: {
    list: ['superuser', 'admin', 'manager', 'viewer'],
    get: ['superuser', 'admin', 'manager', 'viewer'],
    create: ['superuser', 'admin', 'manager'],
    update: ['superuser', 'admin', 'manager'],
    delete: ['superuser', 'admin'],
  },
  SECURITY_TYPES: {
    list: ['superuser', 'admin', 'manager', 'viewer'],
    get: ['superuser', 'admin', 'manager', 'viewer'],
    create: ['superuser', 'admin', 'manager'],
    update: ['superuser', 'admin', 'manager'],
    delete: ['superuser', 'admin'],
  },
  CONNECTION_TYPES: {
    list: ['superuser', 'admin', 'manager', 'viewer'],
    get: ['superuser', 'admin', 'manager', 'viewer'],
    create: ['superuser', 'admin', 'manager'],
    update: ['superuser', 'admin', 'manager'],
    delete: ['superuser', 'admin'],
  },
  HEADERS: {
    list: ['superuser', 'admin', 'manager', 'viewer'],
    get: ['superuser', 'admin', 'manager', 'viewer'],
    create: ['superuser', 'admin', 'manager'],
    update: ['superuser', 'admin', 'manager'],
    delete: ['superuser', 'admin'],
  },
  INTEGRATORS: {
    list: ['superuser', 'admin', 'manager', 'viewer'],
    get: ['superuser', 'admin', 'manager', 'viewer'],
    create: ['superuser', 'admin'],
    update: ['superuser', 'admin'],
    delete: ['superuser', 'admin'],
  },
  ROLES: {
    list: ['superuser', 'admin'],
    get: ['superuser', 'admin'],
    create: ['superuser', 'admin'],
    update: ['superuser', 'admin'],
    delete: ['superuser', 'admin'],
  },
  AUDIT: {
    list: ['superuser', 'admin'],
    get: ['superuser', 'admin'],
  },
} as const;

type Resource = keyof typeof PERMISSIONS_MATRIX;
type Action = string;

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: (localStorage.getItem("token") || "") as string,
    tokenType: (localStorage.getItem("tokenType") || "Bearer") as string,
    email: (localStorage.getItem("email") || "") as string,
    currentUser: null as User | null,
    userRole: null as Role | null,
    isLoadingUser: false,
    tokenExpirationCheckInterval: null as number | null,
  }),
  
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    
    // Obtener el nombre del rol del usuario actual
    roleName: (state): RoleName | null => {
      if (state.currentUser?.is_superuser) return 'superuser';
      return (state.userRole?.name as RoleName) || null;
    },
    
    // Verificar si el usuario puede realizar una acción en un recurso
    canPerform: (state) => {
      return (resource: Resource, action: Action): boolean => {
        // Si es superuser, tiene acceso a todo
        if (state.currentUser?.is_superuser) return true;
        
        const roleName = state.userRole?.name;
        if (!roleName) return false;
        
        const resourcePermissions = PERMISSIONS_MATRIX[resource];
        if (!resourcePermissions) return false;
        
        const allowedRoles = resourcePermissions[action as keyof typeof resourcePermissions];
        if (!allowedRoles) return false;
        
        return allowedRoles.includes(roleName);
      };
    },
    
    // Helpers específicos para usuarios
    canCreateUsers(): boolean {
      return this.canPerform('USERS', 'create');
    },
    canUpdateUsers(): boolean {
      return this.canPerform('USERS', 'update');
    },
    canDeleteUsers(): boolean {
      return this.canPerform('USERS', 'delete');
    },
    canActivateUsers(): boolean {
      return this.canPerform('USERS', 'activate');
    },
    
    // Helpers para otras entidades
    canManageRoles(): boolean {
      return this.canPerform('ROLES', 'list');
    },
    canManageIntegrators(): boolean {
      return this.canPerform('INTEGRATORS', 'create');
    },

    canViewAssignedApplications(): boolean {
      const apps = this.currentUser?.applications;
      return Array.isArray(apps) && apps.length > 0;
    },

    canViewApplications(): boolean {
      return this.canPerform('APPLICATIONS', 'list') || this.canViewAssignedApplications;
    },

    isApplicationsReadOnly(): boolean {
      if (this.canPerform('APPLICATIONS', 'update')) return false;
      if (this.canPerform('APPLICATIONS', 'list')) return true;
      return this.canViewAssignedApplications;
    },
  },
  
  actions: {
    async login(payload: LoginPayload) {
      const { data } = await api.post<LoginResponse>("/auth/login", payload);
      const token = data.resultObj?.access_token || "";
      const tokenType = data.resultObj?.token_type || "Bearer";
      this.token = token;
      this.tokenType = tokenType;
      this.email = payload.email;
      localStorage.setItem("token", token);
      localStorage.setItem("tokenType", tokenType);
      localStorage.setItem("email", payload.email);
      
      // Cargar información del usuario actual
      await this.fetchCurrentUser();
      
      // Iniciar verificación periódica del token
      this.startTokenValidityCheck();
      
      const redirect = (router.currentRoute.value.query.redirect as string) || "/";
      router.replace(redirect);
    },
    
    async fetchCurrentUser() {
      if (!this.token) return;
      
      this.isLoadingUser = true;
      try {
        const { data } = await api.get<UserResponse>("/users/me");
        this.currentUser = data.resultObj;
        
        // Cargar información del rol si existe
        if (this.currentUser?.role_id) {
          await this.fetchUserRole(this.currentUser.role_id);
        }
        
        // Guardar en localStorage para persistencia
        localStorage.setItem("currentUser", JSON.stringify(this.currentUser));
        if (this.userRole) {
          localStorage.setItem("userRole", JSON.stringify(this.userRole));
        }
      } catch (error) {
        this.currentUser = null;
        this.userRole = null;
      } finally {
        this.isLoadingUser = false;
      }
    },
    
    async fetchUserRole(roleId: number) {
      try {
        const { data } = await api.get(`/roles/${roleId}`);
        this.userRole = data.resultObj;
      } catch (error) {
        this.userRole = null;
      }
    },
    
    // Restaurar usuario desde localStorage al iniciar la app
    restoreUser() {
      
      const savedUser = localStorage.getItem("currentUser");
      const savedRole = localStorage.getItem("userRole");
      
      if (savedUser) {
        try {
          this.currentUser = JSON.parse(savedUser);
        } catch {
          this.currentUser = null;
        }
      }
      
      if (savedRole) {
        try {
          this.userRole = JSON.parse(savedRole);
        } catch {
          this.userRole = null;
        }
      }
      
      // Si hay un token guardado, iniciar verificación periódica
      if (this.token) {
        this.startTokenValidityCheck();
      }
      
    },
    
    // Iniciar verificación periódica de la validez del token
    startTokenValidityCheck() {
      // Limpiar cualquier intervalo previo
      this.stopTokenValidityCheck();
      
      // Verificar cada 5 minutos si el token sigue siendo válido
      this.tokenExpirationCheckInterval = window.setInterval(async () => {
        
        if (!this.token) {
          this.stopTokenValidityCheck();
          return;
        }
        
        try {
          // Intentar obtener el usuario actual para verificar si el token es válido
          await this.fetchCurrentUser();
        } catch (error: any) {
          // Si obtenemos un 401, el interceptor de axios ya manejará el logout
          if (error.response?.status === 401) {
            console.log('Token expirado - El interceptor ejecutará logout automático');
          }
        }
      }, 5 * 60 * 1000);
      
    },
    
    // Detener verificación periódica del token
    stopTokenValidityCheck() {
      if (this.tokenExpirationCheckInterval) {
        clearInterval(this.tokenExpirationCheckInterval);
        this.tokenExpirationCheckInterval = null;
      }
    },
    
    logout() {
      // Detener verificación periódica
      this.stopTokenValidityCheck();
      
      this.token = "";
      this.email = "";
      this.currentUser = null;
      this.userRole = null;
      localStorage.removeItem("token");
      localStorage.removeItem("tokenType");
      localStorage.removeItem("email");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("userRole");
      // Portfolio demo: no login screen — re-seed happens on reload
      router.replace({ name: "applications" });
      window.location.reload();
    }
  }
});
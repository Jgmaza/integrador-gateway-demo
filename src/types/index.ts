export type Role = {
  id: number;
  name: string;
};

export type Entity = {
  id: number;
  name: string;
};

export type Integrator = {
  id: number;
  url_destination: string;
  request_type_id: number | null;
  type_id: number | null;
};

export type Application = {
  id: number;
  name: string;
  url_domain: string;
  entity_id: number | null;
  call_type: string;
  security_type_id: number | null;
  connection_types_id: number | null;
};

export type User = {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
  role_id: number | null;
  entity_id: number | null;
  role?: Role | null;
  entity?: Entity | null;
  integrators?: Integrator[];
  applications?: Application[];
};

export type UserCreate = {
  email: string;
  full_name: string | null;
  password: string;
  role_id?: number | null;
  entity_id?: number | null;
  integrator_ids?: number[];
  application_ids?: number[];
};

export type UserUpdate = {
  full_name?: string | null;
  password?: string | null;
  is_active?: boolean | null;
  is_superuser?: boolean | null;
  role_id?: number | null;
  entity_id?: number | null;
  integrator_ids?: number[];
  application_ids?: number[];
};

// Permisos por recurso y acción
export type PermissionAction = 'list' | 'get' | 'create' | 'update' | 'delete' | 'activate' | 'deactivate';

// Roles del sistema
export type RoleName = 'superuser' | 'admin' | 'manager' | 'viewer';

export type ApiList<T> = T[];

export type ApiResponse<T> = {
  resultCode: string;
  message: string;
  errorDescription: string | null;
  resultObj: T;
  systemTime: number;
};

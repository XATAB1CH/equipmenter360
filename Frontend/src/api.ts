// ─── Слой данных ─────────────────────────────────────────────────────────────
//
// Клиент JSON API «Монтаж 360» (контракт — Backend/api/oapi.yaml).
// JWT хранится в localStorage и подставляется в Authorization: Bearer.
// В dev Vite проксирует /api на Go-сервер; в проде фронт отдаётся тем же сервером.

export type Status = 'created' | 'assigned' | 'inwork' | 'done' | 'cancelled';
export type Role = 'dispatcher' | 'montazhnik';

export interface WorkOrder {
  id: string;
  address: string;
  workType: string;
  client: string;
  phone: string;
  executor: string | null;
  executorId: number | null;
  date: string;
  status: Status;
  comment: string;
}

export type NewOrder = Pick<WorkOrder, 'address' | 'workType' | 'client' | 'phone' | 'comment'>;

export interface Technician {
  id: number;
  fullName: string;
  phone: string;
  active: boolean;
  createdAt: string;
}

export interface User {
  id: number;
  login: string;
  fullName: string;
  role: Role;
  technicianId: number | null;
}

export interface Meta {
  workTypes: string[];
}

export interface TechLoad {
  technicianId: number;
  fullName: string;
  total: number;
  done: number;
  inwork: number;
}

export interface ReportSummary {
  total: number;
  done: number;
  inwork: number;
  cancelled: number;
  created: number;
  assigned: number;
  byTechnician: TechLoad[];
}

const BASE = '/api';
const TOKEN_KEY = 'montazh360_token';

// ─── Токен ───────────────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// ─── HTTP-хелперы ────────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 401) {
    setToken(null); // токен протух — разлогиниваем
    throw new Error('Требуется вход в систему');
  }
  if (!res.ok) {
    throw new Error(await errorMessage(res));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.error === 'string') return body.error;
  } catch {
    // тело не JSON
  }
  return `Ошибка ${res.status}`;
}

// ─── Аутентификация ──────────────────────────────────────────────────────────

export async function login(login: string, password: string): Promise<{ token: string; user: User }> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  const data = await res.json();
  setToken(data.token);
  return data;
}

export function me(): Promise<User> {
  return request<User>('/auth/me');
}

export function logout(): void {
  setToken(null);
}

// ─── Наряды ──────────────────────────────────────────────────────────────────

export function listOrders(): Promise<WorkOrder[]> {
  return request<WorkOrder[]>('/orders');
}

export function createOrder(data: NewOrder): Promise<WorkOrder> {
  return request<WorkOrder>('/orders', { method: 'POST', body: JSON.stringify(data) });
}

export function updateOrder(id: string, updates: { executorId?: number | null; status?: Status }): Promise<WorkOrder> {
  return request<WorkOrder>(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

// ─── Монтажники ──────────────────────────────────────────────────────────────

export function listTechnicians(activeOnly = false): Promise<Technician[]> {
  return request<Technician[]>(`/technicians${activeOnly ? '?active=true' : ''}`);
}

export function createTechnician(data: { fullName: string; phone: string }): Promise<Technician> {
  return request<Technician>('/technicians', { method: 'POST', body: JSON.stringify(data) });
}

export function updateTechnician(id: number, data: { fullName?: string; phone?: string; active?: boolean }): Promise<Technician> {
  return request<Technician>(`/technicians/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteTechnician(id: number): Promise<void> {
  return request<void>(`/technicians/${id}`, { method: 'DELETE' });
}

// ─── Отчёты и справочники ────────────────────────────────────────────────────

export function getReportSummary(from: string, to: string): Promise<ReportSummary> {
  return request<ReportSummary>(`/reports/summary?from=${from}&to=${to}`);
}

export function getMeta(): Promise<Meta> {
  return request<Meta>('/meta');
}

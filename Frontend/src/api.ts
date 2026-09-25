// ─── Слой данных ─────────────────────────────────────────────────────────────
//
// Клиент JSON API «Монтаж 360» (контракт — Backend/api/oapi.yaml).
// В dev Vite проксирует /api на Go-сервер (localhost:8080); в проде фронт
// отдаётся тем же сервером, поэтому относительных путей достаточно.

export type Status = 'created' | 'assigned' | 'inwork' | 'done' | 'cancelled';

export interface WorkOrder {
  id: string;
  address: string;
  workType: string;
  client: string;
  phone: string;
  executor: string | null;
  date: string; // дата создания (YYYY-MM-DD), ставит сервер
  status: Status;
  comment: string;
}

/** Поля, которые заполняет диспетчер при создании наряда. */
export type NewOrder = Pick<WorkOrder, 'address' | 'workType' | 'client' | 'phone' | 'comment'>;

/** Справочники для выпадающих списков. */
export interface Meta {
  workTypes: string[];
  technicians: string[];
}

const BASE = '/api';

// ─── HTTP-хелперы ────────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!res.ok) {
    throw new Error(await errorMessage(res));
  }
  return res.json() as Promise<T>;
}

// errorMessage достаёт человекочитаемое сообщение из {error: "..."}.
async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.error === 'string') return body.error;
  } catch {
    // тело не JSON — отдаём статус
  }
  return `Ошибка ${res.status}`;
}

// ─── API ─────────────────────────────────────────────────────────────────────

/** Список всех нарядов (новые сверху). GET /api/orders */
export function listOrders(): Promise<WorkOrder[]> {
  return request<WorkOrder[]>('/orders');
}

/** Создать наряд. Сервер проставит id, status=created, executor=null и дату. POST /api/orders */
export function createOrder(data: NewOrder): Promise<WorkOrder> {
  return request<WorkOrder>('/orders', { method: 'POST', body: JSON.stringify(data) });
}

/** Частично обновить наряд: назначить/снять исполнителя или сменить статус. PATCH /api/orders/{id} */
export function updateOrder(id: string, updates: Partial<Pick<WorkOrder, 'executor' | 'status'>>): Promise<WorkOrder> {
  return request<WorkOrder>(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

/** Справочники типов работ и монтажников. GET /api/meta */
export function getMeta(): Promise<Meta> {
  return request<Meta>('/meta');
}

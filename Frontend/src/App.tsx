import { useEffect, useState } from 'react';
import {
  login as apiLogin, logout as apiLogout, me as apiMe, getToken,
  listOrders, createOrder, updateOrder,
  listTechnicians, createTechnician, updateTechnician, deleteTechnician,
  getMeta, getReportSummary,
  type User, type WorkOrder, type NewOrder, type Status, type Technician, type ReportSummary,
} from './api';

// ─── Types ───────────────────────────────────────────────────────────────────

type Screen = 'login' | 'list' | 'create' | 'detail' | 'technicians' | 'reports' | 'settings';
type Theme = 'light' | 'dark';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<Status, string> = {
  created: 'Создан', assigned: 'Назначен', inwork: 'В работе', done: 'Выполнен', cancelled: 'Отменён',
};

const STATUS_STYLE: Record<Status, string> = {
  created:   'bg-[#F0F1F3] text-[#8C93A0] dark:bg-[#23262E] dark:text-[#9AA0AC]',
  assigned:  'bg-[#EEF2FF] text-[#2F54EB] dark:bg-[#1E2742] dark:text-[#7D97FF]',
  inwork:    'bg-[#FEF3C7] text-[#D97706] dark:bg-[#3A2C12] dark:text-[#F0A93C]',
  done:      'bg-[#DCFCE7] text-[#16A34A] dark:bg-[#0E2E22] dark:text-[#34D399]',
  cancelled: 'bg-[#FEE2E2] text-[#DC2626] dark:bg-[#3A1616] dark:text-[#F87171]',
};

function Badge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

type IconProps = { size?: number };

function IconOrders({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
  );
}
function IconTech({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );
}
function IconReports({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}
function IconSettings({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function IconFilter() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}
function IconDownload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}
function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
    </svg>
  );
}
function IconSun() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}
function IconMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

const inputCls = (err?: string) =>
  `w-full h-10 px-3 rounded-lg border text-sm outline-none transition focus:ring-2 ` +
  `bg-white dark:bg-[#1D212B] text-[#1A1D23] dark:text-[#E7E9EE] placeholder-[#A0A8B5] ` +
  (err
    ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/20'
    : 'border-[#E4E7ED] dark:border-[#2A2F3A] focus:border-[#2F54EB] focus:ring-[#2F54EB]/20');

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1A1D23] dark:text-[#E7E9EE] mb-1.5">
        {label} {required && <span className="text-[#DC2626]">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-[#DC2626] mt-1">{error}</p>}
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-[#171A21] rounded-xl border border-[#E4E7ED] dark:border-[#2A2F3A] ${className}`}>
      {children}
    </div>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium cursor-pointer select-none ${
            t.type === 'success' ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
          }`}
        >
          <span>{t.type === 'success' ? '✓' : '✕'}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ active, user, onNavigate, onLogout }: {
  active: Screen;
  user: User;
  onNavigate: (s: Screen) => void;
  onLogout: () => void;
}) {
  const nav: { id: Screen; label: string; icon: React.ReactNode; dispatcherOnly?: boolean }[] = [
    { id: 'list', label: 'Наряды', icon: <IconOrders /> },
    { id: 'technicians', label: 'Монтажники', icon: <IconTech /> },
    { id: 'reports', label: 'Отчёты', icon: <IconReports />, dispatcherOnly: true },
    { id: 'settings', label: 'Настройки', icon: <IconSettings /> },
  ];

  const initials = user.fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <aside className="w-56 shrink-0 bg-white dark:bg-[#171A21] border-r border-[#E4E7ED] dark:border-[#2A2F3A] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#E4E7ED] dark:border-[#2A2F3A]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#2F54EB] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div className="text-[13px] font-bold text-[#1A1D23] dark:text-[#E7E9EE] leading-tight">Монтаж 360</div>
            <div className="text-[10px] text-[#8C93A0]">Управление нарядами</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
        {nav.filter(i => !i.dispatcherOnly || user.role === 'dispatcher').map(item => {
          const isActive = active === item.id || (item.id === 'list' && (active === 'create' || active === 'detail'));
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left w-full ${
                isActive
                  ? 'bg-[#EEF2FF] dark:bg-[#1E2742] text-[#2F54EB] dark:text-[#7D97FF]'
                  : 'text-[#4A5160] dark:text-[#A6ACBA] hover:bg-[#F5F6F8] dark:hover:bg-[#1D212B] hover:text-[#1A1D23] dark:hover:text-[#E7E9EE]'
              }`}
            >
              <span className={isActive ? 'text-[#2F54EB] dark:text-[#7D97FF]' : 'text-[#8C93A0]'}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Profile */}
      <div className="px-4 py-4 border-t border-[#E4E7ED] dark:border-[#2A2F3A]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#2F54EB] flex items-center justify-center text-white text-xs font-semibold shrink-0">{initials}</div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-[#1A1D23] dark:text-[#E7E9EE] truncate">{user.fullName}</div>
            <div className="text-[11px] text-[#8C93A0]">{user.role === 'dispatcher' ? 'Диспетчер' : 'Монтажник'}</div>
          </div>
          <button onClick={onLogout} title="Выйти" className="text-[#8C93A0] hover:text-[#DC2626] transition-colors shrink-0">
            <IconLogout />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (u: User) => void }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!login || !password) { setError('Введите логин и пароль'); return; }
    setLoading(true);
    setError('');
    try {
      const { user } = await apiLogin(login, password);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] dark:bg-[#0F1115] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#2F54EB] flex items-center justify-center mb-4 shadow-lg">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1D23] dark:text-[#E7E9EE]">Монтаж 360</h1>
          <p className="text-sm text-[#8C93A0] mt-1">Система управления нарядами</p>
        </div>

        <Card className="p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1A1D23] dark:text-[#E7E9EE] mb-6">Вход в систему</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Логин">
              <input type="text" placeholder="dispatcher" value={login} onChange={e => { setLogin(e.target.value); setError(''); }} className={inputCls()} />
            </Field>
            <Field label="Пароль">
              <input type="password" placeholder="••••••••" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} className={inputCls()} />
            </Field>
            {error && <p className="text-xs text-[#DC2626]">{error}</p>}
            <button type="submit" disabled={loading} className="h-10 bg-[#2F54EB] hover:bg-[#1E3FC4] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors mt-1">
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
          <p className="text-[11px] text-[#A0A8B5] mt-5 text-center">dispatcher / password &nbsp;·&nbsp; ivanov / password</p>
        </Card>

        <p className="text-center text-xs text-[#A0A8B5] mt-6">© 2026 Монтаж 360</p>
      </div>
    </div>
  );
}

// ─── Orders list ─────────────────────────────────────────────────────────────

function OrderListScreen({ orders, user, onCreate, onDetail, onNavigate, onLogout }: {
  orders: WorkOrder[];
  user: User;
  onCreate: () => void;
  onDetail: (id: string) => void;
  onNavigate: (s: Screen) => void;
  onLogout: () => void;
}) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');
  const [showFilter, setShowFilter] = useState(false);

  const filtered = orders.filter(o => {
    const matchSearch = !search || [o.id, o.address, o.client, o.workType, o.executor || '']
      .join(' ').toLowerCase().includes(search.toLowerCase());
    return matchSearch && (filterStatus === 'all' || o.status === filterStatus);
  });

  const isDispatcher = user.role === 'dispatcher';

  return (
    <div className="flex h-screen bg-[#F5F6F8] dark:bg-[#0F1115]">
      <Sidebar active="list" user={user} onNavigate={onNavigate} onLogout={onLogout} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white dark:bg-[#171A21] border-b border-[#E4E7ED] dark:border-[#2A2F3A] px-6 py-4 flex items-center gap-3 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A8B5]"><IconSearch /></span>
            <input
              type="text"
              placeholder="Поиск по наряду, адресу, клиенту..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#E4E7ED] dark:border-[#2A2F3A] bg-white dark:bg-[#1D212B] text-sm text-[#1A1D23] dark:text-[#E7E9EE] placeholder-[#A0A8B5] outline-none focus:border-[#2F54EB] focus:ring-2 focus:ring-[#2F54EB]/20 transition"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`h-9 px-3 flex items-center gap-2 rounded-lg border text-sm font-medium transition-colors ${
                showFilter || filterStatus !== 'all'
                  ? 'border-[#2F54EB] bg-[#EEF2FF] dark:bg-[#1E2742] text-[#2F54EB] dark:text-[#7D97FF]'
                  : 'border-[#E4E7ED] dark:border-[#2A2F3A] bg-white dark:bg-[#1D212B] text-[#4A5160] dark:text-[#A6ACBA] hover:bg-[#F5F6F8] dark:hover:bg-[#23262E]'
              }`}
            >
              <IconFilter /> Фильтр
              {filterStatus !== 'all' && <span className="w-1.5 h-1.5 rounded-full bg-[#2F54EB]" />}
            </button>
            {showFilter && (
              <div className="absolute top-full mt-1 left-0 bg-white dark:bg-[#171A21] border border-[#E4E7ED] dark:border-[#2A2F3A] rounded-xl shadow-lg p-3 z-20 w-44">
                <p className="text-xs font-semibold text-[#8C93A0] mb-2 uppercase tracking-wide">Статус</p>
                {(['all', 'created', 'assigned', 'inwork', 'done', 'cancelled'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => { setFilterStatus(s); setShowFilter(false); }}
                    className={`flex items-center gap-2 w-full text-left text-sm py-1.5 px-2 rounded-lg hover:bg-[#F5F6F8] dark:hover:bg-[#1D212B] transition-colors ${
                      filterStatus === s ? 'font-semibold text-[#2F54EB] dark:text-[#7D97FF]' : 'text-[#4A5160] dark:text-[#A6ACBA]'
                    }`}
                  >
                    {s === 'all' ? 'Все статусы' : STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isDispatcher && (
            <button
              onClick={onCreate}
              className="h-9 px-4 bg-[#2F54EB] hover:bg-[#1E3FC4] text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors ml-auto shrink-0"
            >
              <IconPlus /> Создать наряд
            </button>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E4E7ED] dark:border-[#2A2F3A] bg-[#F5F6F8] dark:bg-[#1D212B]">
                  {['№ наряда', 'Адрес', 'Тип работ', 'Исполнитель', 'Дата', 'Статус'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#8C93A0] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#F5F6F8] dark:bg-[#1D212B] flex items-center justify-center text-[#A0A8B5]"><IconOrders /></div>
                        <p className="text-[#8C93A0] text-sm">
                          {search || filterStatus !== 'all' ? 'Ничего не найдено' : isDispatcher ? 'Нарядов пока нет — создайте первый' : 'Вам пока не назначено нарядов'}
                        </p>
                        {isDispatcher && !search && filterStatus === 'all' && (
                          <button onClick={onCreate} className="h-8 px-4 bg-[#2F54EB] hover:bg-[#1E3FC4] text-white text-xs font-semibold rounded-lg transition-colors">Создать наряд</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((o, i) => (
                    <tr
                      key={o.id}
                      onClick={() => onDetail(o.id)}
                      className={`border-b border-[#E4E7ED] dark:border-[#2A2F3A] cursor-pointer hover:bg-[#F5F6F8] dark:hover:bg-[#1D212B] transition-colors ${i === filtered.length - 1 ? 'border-b-0' : ''}`}
                    >
                      <td className="px-4 py-3 font-semibold text-[#1A1D23] dark:text-[#E7E9EE] whitespace-nowrap">#{o.id}</td>
                      <td className="px-4 py-3 text-[#4A5160] dark:text-[#A6ACBA] max-w-[200px] truncate">{o.address}</td>
                      <td className="px-4 py-3 text-[#4A5160] dark:text-[#A6ACBA] whitespace-nowrap">{o.workType}</td>
                      <td className="px-4 py-3 text-[#4A5160] dark:text-[#A6ACBA] whitespace-nowrap">{o.executor || <span className="text-[#A0A8B5]">—</span>}</td>
                      <td className="px-4 py-3 text-[#8C93A0] whitespace-nowrap">{o.date}</td>
                      <td className="px-4 py-3"><Badge status={o.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
          <p className="text-xs text-[#A0A8B5] mt-3">Показано {filtered.length} из {orders.length} нарядов</p>
        </div>
      </main>
    </div>
  );
}

// ─── Create order ────────────────────────────────────────────────────────────

function CreateOrderScreen({ workTypes, user, onSave, onCancel, onNavigate, onLogout }: {
  workTypes: string[];
  user: User;
  onSave: (order: NewOrder) => void;
  onCancel: () => void;
  onNavigate: (s: Screen) => void;
  onLogout: () => void;
}) {
  const [form, setForm] = useState({ address: '', workType: '', client: '', phone: '', comment: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(field: string, val: string) {
    setForm(f => ({ ...f, [field]: val }));
    setErrors(e => ({ ...e, [field]: '' }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.address) errs.address = 'Обязательное поле';
    if (!form.workType) errs.workType = 'Обязательное поле';
    if (!form.client) errs.client = 'Обязательное поле';
    if (!form.phone) errs.phone = 'Обязательное поле';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({ ...form });
  }

  return (
    <div className="flex h-screen bg-[#F5F6F8] dark:bg-[#0F1115]">
      <Sidebar active="list" user={user} onNavigate={onNavigate} onLogout={onLogout} />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <button onClick={onCancel} className="flex items-center gap-1.5 text-sm text-[#4A5160] dark:text-[#A6ACBA] hover:text-[#1A1D23] dark:hover:text-[#E7E9EE] mb-4 transition-colors">
            <IconChevronLeft /> Назад к нарядам
          </button>
          <Card className="p-6">
            <h1 className="text-xl font-bold text-[#1A1D23] dark:text-[#E7E9EE] mb-6">Новый наряд</h1>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Адрес объекта" required error={errors.address}>
                    <input type="text" placeholder="ул. Ленина, д. 42, кв. 18" value={form.address} onChange={e => set('address', e.target.value)} className={inputCls(errors.address)} />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="Тип работ" required error={errors.workType}>
                    <select value={form.workType} onChange={e => set('workType', e.target.value)} className={`${inputCls(errors.workType)} bg-white dark:bg-[#1D212B]`}>
                      <option value="">Выберите тип работ</option>
                      {workTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="ФИО клиента" required error={errors.client}>
                  <input type="text" placeholder="Иванов Иван Иванович" value={form.client} onChange={e => set('client', e.target.value)} className={inputCls(errors.client)} />
                </Field>
                <Field label="Телефон" required error={errors.phone}>
                  <input type="tel" placeholder="+7 (900) 123-45-67" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls(errors.phone)} />
                </Field>
                <div className="col-span-2">
                  <Field label="Комментарий">
                    <textarea placeholder="Дополнительная информация..." value={form.comment} onChange={e => set('comment', e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-[#E4E7ED] dark:border-[#2A2F3A] bg-white dark:bg-[#1D212B] text-sm text-[#1A1D23] dark:text-[#E7E9EE] placeholder-[#A0A8B5] outline-none resize-none focus:border-[#2F54EB] focus:ring-2 focus:ring-[#2F54EB]/20 transition" />
                  </Field>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="h-10 px-6 bg-[#2F54EB] hover:bg-[#1E3FC4] text-white text-sm font-semibold rounded-lg transition-colors">Создать наряд</button>
                <button type="button" onClick={onCancel} className="h-10 px-6 border border-[#E4E7ED] dark:border-[#2A2F3A] text-sm font-medium text-[#4A5160] dark:text-[#A6ACBA] rounded-lg hover:bg-[#F5F6F8] dark:hover:bg-[#1D212B] transition-colors">Отмена</button>
              </div>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}

// ─── Order detail ────────────────────────────────────────────────────────────

function OrderDetailScreen({ order, technicians, user, onBack, onUpdate, onNavigate, onLogout, showToast }: {
  order: WorkOrder;
  technicians: Technician[];
  user: User;
  onBack: () => void;
  onUpdate: (id: string, updates: { executorId?: number | null; status?: Status }) => void;
  onNavigate: (s: Screen) => void;
  onLogout: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [selectedTech, setSelectedTech] = useState<number | ''>(order.executorId ?? '');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const isDispatcher = user.role === 'dispatcher';
  const isMine = user.role === 'montazhnik' && order.executorId === user.technicianId;

  function handleAssign() {
    if (selectedTech === '') return;
    const tech = technicians.find(t => t.id === selectedTech);
    onUpdate(order.id, { executorId: selectedTech });
    showToast(`Исполнитель назначен: ${tech?.fullName ?? ''}`, 'success');
  }

  function handleStatusChange(status: Status) {
    onUpdate(order.id, { status });
    showToast(`Статус изменён: ${STATUS_LABEL[status]}`, 'success');
  }

  function handleCancel() {
    onUpdate(order.id, { status: 'cancelled' });
    showToast(`Наряд #${order.id} отменён`, 'error');
    setShowCancelConfirm(false);
    onBack();
  }

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-[#8C93A0]">{label}</span>
      <span className="text-sm text-[#1A1D23] dark:text-[#E7E9EE] font-medium">{value || '—'}</span>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F5F6F8] dark:bg-[#0F1115]">
      <Sidebar active="list" user={user} onNavigate={onNavigate} onLogout={onLogout} />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-[#4A5160] dark:text-[#A6ACBA] hover:text-[#1A1D23] dark:hover:text-[#E7E9EE] mb-4 transition-colors">
            <IconChevronLeft /> Назад к нарядам
          </button>

          {/* Header */}
          <Card className="p-6 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-xl font-bold text-[#1A1D23] dark:text-[#E7E9EE]">Наряд #{order.id}</h1>
                  <Badge status={order.status} />
                </div>
                <p className="text-sm text-[#8C93A0]">Создан: {order.date}</p>
              </div>
              {isDispatcher && order.status !== 'cancelled' && (
                <button onClick={() => setShowCancelConfirm(true)} className="h-8 px-3 border border-[#FCA5A5] text-xs font-medium text-[#DC2626] rounded-lg hover:bg-[#FEE2E2] dark:hover:bg-[#3A1616] transition-colors">
                  Отменить наряд
                </button>
              )}
            </div>
          </Card>

          {/* Client */}
          <Card className="p-6 mb-4">
            <h2 className="text-sm font-semibold text-[#1A1D23] dark:text-[#E7E9EE] mb-4">Данные клиента</h2>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="ФИО" value={order.client} />
              <InfoRow label="Телефон" value={order.phone} />
            </div>
          </Card>

          {/* Work */}
          <Card className="p-6 mb-4">
            <h2 className="text-sm font-semibold text-[#1A1D23] dark:text-[#E7E9EE] mb-4">Адрес и тип работ</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><InfoRow label="Адрес объекта" value={order.address} /></div>
              <InfoRow label="Тип работ" value={order.workType} />
              {order.comment && <div className="col-span-2"><InfoRow label="Комментарий" value={order.comment} /></div>}
            </div>
          </Card>

          {/* Executor — диспетчер назначает, монтажник меняет статус */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-[#1A1D23] dark:text-[#E7E9EE] mb-4">Исполнитель</h2>
            {order.executor && (
              <div className="mb-4 p-3 bg-[#F5F6F8] dark:bg-[#1D212B] rounded-lg">
                <span className="text-xs text-[#8C93A0]">Текущий исполнитель</span>
                <p className="text-sm font-medium text-[#1A1D23] dark:text-[#E7E9EE] mt-0.5">{order.executor}</p>
              </div>
            )}

            {isDispatcher && (
              <div className="flex gap-3">
                <select value={selectedTech} onChange={e => setSelectedTech(e.target.value === '' ? '' : Number(e.target.value))} className={`${inputCls()} flex-1 bg-white dark:bg-[#1D212B]`}>
                  <option value="">Выберите монтажника</option>
                  {technicians.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                </select>
                <button onClick={handleAssign} disabled={selectedTech === ''} className="h-10 px-4 bg-[#2F54EB] hover:bg-[#1E3FC4] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors">
                  Назначить
                </button>
              </div>
            )}

            {isMine && order.status !== 'done' && order.status !== 'cancelled' && (
              <div className="flex gap-2 flex-wrap">
                {order.status === 'assigned' && (
                  <button onClick={() => handleStatusChange('inwork')} className="h-9 px-4 bg-[#D97706] hover:bg-[#B45309] text-white text-sm font-semibold rounded-lg transition-colors">Взять в работу</button>
                )}
                {order.status === 'inwork' && (
                  <button onClick={() => handleStatusChange('done')} className="h-9 px-4 bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold rounded-lg transition-colors">Завершить</button>
                )}
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Cancel confirm */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 flex items-center justify-center z-40 p-4">
          <Card className="p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-bold text-[#1A1D23] dark:text-[#E7E9EE] mb-2">Отменить наряд?</h3>
            <p className="text-sm text-[#4A5160] dark:text-[#A6ACBA] mb-6">Наряд #{order.id} будет переведён в статус «Отменён». Это действие нельзя отменить.</p>
            <div className="flex gap-3">
              <button onClick={handleCancel} className="flex-1 h-10 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-semibold rounded-lg transition-colors">Да, отменить</button>
              <button onClick={() => setShowCancelConfirm(false)} className="flex-1 h-10 border border-[#E4E7ED] dark:border-[#2A2F3A] text-sm font-medium text-[#4A5160] dark:text-[#A6ACBA] rounded-lg hover:bg-[#F5F6F8] dark:hover:bg-[#1D212B] transition-colors">Назад</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Technicians (CRUD) ───────────────────────────────────────────────────────

function TechniciansScreen({ technicians, user, onAdd, onEdit, onDelete, onNavigate, onLogout }: {
  technicians: Technician[];
  user: User;
  onAdd: (data: { fullName: string; phone: string }) => void;
  onEdit: (id: number, data: { fullName?: string; phone?: string; active?: boolean }) => void;
  onDelete: (id: number) => void;
  onNavigate: (s: Screen) => void;
  onLogout: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Technician | null>(null);
  const [deleting, setDeleting] = useState<Technician | null>(null);

  const isDispatcher = user.role === 'dispatcher';

  return (
    <div className="flex h-screen bg-[#F5F6F8] dark:bg-[#0F1115]">
      <Sidebar active="technicians" user={user} onNavigate={onNavigate} onLogout={onLogout} />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-[#1A1D23] dark:text-[#E7E9EE]">Монтажники</h1>
            {isDispatcher && (
              <button onClick={() => { setEditing(null); setShowForm(true); }} className="h-9 px-4 bg-[#2F54EB] hover:bg-[#1E3FC4] text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors">
                <IconPlus /> Добавить
              </button>
            )}
          </div>

          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E4E7ED] dark:border-[#2A2F3A] bg-[#F5F6F8] dark:bg-[#1D212B]">
                  {['ФИО', 'Телефон', 'Статус', ...(isDispatcher ? ['Действия'] : [])].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#8C93A0] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {technicians.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-[#A0A8B5]">Монтажников пока нет</td></tr>
                ) : technicians.map((t, i) => (
                  <tr key={t.id} className={`${i < technicians.length - 1 ? 'border-b border-[#E4E7ED] dark:border-[#2A2F3A]' : ''}`}>
                    <td className="px-4 py-3 font-medium text-[#1A1D23] dark:text-[#E7E9EE]">{t.fullName}</td>
                    <td className="px-4 py-3 text-[#4A5160] dark:text-[#A6ACBA]">{t.phone || <span className="text-[#A0A8B5]">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${t.active ? 'bg-[#DCFCE7] text-[#16A34A] dark:bg-[#0E2E22] dark:text-[#34D399]' : 'bg-[#F0F1F3] text-[#8C93A0] dark:bg-[#23262E]'}`}>
                        {t.active ? 'Работает' : 'Уволен'}
                      </span>
                    </td>
                    {isDispatcher && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => { setEditing(t); setShowForm(true); }} title="Изменить" className="p-1.5 text-[#8C93A0] hover:text-[#2F54EB] rounded-lg hover:bg-[#EEF2FF] dark:hover:bg-[#1E2742] transition-colors"><IconEdit /></button>
                          <button onClick={() => setDeleting(t)} title="Удалить" className="p-1.5 text-[#8C93A0] hover:text-[#DC2626] rounded-lg hover:bg-[#FEE2E2] dark:hover:bg-[#3A1616] transition-colors"><IconTrash /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </main>

      {/* Create/Edit modal */}
      {showForm && (
        <TechnicianForm
          initial={editing}
          onClose={() => setShowForm(false)}
          onSave={(data) => { editing ? onEdit(editing.id, data) : onAdd(data); setShowForm(false); }}
        />
      )}

      {/* Delete confirm */}
      {deleting && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 flex items-center justify-center z-40 p-4">
          <Card className="p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-bold text-[#1A1D23] dark:text-[#E7E9EE] mb-2">Удалить монтажника?</h3>
            <p className="text-sm text-[#4A5160] dark:text-[#A6ACBA] mb-6">{deleting.fullName} будет удалён. Если у него есть наряды — удаление будет отклонено.</p>
            <div className="flex gap-3">
              <button onClick={() => { onDelete(deleting.id); setDeleting(null); }} className="flex-1 h-10 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-semibold rounded-lg transition-colors">Удалить</button>
              <button onClick={() => setDeleting(null)} className="flex-1 h-10 border border-[#E4E7ED] dark:border-[#2A2F3A] text-sm font-medium text-[#4A5160] dark:text-[#A6ACBA] rounded-lg hover:bg-[#F5F6F8] dark:hover:bg-[#1D212B] transition-colors">Отмена</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function TechnicianForm({ initial, onClose, onSave }: {
  initial: Technician | null;
  onClose: () => void;
  onSave: (data: { fullName: string; phone: string; active?: boolean }) => void;
}) {
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { setError('Укажите ФИО'); return; }
    onSave({ fullName: fullName.trim(), phone: phone.trim(), ...(initial ? { active } : {}) });
  }

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/60 flex items-center justify-center z-40 p-4">
      <Card className="p-6 w-full max-w-sm shadow-xl">
        <h3 className="text-base font-bold text-[#1A1D23] dark:text-[#E7E9EE] mb-5">{initial ? 'Изменить монтажника' : 'Новый монтажник'}</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="ФИО" required error={error}>
            <input type="text" placeholder="Иванов И.И." value={fullName} onChange={e => { setFullName(e.target.value); setError(''); }} className={inputCls(error)} />
          </Field>
          <Field label="Телефон">
            <input type="tel" placeholder="+7 (900) 123-45-67" value={phone} onChange={e => setPhone(e.target.value)} className={inputCls()} />
          </Field>
          {initial && (
            <label className="flex items-center gap-2 text-sm text-[#4A5160] dark:text-[#A6ACBA] cursor-pointer">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="w-4 h-4 accent-[#2F54EB]" />
              Работает (доступен для назначения)
            </label>
          )}
          <div className="flex gap-3 pt-1">
            <button type="submit" className="flex-1 h-10 bg-[#2F54EB] hover:bg-[#1E3FC4] text-white text-sm font-semibold rounded-lg transition-colors">{initial ? 'Сохранить' : 'Добавить'}</button>
            <button type="button" onClick={onClose} className="flex-1 h-10 border border-[#E4E7ED] dark:border-[#2A2F3A] text-sm font-medium text-[#4A5160] dark:text-[#A6ACBA] rounded-lg hover:bg-[#F5F6F8] dark:hover:bg-[#1D212B] transition-colors">Отмена</button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ─── Reports ─────────────────────────────────────────────────────────────────

function ReportsScreen({ user, onNavigate, onLogout, showToast }: {
  user: User;
  onNavigate: (s: Screen) => void;
  onLogout: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [dateFrom, setDateFrom] = useState('2026-09-01');
  const [dateTo, setDateTo] = useState('2026-09-30');
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    try {
      setReport(await getReportSummary(dateFrom, dateTo));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Не удалось загрузить отчёт', 'error');
    } finally {
      setLoading(false);
    }
  }

  const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <Card className="p-5">
      <p className="text-xs font-semibold text-[#8C93A0] uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </Card>
  );

  return (
    <div className="flex h-screen bg-[#F5F6F8] dark:bg-[#0F1115]">
      <Sidebar active="reports" user={user} onNavigate={onNavigate} onLogout={onLogout} />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-[#1A1D23] dark:text-[#E7E9EE]">Отчёты</h1>
            <button className="h-9 px-4 border border-[#E4E7ED] dark:border-[#2A2F3A] text-sm font-medium text-[#4A5160] dark:text-[#A6ACBA] rounded-lg hover:bg-[#F5F6F8] dark:hover:bg-[#1D212B] flex items-center gap-2 transition-colors">
              <IconDownload /> Выгрузить
            </button>
          </div>

          {/* Period */}
          <Card className="p-4 mb-6 flex items-center gap-4">
            <span className="text-sm font-medium text-[#4A5160] dark:text-[#A6ACBA]">Период:</span>
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 px-3 rounded-lg border border-[#E4E7ED] dark:border-[#2A2F3A] bg-white dark:bg-[#1D212B] text-sm text-[#1A1D23] dark:text-[#E7E9EE] outline-none focus:border-[#2F54EB] transition" />
              <span className="text-[#A0A8B5]">—</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 px-3 rounded-lg border border-[#E4E7ED] dark:border-[#2A2F3A] bg-white dark:bg-[#1D212B] text-sm text-[#1A1D23] dark:text-[#E7E9EE] outline-none focus:border-[#2F54EB] transition" />
            </div>
            <button onClick={load} disabled={loading} className="h-9 px-4 bg-[#2F54EB] hover:bg-[#1E3FC4] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
              {loading ? 'Загрузка...' : 'Применить'}
            </button>
          </Card>

          {report && (
            <>
              <div className="grid grid-cols-4 gap-4 mb-6">
                <StatCard label="Всего нарядов" value={report.total} color="text-[#1A1D23] dark:text-[#E7E9EE]" />
                <StatCard label="Выполнено" value={report.done} color="text-[#16A34A]" />
                <StatCard label="В работе" value={report.inwork} color="text-[#D97706]" />
                <StatCard label="Отменено" value={report.cancelled} color="text-[#DC2626]" />
              </div>

              <Card className="overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E4E7ED] dark:border-[#2A2F3A]">
                  <h2 className="text-sm font-semibold text-[#1A1D23] dark:text-[#E7E9EE]">Загрузка монтажников</h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E4E7ED] dark:border-[#2A2F3A] bg-[#F5F6F8] dark:bg-[#1D212B]">
                      {['Монтажник', 'Назначено', 'Выполнено', 'В работе', 'Выполнение'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#8C93A0] uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.byTechnician.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-[#A0A8B5]">Нет данных за период</td></tr>
                    ) : report.byTechnician.map((t, i) => {
                      const pct = t.total > 0 ? Math.round((t.done / t.total) * 100) : 0;
                      return (
                        <tr key={t.technicianId} className={`${i < report.byTechnician.length - 1 ? 'border-b border-[#E4E7ED] dark:border-[#2A2F3A]' : ''}`}>
                          <td className="px-5 py-3 font-medium text-[#1A1D23] dark:text-[#E7E9EE]">{t.fullName}</td>
                          <td className="px-5 py-3 text-[#4A5160] dark:text-[#A6ACBA]">{t.total}</td>
                          <td className="px-5 py-3 text-[#16A34A] font-medium">{t.done}</td>
                          <td className="px-5 py-3 text-[#D97706] font-medium">{t.inwork}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-[#F0F1F3] dark:bg-[#23262E] rounded-full overflow-hidden">
                                <div className="h-full bg-[#16A34A] rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-medium text-[#4A5160] dark:text-[#A6ACBA] w-8 shrink-0">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Settings (theme) ─────────────────────────────────────────────────────────

function SettingsScreen({ user, theme, onThemeChange, onNavigate, onLogout }: {
  user: User;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  onNavigate: (s: Screen) => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex h-screen bg-[#F5F6F8] dark:bg-[#0F1115]">
      <Sidebar active="settings" user={user} onNavigate={onNavigate} onLogout={onLogout} />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-[#1A1D23] dark:text-[#E7E9EE] mb-6">Настройки</h1>

          <Card className="p-6">
            <h2 className="text-sm font-semibold text-[#1A1D23] dark:text-[#E7E9EE] mb-1">Оформление</h2>
            <p className="text-xs text-[#8C93A0] mb-5">Тема интерфейса сохраняется локально.</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onThemeChange('light')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
                  theme === 'light' ? 'border-[#2F54EB] bg-[#EEF2FF] dark:bg-[#1E2742]' : 'border-[#E4E7ED] dark:border-[#2A2F3A] hover:border-[#A0A8B5]'
                }`}
              >
                <span className={`${theme === 'light' ? 'text-[#2F54EB]' : 'text-[#8C93A0]'}`}><IconSun /></span>
                <div className="text-left">
                  <div className={`text-sm font-medium ${theme === 'light' ? 'text-[#2F54EB] dark:text-[#7D97FF]' : 'text-[#1A1D23] dark:text-[#E7E9EE]'}`}>Светлая</div>
                  <div className="text-[11px] text-[#8C93A0]">По умолчанию</div>
                </div>
              </button>
              <button
                onClick={() => onThemeChange('dark')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
                  theme === 'dark' ? 'border-[#2F54EB] bg-[#EEF2FF] dark:bg-[#1E2742]' : 'border-[#E4E7ED] dark:border-[#2A2F3A] hover:border-[#A0A8B5]'
                }`}
              >
                <span className={`${theme === 'dark' ? 'text-[#2F54EB] dark:text-[#7D97FF]' : 'text-[#8C93A0]'}`}><IconMoon /></span>
                <div className="text-left">
                  <div className={`text-sm font-medium ${theme === 'dark' ? 'text-[#2F54EB] dark:text-[#7D97FF]' : 'text-[#1A1D23] dark:text-[#E7E9EE]'}`}>Тёмная</div>
                  <div className="text-[11px] text-[#8C93A0]">Для работы ночью</div>
                </div>
              </button>
            </div>
          </Card>

          <Card className="p-6 mt-4">
            <h2 className="text-sm font-semibold text-[#1A1D23] dark:text-[#E7E9EE] mb-4">Профиль</h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#2F54EB] flex items-center justify-center text-white text-sm font-semibold">
                {user.fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium text-[#1A1D23] dark:text-[#E7E9EE]">{user.fullName}</div>
                <div className="text-xs text-[#8C93A0]">@{user.login} · {user.role === 'dispatcher' ? 'Диспетчер' : 'Монтажник'}</div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

let toastCounter = 0;
const THEME_KEY = 'montazh360_theme';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [screen, setScreen] = useState<Screen>('list');
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [workTypes, setWorkTypes] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(THEME_KEY) as Theme) || 'light');

  // Применяем тему к <html> и сохраняем.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Восстановление сессии по сохранённому токену.
  useEffect(() => {
    if (!getToken()) { setBooting(false); return; }
    apiMe()
      .then(u => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setBooting(false));
  }, []);

  // Загрузка данных после входа.
  useEffect(() => {
    if (!user) return;
    reloadOrders();
    reloadTechnicians();
    getMeta().then(m => setWorkTypes(m.workTypes)).catch(() => {});
  }, [user]);

  function reloadOrders() {
    listOrders().then(setOrders).catch(err => showToast(`Не удалось загрузить наряды: ${err.message}`, 'error'));
  }
  function reloadTechnicians() {
    listTechnicians().then(setTechnicians).catch(() => {});
  }

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    const id = ++toastCounter;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }
  function dismissToast(id: number) {
    setToasts(t => t.filter(x => x.id !== id));
  }

  function handleLogin(u: User) {
    setUser(u);
    setScreen('list');
  }
  function handleLogout() {
    apiLogout();
    setUser(null);
    setOrders([]);
    setTechnicians([]);
    setScreen('list');
  }

  function handleCreate(data: NewOrder) {
    createOrder(data)
      .then(created => { setOrders(o => [created, ...o]); setScreen('list'); showToast(`Наряд #${created.id} создан`, 'success'); })
      .catch(err => showToast(`Не удалось создать наряд: ${err.message}`, 'error'));
  }
  function handleDetail(id: string) {
    setSelectedId(id);
    setScreen('detail');
  }
  function handleUpdate(id: string, updates: { executorId?: number | null; status?: Status }) {
    updateOrder(id, updates)
      .then(updated => { if (updated) { setOrders(o => o.map(order => order.id === id ? updated : order)); reloadTechnicians(); } })
      .catch(err => showToast(`Не удалось обновить наряд: ${err.message}`, 'error'));
  }

  function handleAddTechnician(data: { fullName: string; phone: string }) {
    createTechnician(data)
      .then(() => { reloadTechnicians(); showToast(`Монтажник ${data.fullName} добавлен`, 'success'); })
      .catch(err => showToast(err.message, 'error'));
  }
  function handleEditTechnician(id: number, data: { fullName?: string; phone?: string; active?: boolean }) {
    updateTechnician(id, data)
      .then(() => { reloadTechnicians(); showToast('Монтажник обновлён', 'success'); })
      .catch(err => showToast(err.message, 'error'));
  }
  function handleDeleteTechnician(id: number) {
    deleteTechnician(id)
      .then(() => { reloadTechnicians(); showToast('Монтажник удалён', 'success'); })
      .catch(err => showToast(err.message, 'error'));
  }

  const selectedOrder = orders.find(o => o.id === selectedId);

  if (booting) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] dark:bg-[#0F1115] flex items-center justify-center">
        <div className="text-sm text-[#8C93A0]">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  const activeTechs = technicians.filter(t => t.active);

  return (
    <>
      {screen === 'list' && (
        <OrderListScreen orders={orders} user={user} onCreate={() => setScreen('create')} onDetail={handleDetail} onNavigate={setScreen} onLogout={handleLogout} />
      )}
      {screen === 'create' && (
        <CreateOrderScreen workTypes={workTypes} user={user} onSave={handleCreate} onCancel={() => setScreen('list')} onNavigate={setScreen} onLogout={handleLogout} />
      )}
      {screen === 'detail' && selectedOrder && (
        <OrderDetailScreen order={selectedOrder} technicians={activeTechs} user={user} onBack={() => setScreen('list')} onUpdate={handleUpdate} onNavigate={setScreen} onLogout={handleLogout} showToast={showToast} />
      )}
      {screen === 'technicians' && (
        <TechniciansScreen technicians={technicians} user={user} onAdd={handleAddTechnician} onEdit={handleEditTechnician} onDelete={handleDeleteTechnician} onNavigate={setScreen} onLogout={handleLogout} />
      )}
      {screen === 'reports' && (
        <ReportsScreen user={user} onNavigate={setScreen} onLogout={handleLogout} showToast={showToast} />
      )}
      {screen === 'settings' && (
        <SettingsScreen user={user} theme={theme} onThemeChange={setTheme} onNavigate={setScreen} onLogout={handleLogout} />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

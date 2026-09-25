import { useEffect, useState } from 'react';
import {
  listOrders, createOrder, updateOrder, getMeta,
  type NewOrder, type Status, type WorkOrder,
} from './api';

// ─── Types ───────────────────────────────────────────────────────────────────

type Screen = 'login' | 'list' | 'create' | 'detail' | 'reports';

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
  created:   'bg-[#F0F1F3] text-[#8C93A0]',
  assigned:  'bg-[#EEF2FF] text-[#2F54EB]',
  inwork:    'bg-[#FEF3C7] text-[#D97706]',
  done:      'bg-[#DCFCE7] text-[#16A34A]',
  cancelled: 'bg-[#FEE2E2] text-[#DC2626]',
};

function Badge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

// ─── Icon components ──────────────────────────────────────────────────────────

function IconOrders() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
  );
}
function IconTech() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );
}
function IconReports() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

// ─── Toast ────────────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium cursor-pointer transition-all select-none ${
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

function Sidebar({ active, onNavigate }: { active: Screen; onNavigate: (s: Screen) => void }) {
  const nav = [
    { id: 'list' as Screen, label: 'Наряды', icon: <IconOrders /> },
    { id: 'list' as Screen, label: 'Монтажники', icon: <IconTech /> },
    { id: 'reports' as Screen, label: 'Отчёты', icon: <IconReports /> },
    { id: 'list' as Screen, label: 'Настройки', icon: <IconSettings /> },
  ];

  const activeSection = active === 'reports' ? 'reports' : active === 'list' || active === 'create' || active === 'detail' ? 'list' : 'list';

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-[#E4E7ED] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#E4E7ED]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#2F54EB] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div className="text-[13px] font-700 text-[#1A1D23] leading-tight">Монтаж 360</div>
            <div className="text-[10px] text-[#8C93A0]">Управление нарядами</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
        {nav.map((item, i) => {
          const isActive = (item.id === 'list' && activeSection === 'list' && i === 0)
            || (item.id === 'reports' && activeSection === 'reports');
          return (
            <button
              key={i}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left w-full ${
                isActive
                  ? 'bg-[#EEF2FF] text-[#2F54EB]'
                  : 'text-[#4A5160] hover:bg-[#F5F6F8] hover:text-[#1A1D23]'
              }`}
            >
              <span className={isActive ? 'text-[#2F54EB]' : 'text-[#8C93A0]'}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Profile */}
      <div className="px-4 py-4 border-t border-[#E4E7ED]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#2F54EB] flex items-center justify-center text-white text-xs font-600">АД</div>
          <div>
            <div className="text-xs font-500 text-[#1A1D23]">Администратор</div>
            <div className="text-[11px] text-[#8C93A0]">admin@montazh360.ru</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Screen D1: Login ─────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!login || !password) {
      setError('Введите логин и пароль');
      return;
    }
    onLogin();
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#2F54EB] flex items-center justify-center mb-4 shadow-lg">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="text-2xl font-700 text-[#1A1D23]">Монтаж 360</h1>
          <p className="text-sm text-[#8C93A0] mt-1">Система управления нарядами</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E4E7ED] p-8 shadow-sm">
          <h2 className="text-lg font-600 text-[#1A1D23] mb-6">Вход в систему</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-500 text-[#1A1D23] mb-1.5">Логин</label>
              <input
                type="text"
                placeholder="Введите логин"
                value={login}
                onChange={e => { setLogin(e.target.value); setError(''); }}
                className="w-full h-10 px-3 rounded-lg border border-[#E4E7ED] text-sm text-[#1A1D23] placeholder-[#A0A8B5] outline-none focus:border-[#2F54EB] focus:ring-2 focus:ring-[#2F54EB]/20 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-500 text-[#1A1D23] mb-1.5">Пароль</label>
              <input
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                className="w-full h-10 px-3 rounded-lg border border-[#E4E7ED] text-sm text-[#1A1D23] placeholder-[#A0A8B5] outline-none focus:border-[#2F54EB] focus:ring-2 focus:ring-[#2F54EB]/20 transition"
              />
            </div>

            {error && <p className="text-xs text-[#DC2626]">{error}</p>}

            <button
              type="submit"
              className="h-10 bg-[#2F54EB] hover:bg-[#1E3FC4] text-white text-sm font-600 rounded-lg transition-colors mt-1"
            >
              Войти
            </button>
          </form>

          <div className="flex justify-between mt-5 text-xs text-[#2F54EB]">
            <button className="hover:underline">Забыли пароль?</button>
            <button className="hover:underline">Регистрация</button>
          </div>
        </div>

        <p className="text-center text-xs text-[#A0A8B5] mt-6">© 2026 Монтаж 360. Все права защищены.</p>
      </div>
    </div>
  );
}

// ─── Screen D2: Order List ────────────────────────────────────────────────────

function OrderListScreen({
  orders, onCreate, onDetail, onNavigate,
}: {
  orders: WorkOrder[];
  onCreate: () => void;
  onDetail: (id: string) => void;
  onNavigate: (s: Screen) => void;
}) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');
  const [showFilter, setShowFilter] = useState(false);

  const filtered = orders.filter(o => {
    const matchSearch = !search || [o.id, o.address, o.client, o.workType, o.executor || '']
      .join(' ').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex h-screen">
      <Sidebar active="list" onNavigate={onNavigate} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b border-[#E4E7ED] px-6 py-4 flex items-center gap-3 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A8B5]"><IconSearch /></span>
            <input
              type="text"
              placeholder="Поиск по наряду, адресу, клиенту..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#E4E7ED] text-sm placeholder-[#A0A8B5] outline-none focus:border-[#2F54EB] focus:ring-2 focus:ring-[#2F54EB]/20 transition"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`h-9 px-3 flex items-center gap-2 rounded-lg border text-sm font-500 transition-colors ${
                showFilter || filterStatus !== 'all'
                  ? 'border-[#2F54EB] bg-[#EEF2FF] text-[#2F54EB]'
                  : 'border-[#E4E7ED] bg-white text-[#4A5160] hover:bg-[#F5F6F8]'
              }`}
            >
              <IconFilter />
              Фильтр
              {filterStatus !== 'all' && <span className="w-1.5 h-1.5 rounded-full bg-[#2F54EB]" />}
            </button>

            {showFilter && (
              <div className="absolute top-full mt-1 left-0 bg-white border border-[#E4E7ED] rounded-xl shadow-lg p-3 z-20 w-44">
                <p className="text-xs font-600 text-[#8C93A0] mb-2 uppercase tracking-wide">Статус</p>
                {(['all', 'created', 'assigned', 'inwork', 'done', 'cancelled'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => { setFilterStatus(s); setShowFilter(false); }}
                    className={`flex items-center gap-2 w-full text-left text-sm py-1.5 px-2 rounded-lg hover:bg-[#F5F6F8] transition-colors ${
                      filterStatus === s ? 'font-600 text-[#2F54EB]' : 'text-[#4A5160]'
                    }`}
                  >
                    {s === 'all' ? 'Все статусы' : STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onCreate}
            className="h-9 px-4 bg-[#2F54EB] hover:bg-[#1E3FC4] text-white text-sm font-600 rounded-lg flex items-center gap-2 transition-colors ml-auto shrink-0"
          >
            <IconPlus /> Создать наряд
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-xl border border-[#E4E7ED] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E4E7ED] bg-[#F5F6F8]">
                  {['№ наряда', 'Адрес', 'Тип работ', 'Исполнитель', 'Дата', 'Статус'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-600 text-[#8C93A0] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#F5F6F8] flex items-center justify-center text-[#A0A8B5]">
                          <IconOrders />
                        </div>
                        <p className="text-[#8C93A0] text-sm">
                          {search || filterStatus !== 'all' ? 'Ничего не найдено' : 'Нарядов пока нет — создайте первый'}
                        </p>
                        {!search && filterStatus === 'all' && (
                          <button
                            onClick={onCreate}
                            className="h-8 px-4 bg-[#2F54EB] hover:bg-[#1E3FC4] text-white text-xs font-600 rounded-lg transition-colors"
                          >
                            Создать наряд
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((o, i) => (
                    <tr
                      key={o.id}
                      onClick={() => onDetail(o.id)}
                      className={`border-b border-[#E4E7ED] cursor-pointer hover:bg-[#F5F6F8] transition-colors ${i === filtered.length - 1 ? 'border-b-0' : ''}`}
                    >
                      <td className="px-4 py-3 font-600 text-[#1A1D23] whitespace-nowrap">#{o.id}</td>
                      <td className="px-4 py-3 text-[#4A5160] max-w-[200px] truncate">{o.address}</td>
                      <td className="px-4 py-3 text-[#4A5160] whitespace-nowrap">{o.workType}</td>
                      <td className="px-4 py-3 text-[#4A5160] whitespace-nowrap">{o.executor || <span className="text-[#A0A8B5]">—</span>}</td>
                      <td className="px-4 py-3 text-[#8C93A0] whitespace-nowrap">{o.date}</td>
                      <td className="px-4 py-3"><Badge status={o.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-[#A0A8B5] mt-3">Показано {filtered.length} из {orders.length} нарядов</p>
        </div>
      </main>
    </div>
  );
}

// ─── Screen D3: Create Order ──────────────────────────────────────────────────

function CreateOrderScreen({
  workTypes, onSave, onCancel, onNavigate,
}: {
  workTypes: string[];
  onSave: (order: NewOrder) => void;
  onCancel: () => void;
  onNavigate: (s: Screen) => void;
}) {
  const [form, setForm] = useState({
    address: '', workType: '', client: '', phone: '', comment: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(field: string, val: string) {
    setForm(f => ({ ...f, [field]: val }));
    setErrors(e => ({ ...e, [field]: '' }));
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.address) errs.address = 'Обязательное поле';
    if (!form.workType) errs.workType = 'Обязательное поле';
    if (!form.client) errs.client = 'Обязательное поле';
    if (!form.phone) errs.phone = 'Обязательное поле';
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({ ...form });
  }

  function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
    return (
      <div>
        <label className="block text-sm font-500 text-[#1A1D23] mb-1.5">
          {label} {required && <span className="text-[#DC2626]">*</span>}
        </label>
        {children}
        {error && <p className="text-xs text-[#DC2626] mt-1">{error}</p>}
      </div>
    );
  }

  const inputCls = (err?: string) =>
    `w-full h-10 px-3 rounded-lg border text-sm text-[#1A1D23] placeholder-[#A0A8B5] outline-none transition focus:ring-2 ${
      err ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/20' : 'border-[#E4E7ED] focus:border-[#2F54EB] focus:ring-[#2F54EB]/20'
    }`;

  return (
    <div className="flex h-screen">
      <Sidebar active="list" onNavigate={onNavigate} />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-sm text-[#4A5160] hover:text-[#1A1D23] mb-4 transition-colors"
          >
            <IconChevronLeft /> Назад к нарядам
          </button>

          <div className="bg-white rounded-xl border border-[#E4E7ED] p-6">
            <h1 className="text-xl font-700 text-[#1A1D23] mb-6">Новый наряд</h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Адрес объекта" required error={errors.address}>
                    <input
                      type="text"
                      placeholder="ул. Ленина, д. 42, кв. 18"
                      value={form.address}
                      onChange={e => set('address', e.target.value)}
                      className={inputCls(errors.address)}
                    />
                  </Field>
                </div>

                <div className="col-span-2">
                  <Field label="Тип работ" required error={errors.workType}>
                    <select
                      value={form.workType}
                      onChange={e => set('workType', e.target.value)}
                      className={`${inputCls(errors.workType)} bg-white`}
                    >
                      <option value="">Выберите тип работ</option>
                      {workTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                </div>

                <Field label="ФИО клиента" required error={errors.client}>
                  <input
                    type="text"
                    placeholder="Смирнов Игорь Алексеевич"
                    value={form.client}
                    onChange={e => set('client', e.target.value)}
                    className={inputCls(errors.client)}
                  />
                </Field>

                <Field label="Телефон" required error={errors.phone}>
                  <input
                    type="tel"
                    placeholder="+7 900 000-00-00"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    className={inputCls(errors.phone)}
                  />
                </Field>

                <div className="col-span-2">
                  <Field label="Комментарий">
                    <textarea
                      placeholder="Дополнительная информация..."
                      value={form.comment}
                      onChange={e => set('comment', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E7ED] text-sm text-[#1A1D23] placeholder-[#A0A8B5] outline-none resize-none focus:border-[#2F54EB] focus:ring-2 focus:ring-[#2F54EB]/20 transition"
                    />
                  </Field>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="h-10 px-6 bg-[#2F54EB] hover:bg-[#1E3FC4] text-white text-sm font-600 rounded-lg transition-colors"
                >
                  Создать наряд
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="h-10 px-6 border border-[#E4E7ED] text-sm font-500 text-[#4A5160] rounded-lg hover:bg-[#F5F6F8] transition-colors"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Screen D4: Order Detail ──────────────────────────────────────────────────

function OrderDetailScreen({
  order, technicians, onBack, onUpdate, onNavigate,
  showToast,
}: {
  order: WorkOrder;
  technicians: string[];
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<WorkOrder>) => void;
  onNavigate: (s: Screen) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [selectedTech, setSelectedTech] = useState(order.executor || '');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  function handleAssign() {
    if (!selectedTech) return;
    onUpdate(order.id, { executor: selectedTech, status: 'assigned' });
    showToast(`Исполнитель назначен: ${selectedTech}`, 'success');
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
      <span className="text-sm text-[#1A1D23] font-500">{value || '—'}</span>
    </div>
  );

  return (
    <div className="flex h-screen">
      <Sidebar active="list" onNavigate={onNavigate} />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-[#4A5160] hover:text-[#1A1D23] mb-4 transition-colors"
          >
            <IconChevronLeft /> Назад к нарядам
          </button>

          {/* Header */}
          <div className="bg-white rounded-xl border border-[#E4E7ED] p-6 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-xl font-700 text-[#1A1D23]">Наряд #{order.id}</h1>
                  <Badge status={order.status} />
                </div>
                <p className="text-sm text-[#8C93A0]">Создан: {order.date}</p>
              </div>
              <div className="flex gap-2">
                <button className="h-8 px-3 border border-[#E4E7ED] text-xs font-500 text-[#4A5160] rounded-lg hover:bg-[#F5F6F8] transition-colors">
                  Изменить
                </button>
                {order.status !== 'cancelled' && (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="h-8 px-3 border border-[#FCA5A5] text-xs font-500 text-[#DC2626] rounded-lg hover:bg-[#FEE2E2] transition-colors"
                  >
                    Отменить наряд
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Client info */}
          <div className="bg-white rounded-xl border border-[#E4E7ED] p-6 mb-4">
            <h2 className="text-sm font-600 text-[#1A1D23] mb-4">Данные клиента</h2>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="ФИО" value={order.client} />
              <InfoRow label="Телефон" value={order.phone} />
            </div>
          </div>

          {/* Work info */}
          <div className="bg-white rounded-xl border border-[#E4E7ED] p-6 mb-4">
            <h2 className="text-sm font-600 text-[#1A1D23] mb-4">Адрес и тип работ</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><InfoRow label="Адрес объекта" value={order.address} /></div>
              <InfoRow label="Тип работ" value={order.workType} />
              {order.comment && (
                <div className="col-span-2"><InfoRow label="Комментарий" value={order.comment} /></div>
              )}
            </div>
          </div>

          {/* Executor */}
          <div className="bg-white rounded-xl border border-[#E4E7ED] p-6">
            <h2 className="text-sm font-600 text-[#1A1D23] mb-4">Исполнитель</h2>
            {order.executor && (
              <div className="mb-4 p-3 bg-[#F5F6F8] rounded-lg">
                <span className="text-xs text-[#8C93A0]">Текущий исполнитель</span>
                <p className="text-sm font-500 text-[#1A1D23] mt-0.5">{order.executor}</p>
              </div>
            )}
            <div className="flex gap-3">
              <select
                value={selectedTech}
                onChange={e => setSelectedTech(e.target.value)}
                className="flex-1 h-10 px-3 rounded-lg border border-[#E4E7ED] text-sm text-[#1A1D23] bg-white outline-none focus:border-[#2F54EB] focus:ring-2 focus:ring-[#2F54EB]/20 transition"
              >
                <option value="">Выберите монтажника</option>
                {technicians.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button
                onClick={handleAssign}
                disabled={!selectedTech}
                className="h-10 px-4 bg-[#2F54EB] hover:bg-[#1E3FC4] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-600 rounded-lg transition-colors"
              >
                Назначить
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Cancel confirm modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-xl border border-[#E4E7ED] p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-700 text-[#1A1D23] mb-2">Отменить наряд?</h3>
            <p className="text-sm text-[#4A5160] mb-6">Наряд #{order.id} будет переведён в статус «Отменён». Это действие нельзя отменить.</p>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 h-10 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-600 rounded-lg transition-colors"
              >
                Да, отменить
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 h-10 border border-[#E4E7ED] text-sm font-500 text-[#4A5160] rounded-lg hover:bg-[#F5F6F8] transition-colors"
              >
                Назад
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Screen D5: Reports ───────────────────────────────────────────────────────

function ReportsScreen({ orders, technicians, onNavigate }: { orders: WorkOrder[]; technicians: string[]; onNavigate: (s: Screen) => void }) {
  const [dateFrom, setDateFrom] = useState('2026-09-01');
  const [dateTo, setDateTo] = useState('2026-09-30');

  const total = orders.length;
  const done = orders.filter(o => o.status === 'done').length;
  const inwork = orders.filter(o => o.status === 'inwork').length;
  const cancelled = orders.filter(o => o.status === 'cancelled').length;

  const techStats = technicians.map(name => {
    const assigned = orders.filter(o => o.executor === name);
    return {
      name,
      total: assigned.length,
      done: assigned.filter(o => o.status === 'done').length,
      inwork: assigned.filter(o => o.status === 'inwork').length,
    };
  }).filter(t => t.total > 0);

  const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="bg-white rounded-xl border border-[#E4E7ED] p-5">
      <p className="text-xs font-600 text-[#8C93A0] uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-3xl font-700 ${color}`}>{value}</p>
    </div>
  );

  return (
    <div className="flex h-screen">
      <Sidebar active="reports" onNavigate={onNavigate} />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-700 text-[#1A1D23]">Отчёты</h1>
            <button className="h-9 px-4 border border-[#E4E7ED] text-sm font-500 text-[#4A5160] rounded-lg hover:bg-[#F5F6F8] flex items-center gap-2 transition-colors">
              <IconDownload /> Выгрузить
            </button>
          </div>

          {/* Period picker */}
          <div className="bg-white rounded-xl border border-[#E4E7ED] p-4 mb-6 flex items-center gap-4">
            <span className="text-sm font-500 text-[#4A5160]">Период:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-9 px-3 rounded-lg border border-[#E4E7ED] text-sm outline-none focus:border-[#2F54EB] transition"
              />
              <span className="text-[#A0A8B5]">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="h-9 px-3 rounded-lg border border-[#E4E7ED] text-sm outline-none focus:border-[#2F54EB] transition"
              />
            </div>
            <button className="h-9 px-4 bg-[#2F54EB] hover:bg-[#1E3FC4] text-white text-sm font-600 rounded-lg transition-colors">
              Применить
            </button>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Всего нарядов" value={total} color="text-[#1A1D23]" />
            <StatCard label="Выполнено" value={done} color="text-[#16A34A]" />
            <StatCard label="В работе" value={inwork} color="text-[#D97706]" />
            <StatCard label="Отменено" value={cancelled} color="text-[#DC2626]" />
          </div>

          {/* Technician table */}
          <div className="bg-white rounded-xl border border-[#E4E7ED] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E4E7ED]">
              <h2 className="text-sm font-600 text-[#1A1D23]">Загрузка монтажников</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E4E7ED] bg-[#F5F6F8]">
                  {['Монтажник', 'Назначено', 'Выполнено', 'В работе', 'Выполнение'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-600 text-[#8C93A0] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {techStats.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-[#A0A8B5]">Нет данных за период</td></tr>
                ) : techStats.map((t, i) => {
                  const pct = t.total > 0 ? Math.round((t.done / t.total) * 100) : 0;
                  return (
                    <tr key={t.name} className={`${i < techStats.length - 1 ? 'border-b border-[#E4E7ED]' : ''}`}>
                      <td className="px-5 py-3 font-500 text-[#1A1D23]">{t.name}</td>
                      <td className="px-5 py-3 text-[#4A5160]">{t.total}</td>
                      <td className="px-5 py-3 text-[#16A34A] font-500">{t.done}</td>
                      <td className="px-5 py-3 text-[#D97706] font-500">{t.inwork}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[#F0F1F3] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#16A34A] rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-500 text-[#4A5160] w-8 shrink-0">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

let toastCounter = 0;

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Первичная загрузка нарядов (пока из моков, потом — GET /api/orders).
  useEffect(() => {
    let cancelled = false;
    listOrders().then(data => { if (!cancelled) setOrders(data); });
    return () => { cancelled = true; };
  }, []);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    const id = ++toastCounter;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }

  function dismissToast(id: number) {
    setToasts(t => t.filter(x => x.id !== id));
  }

  function handleLogin() {
    setScreen('list');
  }

  function handleCreate(data: NewOrder) {
    createOrder(data).then(created => {
      setOrders(o => [created, ...o]);
      setScreen('list');
      showToast(`Наряд #${created.id} создан`, 'success');
    });
  }

  function handleDetail(id: string) {
    setSelectedId(id);
    setScreen('detail');
  }

  function handleUpdate(id: string, updates: Partial<WorkOrder>) {
    updateOrder(id, updates).then(updated => {
      if (updated) setOrders(o => o.map(order => order.id === id ? updated : order));
    });
  }

  const selectedOrder = orders.find(o => o.id === selectedId);

  return (
    <>
      {screen === 'login' && <LoginScreen onLogin={handleLogin} />}
      {screen === 'list' && (
        <OrderListScreen
          orders={orders}
          onCreate={() => setScreen('create')}
          onDetail={handleDetail}
          onNavigate={setScreen}
        />
      )}
      {screen === 'create' && (
        <CreateOrderScreen
          onSave={handleCreate}
          onCancel={() => setScreen('list')}
          onNavigate={setScreen}
        />
      )}
      {screen === 'detail' && selectedOrder && (
        <OrderDetailScreen
          order={selectedOrder}
          onBack={() => setScreen('list')}
          onUpdate={handleUpdate}
          onNavigate={setScreen}
          showToast={showToast}
        />
      )}
      {screen === 'reports' && (
        <ReportsScreen orders={orders} onNavigate={setScreen} />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

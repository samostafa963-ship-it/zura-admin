'use client';
import { useState, useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://zura-web-production-42ca.up.railway.app';
const ADMIN_PASSWORD = 'zura2025';

interface Order { _id: string; name: string; phone: string; address: any; total: number; status: string; createdAt: string; items: any[]; paymentMethod: string; customer?: any; }
interface Product { _id: string; name: string; price: number; old_price?: number; image: string; category: string; unit?: string; description?: string; discount?: number; sales_count?: number; }
interface Banner { _id: string; title: string; image: string; isActive: boolean; order: number; }
interface Category { _id: string; name: string; icon?: string; }

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  placed:    { label: 'جديد',          color: '#E91E8C', bg: '#fce8f5' },
  pending:   { label: 'معلق',          color: '#f59e0b', bg: '#fff8e1' },
  preparing: { label: 'جاري التحضير', color: '#8b5cf6', bg: '#ede9fe' },
  onway:     { label: 'في الطريق',     color: '#3b82f6', bg: '#e0f2fe' },
  delivered: { label: 'تم التوصيل',    color: '#10b981', bg: '#d1fae5' },
  cancelled: { label: 'ملغي',          color: '#ef4444', bg: '#fee2e2' },
};

const SIDEBAR_SECTIONS = [
  { title: '', items: [{ id: 'dashboard', label: 'لوحة التحكم', icon: '🏠' }] },
  { title: 'الطلبات', items: [
    { id: 'orders', label: 'الطلبات', icon: '🛒' },
    { id: 'returns', label: 'المرتجعات', icon: '↩' },
    { id: 'reviews', label: 'التعليقات', icon: '💬' },
  ]},
  { title: 'المنتجات', items: [
    { id: 'products', label: 'المنتجات', icon: '📦' },
    { id: 'categories', label: 'الأقسام', icon: '◫' },
    { id: 'brands', label: 'البراندز', icon: '🏷️' },
    { id: 'stock', label: 'المخزون', icon: '🗄️' },
  ]},
  { title: 'التسويق', items: [
    { id: 'offers', label: 'العروض', icon: '🎯' },
    { id: 'coupons', label: 'الكوبونات', icon: '🎟️' },
    { id: 'banners', label: 'البنرات', icon: '🖼️' },
    { id: 'notifications', label: 'الإشعارات', icon: '🔔' },
  ]},
  { title: 'التقارير', items: [
    { id: 'sales', label: 'المبيعات', icon: '📊' },
    { id: 'customers', label: 'العملاء', icon: '👥' },
  ]},
  { title: '', items: [
    { id: 'settings', label: 'الإعدادات', icon: '⚙️' },
  ]},
];

const BRANDS = ['جهينة','Nestlé','Pepsi','Coca-Cola',"Lay's",'دومتي','Nestlé','أرز الخيمي'];
const BRAND_COLORS = ['#e8f5e9','#fce4ec','#e3f2fd','#ffebee','#fff8e1','#f3e5f5','#e8f5e9','#fff3e0'];

const MOCK_OFFERS = [
  { t: '50% على جميع المشروبات', type: 'خصم على فئة', d: '50%', s: '20 مايو', e: '27 مايو', a: true },
  { t: 'خصم 15% على منتجات جهينة', type: 'خصم على براند', d: '15%', s: '18 مايو', e: '25 مايو', a: true },
  { t: 'اشتري 2 واحصل على 1 مجاناً', type: 'عرض خاص', d: '33%', s: '22 مايو', e: '29 مايو', a: true },
  { t: 'خصم 10% على أول طلب', type: 'كوبون', d: '10%', s: '1 مايو', e: '31 مايو', a: false },
];

function MiniChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const w = 80; const h = 32;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SalesChart({ orders }: { orders: Order[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const total = orders.filter(o => new Date(o.createdAt).toDateString() === d.toDateString()).reduce((s, o) => s + o.total, 0);
    return { label: d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }), total };
  });
  const max = Math.max(...days.map(d => d.total), 1);
  const W = 460; const H = 160; const P = 32;
  const pts = days.map((d, i) => `${P + (i / 6) * (W - P * 2)},${H - P - (d.total / max) * (H - P * 2)}`).join(' ');
  const fill = `${P},${H - P} ` + pts + ` ${W - P},${H - P}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E91E8C" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#E91E8C" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
        <line key={i} x1={P} y1={H - P - f * (H - P * 2)} x2={W - P} y2={H - P - f * (H - P * 2)} stroke="#f5f5f5" strokeWidth="1" />
      ))}
      <polygon points={fill} fill="url(#sg)" />
      <polyline points={pts} fill="none" stroke="#E91E8C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {days.map((d, i) => {
        const x = P + (i / 6) * (W - P * 2);
        const y = H - P - (d.total / max) * (H - P * 2);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={4} fill="#E91E8C" />
            <text x={x} y={H - 8} textAnchor="middle" fontSize="10" fill="#aaa">{d.label}</text>
            {d.total > 0 && <text x={x} y={y - 10} textAnchor="middle" fontSize="10" fill="#E91E8C" fontWeight="700">{d.total}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [newBanner, setNewBanner] = useState({ title: '', image: '', order: 1 });
  const [editBanner, setEditBanner] = useState<Banner | null>(null);
  const [newCat, setNewCat] = useState({ name: '', icon: '' });
  const prevCount = useRef(0);

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const login = () => { if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwErr(false); } else setPwErr(true); };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [o, p, b, c] = await Promise.all([
        fetch(`${API}/api/orders?limit=100`).then(r => r.json()),
        fetch(`${API}/api/products?limit=200`).then(r => r.json()),
        fetch(`${API}/api/banners?all=true`).then(r => r.json()),
        fetch(`${API}/api/categories`).then(r => r.json()),
      ]);
      const newOrders: Order[] = o.orders || [];
      if (prevCount.current > 0 && newOrders.length > prevCount.current) notify(`🔔 ${newOrders.length - prevCount.current} طلب جديد!`);
      prevCount.current = newOrders.length;
      setOrders(newOrders);
      setProducts(Array.isArray(p) ? p : p.products || []);
      setBanners(b.banners || []);
      setCategories(Array.isArray(c) ? c : []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    if (!authed) return;
    fetchAll();
    const t = setInterval(fetchAll, 30000);
    return () => clearInterval(t);
  }, [authed]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`${API}/api/orders/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setOrders(prev => prev.map(o => o._id === id ? { ...o, status } : o));
    setSelectedOrder(prev => prev && prev._id === id ? { ...prev, status } : prev);
    notify('✅ تم تحديث الحالة');
  };

  const saveProduct = async () => {
    if (!editProduct.name || !editProduct.price) return alert('اكتب الاسم والسعر');
    const method = isEditMode ? 'PUT' : 'POST';
    const url = isEditMode ? `${API}/api/products/${editProduct._id}` : `${API}/api/products`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editProduct) });
    setShowProductForm(false); setEditProduct({}); setIsEditMode(false);
    fetchAll(); notify(isEditMode ? '✅ تم تعديل المنتج' : '✅ تم إضافة المنتج');
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('حذف المنتج؟')) return;
    await fetch(`${API}/api/products/${id}`, { method: 'DELETE' });
    setProducts(prev => prev.filter(x => x._id !== id));
    notify('🗑️ تم حذف المنتج');
  };

  const addBanner = async () => {
    if (!newBanner.title) return;
    await fetch(`${API}/api/banners`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newBanner, isActive: true }) });
    setNewBanner({ title: '', image: '', order: 1 }); fetchAll(); notify('✅ تم إضافة البنر');
  };

  const deleteBanner = async (id: string) => {
    if (!confirm('حذف البنر؟')) return;
    await fetch(`${API}/api/banners/${id}`, { method: 'DELETE' });
    fetchAll(); notify('🗑️ تم حذف البنر');
  };

  const toggleBanner = async (b: Banner) => {
    await fetch(`${API}/api/banners/${b._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !b.isActive }) });
    fetchAll();
  };

  const saveBanner = async () => {
    if (!editBanner) return;
    await fetch(`${API}/api/banners/${editBanner._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editBanner) });
    setEditBanner(null); fetchAll(); notify('✅ تم تعديل البنر');
  };

  const addCategory = async () => {
    if (!newCat.name) return;
    await fetch(`${API}/api/categories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCat) });
    setNewCat({ name: '', icon: '' }); fetchAll(); notify('✅ تم إضافة القسم');
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('حذف القسم؟')) return;
    await fetch(`${API}/api/categories/${id}`, { method: 'DELETE' });
    fetchAll(); notify('🗑️ تم حذف القسم');
  };

  const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'placed').length;
  const todayRev = orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString()).reduce((s, o) => s + o.total, 0);
  const totalRev = orders.reduce((s, o) => s + o.total, 0);
  const filteredProducts = products.filter(p => p.name?.toLowerCase().includes(searchQ.toLowerCase()));
  const topProducts = [...products].sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0)).slice(0, 5);
  const allNavItems = SIDEBAR_SECTIONS.flatMap(s => s.items);

  // ── LOGIN ──
  if (!authed) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#fce8f5,#fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Tajawal,sans-serif', direction: 'rtl' }}>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ width: 420, background: '#fff', borderRadius: 24, padding: 48, boxShadow: '0 20px 60px rgba(233,30,140,.12)', border: '1px solid #fce8f5' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg,#E91E8C,#ff6bb5)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 34, fontWeight: 900, color: '#fff', boxShadow: '0 8px 24px rgba(233,30,140,.3)' }}>ز</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1a1a1a', marginBottom: 6 }}>زورا أدمن</h1>
          <p style={{ fontSize: 13, color: '#aaa' }}>لوحة التحكم الإدارية</p>
        </div>
        <input type="password" placeholder="كلمة المرور" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()}
          style={{ width: '100%', border: `1.5px solid ${pwErr ? '#ef4444' : '#f0e0ee'}`, borderRadius: 12, padding: '13px 18px', fontSize: 15, color: '#1a1a1a', outline: 'none', textAlign: 'right', marginBottom: 12, fontFamily: 'Tajawal', boxSizing: 'border-box', background: '#fafafa' }} />
        {pwErr && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>كلمة المرور غلط</p>}
        <button onClick={login} style={{ width: '100%', background: 'linear-gradient(135deg,#E91E8C,#c91678)', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'Tajawal' }}>دخول</button>
      </div>
    </div>
  );

  const css = `
    *{box-sizing:border-box;margin:0;padding:0}
    input,select,textarea,button{font-family:'Tajawal',sans-serif}
    ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#eee;border-radius:4px}
    .nav-item{display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;color:#888;transition:all .15s}
    .nav-item:hover{background:#fce8f5;color:#E91E8C}
    .nav-item.active{background:#fce8f5;color:#E91E8C;font-weight:700}
    .card{background:#fff;border-radius:14px;border:1px solid #f0f0f0}
    .btn-pink{background:#E91E8C;color:#fff;border:none;border-radius:9px;padding:9px 18px;font-size:13px;font-weight:700;cursor:pointer}
    .btn-pink:hover{background:#c91678}
    .btn-ghost{background:#f5f5f5;color:#555;border:none;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer}
    .btn-ghost:hover{background:#eee}
    .btn-red{background:#fff0f0;color:#ef4444;border:none;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:600;cursor:pointer}
    .inp{width:100%;background:#f8f8f8;border:1px solid #eee;border-radius:9px;padding:10px 13px;font-size:13px;color:#1a1a1a;outline:none;text-align:right}
    .inp:focus{border-color:#E91E8C;background:#fff}
    .badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
    .trow{display:grid;align-items:center;padding:11px 16px;border-bottom:1px solid #f8f8f8;font-size:13px;cursor:pointer;transition:background .1s}
    .trow:hover{background:#fafafa}
    .trow:last-child{border-bottom:none}
    .toggle{width:36px;height:20px;border-radius:10px;cursor:pointer;position:relative;border:none;flex-shrink:0;transition:background .2s}
    .toggle-dot{position:absolute;top:3px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left .2s}
  `;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Tajawal,sans-serif', direction: 'rtl', background: '#f7f8fa' }}>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet" />
      <style>{css}</style>

      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', color: '#fff', padding: '11px 24px', borderRadius: 24, fontSize: 13, fontWeight: 700, zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,.2)', whiteSpace: 'nowrap' }}>{toast}</div>
      )}

      {/* SIDEBAR */}
      <div style={{ width: 220, background: '#fff', borderLeft: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #f5f5f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg,#E91E8C,#ff6bb5)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 900 }}>ز</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#E91E8C' }}>زورا</div>
              <div style={{ fontSize: 10, color: '#bbb' }}>لوحة التحكم</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '10px' }}>
          {SIDEBAR_SECTIONS.map((sec, si) => (
            <div key={si} style={{ marginBottom: 6 }}>
              {sec.title && <div style={{ fontSize: 10, fontWeight: 700, color: '#ccc', padding: '8px 14px 4px', letterSpacing: 1 }}>{sec.title}</div>}
              {sec.items.map(item => (
                <div key={item.id} className={`nav-item${page === item.id ? ' active' : ''}`} onClick={() => setPage(item.id)}>
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  {item.label}
                  {item.id === 'orders' && pendingCount > 0 && (
                    <span style={{ marginRight: 'auto', background: '#E91E8C', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900 }}>{pendingCount}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ padding: '12px 10px', borderTop: '1px solid #f5f5f5' }}>
          <div className="nav-item" style={{ color: '#ef4444' }} onClick={() => setAuthed(false)}>
            <span>⎋</span> تسجيل الخروج
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* TOPBAR */}
        <div style={{ background: '#fff', padding: '14px 28px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#E91E8C,#ff6bb5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 900 }}>أ</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>أحمد محمد</div>
              <div style={{ fontSize: 11, color: '#aaa' }}>مدير المتجر</div>
            </div>
          </div>
          <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a' }}>
            {page === 'dashboard' ? 'مرحباً بك، أحمد 👋' : allNavItems.find(i => i.id === page)?.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={fetchAll} style={{ background: 'none', border: '1px solid #eee', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 13, color: '#888', fontFamily: 'Tajawal' }}>{loading ? '...' : '↺'}</button>
            <div style={{ position: 'relative' }}>
              <button style={{ background: 'none', border: '1px solid #eee', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 16 }}>🔔</button>
              {pendingCount > 0 && <span style={{ position: 'absolute', top: -4, left: -4, background: '#E91E8C', color: '#fff', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900 }}>{pendingCount}</span>}
            </div>
            <button style={{ background: 'none', border: '1px solid #eee', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 16 }}>⚙️</button>
          </div>
        </div>

        <div style={{ padding: 24 }}>

          {/* ═══ DASHBOARD ═══ */}
          {page === 'dashboard' && (
            <div>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'إجمالي المنتجات', val: products.length || 1254, sub: `${products.length} منتج`, data: [40,55,45,60,52,68,75] },
                  { label: 'المبيعات', val: totalRev > 0 ? `${totalRev.toLocaleString()} ج` : '128,560 ر.س', sub: '+18% من الأسبوع الماضي', data: [80,95,75,110,90,120,130] },
                  { label: 'العملاء الجدد', val: 632, sub: '+15% من الأسبوع الماضي', data: [50,65,55,80,70,85,90] },
                  { label: 'متوسط قيمة الطلب', val: orders.length > 0 ? `${Math.round(totalRev / orders.length)} ج` : '88.2 ر.س', sub: '+8% من الأسبوع الماضي', data: [70,75,72,80,78,85,88] },
                  { label: 'الطلبات', val: orders.length || 1458, sub: '+23% من الأسبوع الماضي', data: [60,80,70,95,85,100,110] },
                ].map((s, i) => (
                  <div key={i} className="card" style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <span style={{ fontSize: 10, color: '#aaa', fontWeight: 600 }}>{s.label}</span>
                      <MiniChart data={s.data} color="#E91E8C" />
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a', marginBottom: 4 }}>{s.val}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Row 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 260px', gap: 14, marginBottom: 20 }}>
                {/* Recent orders */}
                <div className="card">
                  <div style={{ padding: '13px 16px', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>الطلبات الأخيرة</span>
                    <button className="btn-ghost" onClick={() => setPage('orders')}>عرض الكل</button>
                  </div>
                  {(orders.length > 0 ? orders : [
                    { _id: '1', name: 'سارة محمد', phone: '', total: 128.50, status: 'delivered', createdAt: '', items: [], address: '', paymentMethod: '' },
                    { _id: '2', name: 'محمد علي', phone: '', total: 89.00, status: 'onway', createdAt: '', items: [], address: '', paymentMethod: '' },
                    { _id: '3', name: 'أحمد سالم', phone: '', total: 45.30, status: 'preparing', createdAt: '', items: [], address: '', paymentMethod: '' },
                    { _id: '4', name: 'نورة خالد', phone: '', total: 78.90, status: 'cancelled', createdAt: '', items: [], address: '', paymentMethod: '' },
                    { _id: '5', name: 'فاطمة حسن', phone: '', total: 98.50, status: 'delivered', createdAt: '', items: [], address: '', paymentMethod: '' },
                  ] as Order[]).slice(0, 5).map((o, i, arr) => {
                    const st = STATUS[o.status] || STATUS.pending;
                    return (
                      <div key={o._id} style={{ padding: '10px 14px', borderBottom: i < arr.length - 1 ? '1px solid #f8f8f8' : 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => { setSelectedOrder(o); setPage('orders'); }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fce8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#E91E8C', flexShrink: 0 }}>{(o.name || '؟')[0]}</div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</div>
                          <div style={{ fontSize: 11, color: '#aaa' }}>{o.total} ج</div>
                        </div>
                        <span className="badge" style={{ background: st.bg, color: st.color, fontSize: 10 }}>{st.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Chart */}
                <div className="card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>المبيعات</div>
                      <div style={{ fontSize: 11, color: '#aaa' }}>آخر 7 أيام</div>
                    </div>
                  </div>
                  <SalesChart orders={orders} />
                </div>

                {/* Donut */}
                <div className="card" style={{ padding: '16px 18px' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 14 }}>توزيع الطلبات</div>
                  <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 14px' }}>
                    <svg width={120} height={120} viewBox="0 0 120 120">
                      <circle cx={60} cy={60} r={46} fill="none" stroke="#fce8f5" strokeWidth={16} />
                      <circle cx={60} cy={60} r={46} fill="none" stroke="#E91E8C" strokeWidth={16} strokeDasharray={`${2 * Math.PI * 46 * 0.22} ${2 * Math.PI * 46 * 0.78}`} strokeDashoffset={2 * Math.PI * 46 * 0.25} />
                      <circle cx={60} cy={60} r={46} fill="none" stroke="#10b981" strokeWidth={16} strokeDasharray={`${2 * Math.PI * 46 * 0.42} ${2 * Math.PI * 46 * 0.58}`} strokeDashoffset={-2 * Math.PI * 46 * -0.03} />
                      <circle cx={60} cy={60} r={46} fill="none" stroke="#3b82f6" strokeWidth={16} strokeDasharray={`${2 * Math.PI * 46 * 0.31} ${2 * Math.PI * 46 * 0.69}`} strokeDashoffset={-2 * Math.PI * 46 * 0.39} />
                    </svg>
                  </div>
                  {[
                    { l: 'قيد التجهيز', v: orders.filter(o => o.status === 'preparing').length || 321, c: '#E91E8C' },
                    { l: 'قيد التوصيل', v: orders.filter(o => o.status === 'onway').length || 620, c: '#10b981' },
                    { l: 'تم التوصيل', v: orders.filter(o => o.status === 'delivered').length || 450, c: '#3b82f6' },
                    { l: 'ملغي', v: orders.filter(o => o.status === 'cancelled').length || 68, c: '#f0f0f0' },
                  ].map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.c, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: '#555' }}>{d.l}</span>
                      <span style={{ color: '#aaa' }}>{d.v}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 14, background: 'linear-gradient(135deg,#E91E8C,#c91678)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', marginBottom: 3 }}>إجمالي الإيرادات</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{totalRev > 0 ? totalRev.toLocaleString() : '128,560'} ج</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>+18% من الأسبوع الماضي</div>
                  </div>
                </div>
              </div>

              {/* Row 3 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                {/* Top products */}
                <div className="card">
                  <div style={{ padding: '13px 16px', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>الأكثر شيوعاً</span>
                    <button className="btn-ghost">عرض الكل</button>
                  </div>
                  {(topProducts.length > 0 ? topProducts : products.slice(0, 5)).map((p, i, arr) => (
                    <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < arr.length - 1 ? '1px solid #f8f8f8' : 'none' }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: '#E91E8C', width: 20 }}>{i + 1}</span>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f8f8f8', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {p.image ? <img src={p.image} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <span style={{ fontSize: 18 }}>🛍️</span>}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: '#aaa' }}>{p.unit} • {p.sales_count || 0} مبيعة</div>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#E91E8C', flexShrink: 0 }}>{p.price} ج</span>
                    </div>
                  ))}
                  {products.length === 0 && (
                    <div style={{ padding: 24, textAlign: 'center', color: '#ccc', fontSize: 13 }}>لا توجد بيانات بعد</div>
                  )}
                </div>

                {/* Brands */}
                <div className="card">
                  <div style={{ padding: '13px 16px', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>البراندز</span>
                    <button className="btn-ghost">عرض الكل</button>
                  </div>
                  <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                    {BRANDS.map((b, i) => (
                      <div key={i} style={{ background: BRAND_COLORS[i], borderRadius: 12, padding: '14px 8px', textAlign: 'center', cursor: 'pointer' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>{b}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 4 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 200px', gap: 14 }}>
                {/* Banners table */}
                <div className="card">
                  <div style={{ padding: '13px 16px', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>البنرات</span>
                    <button className="btn-pink" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setPage('banners')}>+ إضافة بنر جديد</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 80px 70px 40px', gap: 6, padding: '8px 14px', background: '#f9f9f9', fontSize: 11, color: '#aaa', fontWeight: 700 }}>
                    <span>البنر</span><span>الحالة</span><span>تاريخ البداية</span><span>الإجراءات</span><span></span>
                  </div>
                  {(banners.length > 0 ? banners.slice(0, 4) : [
                    { _id: '1', title: 'عرض خصومات حتى 50%', isActive: true, order: 1, image: '' },
                    { _id: '2', title: 'منتجات جهينة - جودة كل يوم', isActive: true, order: 2, image: '' },
                    { _id: '3', title: 'توصيل سريع خلال 60 دقيقة', isActive: true, order: 3, image: '' },
                    { _id: '4', title: 'أول طلبين توصيل مجاني', isActive: false, order: 4, image: '' },
                  ] as Banner[]).map(b => (
                    <div key={b._id} style={{ display: 'grid', gridTemplateColumns: '1fr 50px 80px 70px 40px', gap: 6, padding: '10px 14px', borderTop: '1px solid #f5f5f5', alignItems: 'center', fontSize: 12 }}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                      <span className="badge" style={{ background: b.isActive ? '#d1fae5' : '#f5f5f5', color: b.isActive ? '#10b981' : '#aaa', fontSize: 10 }}>{b.isActive ? 'نشط' : 'موقوف'}</span>
                      <span style={{ color: '#aaa', fontSize: 11 }}>—</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }}>✏️</button>
                        <button className="btn-red" style={{ padding: '3px 8px', fontSize: 11 }}>🗑️</button>
                      </div>
                      <button className="toggle" onClick={() => banners.length > 0 ? toggleBanner(b) : undefined} style={{ background: b.isActive ? '#E91E8C' : '#e0e0e0' }}>
                        <div className="toggle-dot" style={{ left: b.isActive ? '18px' : '3px' }} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Offers table */}
                <div className="card">
                  <div style={{ padding: '13px 16px', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>العروض الحالية</span>
                    <button className="btn-pink" style={{ padding: '6px 14px', fontSize: 12 }}>+ إضافة عرض جديد</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 55px 40px 55px 55px 45px', gap: 5, padding: '8px 14px', background: '#f9f9f9', fontSize: 11, color: '#aaa', fontWeight: 700 }}>
                    <span>العرض</span><span>نوع العرض</span><span>الخصم</span><span>تاريخ البداية</span><span>تاريخ النهاية</span><span>الحالة</span>
                  </div>
                  {MOCK_OFFERS.map((o, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 55px 40px 55px 55px 45px', gap: 5, padding: '10px 14px', borderTop: '1px solid #f5f5f5', alignItems: 'center', fontSize: 11 }}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.t}</div>
                      <span style={{ color: '#666', fontSize: 10 }}>{o.type}</span>
                      <span style={{ fontWeight: 800, color: '#E91E8C' }}>{o.d}</span>
                      <span style={{ color: '#aaa', fontSize: 10 }}>{o.s}</span>
                      <span style={{ color: '#aaa', fontSize: 10 }}>{o.e}</span>
                      <span className="badge" style={{ background: o.a ? '#d1fae5' : '#f5f5f5', color: o.a ? '#10b981' : '#aaa', fontSize: 10 }}>{o.a ? 'نشط' : 'منتهي'}</span>
                    </div>
                  ))}
                </div>

                {/* Customers */}
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 14 }}>نظرة عامة على العملاء</div>
                  <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 14px' }}>
                    <svg width={110} height={110} viewBox="0 0 110 110">
                      <circle cx={55} cy={55} r={42} fill="none" stroke="#fce8f5" strokeWidth={14} />
                      <circle cx={55} cy={55} r={42} fill="none" stroke="#E91E8C" strokeWidth={14} strokeDasharray={`${2 * Math.PI * 42 * 0.45} ${2 * Math.PI * 42 * 0.55}`} strokeDashoffset={2 * Math.PI * 42 * 0.25} strokeLinecap="round" />
                      <circle cx={55} cy={55} r={42} fill="none" stroke="#10b981" strokeWidth={14} strokeDasharray={`${2 * Math.PI * 42 * 0.35} ${2 * Math.PI * 42 * 0.65}`} strokeDashoffset={-2 * Math.PI * 42 * 0.2} strokeLinecap="round" />
                      <text x={55} y={51} textAnchor="middle" fontSize="14" fontWeight="900" fill="#1a1a1a">12,856</text>
                      <text x={55} y={65} textAnchor="middle" fontSize="9" fill="#aaa">إجمالي العملاء</text>
                    </svg>
                  </div>
                  {[
                    { l: 'عملاء جدد', p: '35%', c: '#E91E8C' },
                    { l: 'عملاء مكررون', p: '45%', c: '#10b981' },
                    { l: 'عملاء غير نشطين', p: '20%', c: '#e0e0e0' },
                  ].map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.c, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: '#555' }}>{c.l}</span>
                      <span style={{ fontWeight: 700 }}>{c.p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ ORDERS ═══ */}
          {page === 'orders' && (
            <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1fr 300px' : '1fr', gap: 16 }}>
              <div className="card">
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(STATUS).map(([k, v]) => (
                    <span key={k} className="badge" style={{ background: v.bg, color: v.color, cursor: 'pointer', padding: '5px 12px', fontSize: 12 }}>
                      {v.label} ({orders.filter(o => o.status === k).length})
                    </span>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px 90px 80px', gap: 8, padding: '9px 16px', background: '#f9f9f9', fontSize: 12, color: '#aaa', fontWeight: 700 }}>
                  <span>العميل</span><span>الإجمالي</span><span>المنتجات</span><span>الحالة</span><span>التاريخ</span>
                </div>
                {orders.map(o => {
                  const st = STATUS[o.status] || STATUS.pending;
                  return (
                    <div key={o._id} className="trow" style={{ gridTemplateColumns: '1fr 80px 60px 90px 80px', background: selectedOrder?._id === o._id ? '#fce8f5' : undefined }} onClick={() => setSelectedOrder(selectedOrder?._id === o._id ? null : o)}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{o.name || o.customer?.name}</div>
                        <div style={{ fontSize: 11, color: '#aaa' }}>{o.phone || o.customer?.phone}</div>
                      </div>
                      <span style={{ fontWeight: 800, color: '#E91E8C' }}>{o.total} ج</span>
                      <span style={{ color: '#888' }}>{o.items?.length}</span>
                      <span className="badge" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      <span style={{ color: '#aaa', fontSize: 11 }}>{new Date(o.createdAt).toLocaleDateString('ar-EG')}</span>
                    </div>
                  );
                })}
                {orders.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#ccc' }}>لا توجد طلبات</div>}
              </div>

              {selectedOrder && (
                <div className="card" style={{ height: 'fit-content', position: 'sticky', top: 80 }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 800 }}>تفاصيل الطلب</span>
                    <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#aaa' }}>×</button>
                  </div>
                  <div style={{ padding: 18 }}>
                    <div style={{ fontSize: 11, color: '#aaa', marginBottom: 14 }}>#{selectedOrder._id.slice(-8).toUpperCase()}</div>
                    {[
                      { l: 'الاسم', v: selectedOrder.name || selectedOrder.customer?.name },
                      { l: 'الهاتف', v: selectedOrder.phone || selectedOrder.customer?.phone },
                      { l: 'العنوان', v: typeof selectedOrder.address === 'string' ? selectedOrder.address : `${selectedOrder.address?.area || ''} - ${selectedOrder.address?.street || ''}` },
                      { l: 'الدفع', v: selectedOrder.paymentMethod === 'cash' ? 'كاش عند الاستلام' : selectedOrder.paymentMethod },
                    ].map(r => (
                      <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                        <span style={{ color: '#aaa' }}>{r.l}</span>
                        <span style={{ fontWeight: 600, maxWidth: 160, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.v}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid #f5f5f5', margin: '12px 0', paddingTop: 12 }}>
                      {selectedOrder.items?.map((item: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                          <span style={{ color: '#555', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name} × {item.quantity}</span>
                          <span style={{ fontWeight: 700, flexShrink: 0, marginRight: 8 }}>{item.total || item.price * item.quantity} ج</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 15, borderTop: '1px solid #f5f5f5', paddingTop: 12, marginBottom: 16 }}>
                      <span>الإجمالي</span>
                      <span style={{ color: '#E91E8C' }}>{selectedOrder.total} ج</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>تغيير الحالة</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[
                        { id: 'placed', l: 'جديد' },
                        { id: 'preparing', l: 'جاري التحضير' },
                        { id: 'onway', l: 'في الطريق' },
                        { id: 'delivered', l: 'تم التوصيل' },
                        { id: 'cancelled', l: 'إلغاء' },
                      ].map(s => {
                        const st = STATUS[s.id];
                        const isActive = selectedOrder.status === s.id;
                        return (
                          <button key={s.id} onClick={() => updateStatus(selectedOrder._id, s.id)}
                            style={{ padding: '9px 14px', borderRadius: 8, border: `1.5px solid ${isActive ? st.color : '#eee'}`, background: isActive ? st.bg : '#fff', color: isActive ? st.color : '#555', fontSize: 13, fontWeight: isActive ? 700 : 500, cursor: 'pointer', textAlign: 'right', fontFamily: 'Tajawal' }}>
                            {s.l}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ PRODUCTS ═══ */}
          {page === 'products' && (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <input className="inp" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="ابحث عن منتج..." style={{ flex: 1 }} />
                <button className="btn-pink" onClick={() => { setEditProduct({}); setIsEditMode(false); setShowProductForm(true); window.scrollTo(0, 0); }}>+ إضافة منتج</button>
              </div>
              {showProductForm && (
                <div className="card" style={{ padding: 22, marginBottom: 16, border: '2px solid #E91E8C' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>{isEditMode ? 'تعديل المنتج' : 'إضافة منتج جديد'}</span>
                    <button className="btn-ghost" onClick={() => { setShowProductForm(false); setEditProduct({}); }}>إلغاء ×</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    {[
                      { k: 'name', l: 'الاسم *', ph: 'اسم المنتج', t: 'text' },
                      { k: 'price', l: 'السعر *', ph: '0', t: 'number' },
                      { k: 'old_price', l: 'السعر القديم', ph: '0', t: 'number' },
                      { k: 'discount', l: 'الخصم %', ph: '0', t: 'number' },
                      { k: 'category', l: 'القسم', ph: 'بقالة', t: 'text' },
                      { k: 'unit', l: 'الوحدة', ph: '1 لتر', t: 'text' },
                      { k: 'image', l: 'رابط الصورة', ph: 'https://...', t: 'text' },
                    ].map(f => (
                      <div key={f.k}>
                        <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 5 }}>{f.l}</label>
                        <input className="inp" type={f.t} placeholder={f.ph} value={(editProduct as Record<string, any>)[f.k] || ''}
                          onChange={e => setEditProduct(prev => ({ ...prev, [f.k]: f.t === 'number' ? +e.target.value : e.target.value }))} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 5 }}>الوصف</label>
                    <textarea className="inp" rows={3} placeholder="وصف المنتج..." value={editProduct.description || ''}
                      onChange={e => setEditProduct(prev => ({ ...prev, description: e.target.value }))} style={{ resize: 'none' }} />
                  </div>
                  <button className="btn-pink" onClick={saveProduct}>{isEditMode ? 'حفظ التعديلات' : 'إضافة المنتج'}</button>
                </div>
              )}
              <div className="card">
                <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 90px 80px 70px 100px', gap: 8, padding: '9px 16px', background: '#f9f9f9', fontSize: 12, color: '#aaa', fontWeight: 700 }}>
                  <span>صورة</span><span>المنتج</span><span>القسم</span><span>السعر</span><span>خصم</span><span>إجراءات</span>
                </div>
                {filteredProducts.slice(0, 60).map(p => (
                  <div key={p._id} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 90px 80px 70px 100px', gap: 8, padding: '10px 16px', borderTop: '1px solid #f5f5f5', alignItems: 'center', fontSize: 13 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f5f5f5', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.image ? <img src={p.image} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <span style={{ fontSize: 18 }}>🛍️</span>}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: '#aaa' }}>{p.unit}</div>
                    </div>
                    <span style={{ color: '#666', fontSize: 12 }}>{p.category}</span>
                    <span style={{ fontWeight: 800, color: '#E91E8C' }}>{p.price} ج</span>
                    <span style={{ color: p.discount ? '#10b981' : '#ddd' }}>{p.discount ? `-${p.discount}%` : '-'}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => { setEditProduct(p); setIsEditMode(true); setShowProductForm(true); window.scrollTo(0, 0); }}>تعديل</button>
                      <button className="btn-red" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => deleteProduct(p._id)}>حذف</button>
                    </div>
                  </div>
                ))}
                {filteredProducts.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#ccc' }}>لا توجد منتجات</div>}
              </div>
            </div>
          )}

          {/* ═══ BANNERS ═══ */}
          {page === 'banners' && (
            <div>
              <div className="card" style={{ padding: 20, marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>إضافة بنر جديد</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px auto', gap: 10, alignItems: 'end' }}>
                  {[{ k: 'title', l: 'العنوان', ph: 'عنوان البنر', t: 'text' }, { k: 'image', l: 'رابط الصورة', ph: 'https://...', t: 'text' }, { k: 'order', l: 'الترتيب', ph: '1', t: 'number' }].map(f => (
                    <div key={f.k}>
                      <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 5 }}>{f.l}</label>
                      <input className="inp" type={f.t} placeholder={f.ph} value={(newBanner as Record<string, any>)[f.k]}
                        onChange={e => setNewBanner(prev => ({ ...prev, [f.k]: f.t === 'number' ? +e.target.value : e.target.value }))} />
                    </div>
                  ))}
                  <button className="btn-pink" onClick={addBanner} style={{ height: 42 }}>+ إضافة</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {banners.map(b => (
                  <div key={b._id} className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 100, height: 56, borderRadius: 8, overflow: 'hidden', background: '#f5f5f5', flexShrink: 0 }}>
                      {b.image && <img src={b.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      {editBanner?._id === b._id ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input className="inp" value={editBanner.title} onChange={e => setEditBanner({ ...editBanner, title: e.target.value })} style={{ flex: 1 }} />
                          <input className="inp" value={editBanner.image} onChange={e => setEditBanner({ ...editBanner, image: e.target.value })} style={{ flex: 2 }} />
                        </div>
                      ) : (
                        <><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{b.title || 'بدون عنوان'}</div><div style={{ fontSize: 11, color: '#aaa' }}>ترتيب: {b.order}</div></>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button className="toggle" onClick={() => toggleBanner(b)} style={{ background: b.isActive ? '#E91E8C' : '#e0e0e0' }}>
                        <div className="toggle-dot" style={{ left: b.isActive ? '18px' : '3px' }} />
                      </button>
                      <span style={{ fontSize: 12, color: b.isActive ? '#E91E8C' : '#aaa', fontWeight: 600, width: 38 }}>{b.isActive ? 'نشط' : 'موقوف'}</span>
                      {editBanner?._id === b._id
                        ? <button className="btn-pink" style={{ padding: '7px 14px', fontSize: 12 }} onClick={saveBanner}>حفظ</button>
                        : <button className="btn-ghost" onClick={() => setEditBanner(b)}>تعديل</button>}
                      <button className="btn-red" onClick={() => deleteBanner(b._id)}>حذف</button>
                    </div>
                  </div>
                ))}
                {banners.length === 0 && <div className="card" style={{ padding: 40, textAlign: 'center', color: '#ccc' }}>لا توجد بنرات</div>}
              </div>
            </div>
          )}

          {/* ═══ CATEGORIES ═══ */}
          {page === 'categories' && (
            <div>
              <div className="card" style={{ padding: 20, marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>إضافة قسم جديد</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'end' }}>
                  {[{ k: 'name', l: 'اسم القسم', ph: 'بقالة' }, { k: 'icon', l: 'أيقونة', ph: '🛒' }].map(f => (
                    <div key={f.k} style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 5 }}>{f.l}</label>
                      <input className="inp" placeholder={f.ph} value={(newCat as Record<string, string>)[f.k]}
                        onChange={e => setNewCat(prev => ({ ...prev, [f.k]: e.target.value }))} />
                    </div>
                  ))}
                  <button className="btn-pink" onClick={addCategory} style={{ height: 42 }}>+ إضافة</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {categories.map(c => (
                  <div key={c._id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 26 }}>{c.icon || '📂'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: '#aaa' }}>{products.filter(p => p.category === c.name).length} منتج</div>
                    </div>
                    <button className="btn-red" onClick={() => deleteCategory(c._id)}>حذف</button>
                  </div>
                ))}
                {categories.length === 0 && <div className="card" style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: '#ccc' }}>لا توجد أقسام</div>}
              </div>
            </div>
          )}

          {/* Placeholder */}
          {!['dashboard','orders','products','banners','categories'].includes(page) && (
            <div className="card" style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>{allNavItems.find(i => i.id === page)?.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', marginBottom: 8 }}>{allNavItems.find(i => i.id === page)?.label}</div>
              <div style={{ fontSize: 13, color: '#aaa' }}>هذه الصفحة قيد التطوير</div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
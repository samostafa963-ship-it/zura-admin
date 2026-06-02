'use client';
import { useState, useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://zura-web-production-42ca.up.railway.app';
const ADMIN_PASSWORD = 'zura2025';

interface Order { _id: string; name: string; phone: string; address: any; total: number; subtotal: number; status: string; createdAt: string; items: any[]; paymentMethod: string; customer?: any; }
interface Product { _id: string; name: string; price: number; old_price?: number; image: string; category: string; sub_category?: string; unit?: string; description?: string; discount?: number; sales_count?: number; }
interface Banner { _id: string; title: string; image: string; isActive: boolean; order: number; }
interface Category { _id: string; name: string; icon?: string; }

const STATUS: any = {
  placed:    { label: 'جديد',          color: '#E91E8C', bg: '#fce8f5' },
  pending:   { label: 'معلق',          color: '#f59e0b', bg: '#fef3c7' },
  preparing: { label: 'جاري التحضير', color: '#8b5cf6', bg: '#ede9fe' },
  onway:     { label: 'في الطريق',     color: '#3b82f6', bg: '#dbeafe' },
  delivered: { label: 'تم التوصيل',    color: '#10b981', bg: '#d1fae5' },
  cancelled: { label: 'ملغي',          color: '#ef4444', bg: '#fee2e2' },
};

const NAV = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: '⌂' },
  { id: 'orders',    label: 'الطلبات',     icon: '◈' },
  { id: 'products',  label: 'المنتجات',    icon: '◉' },
  { id: 'banners',   label: 'البنرات',     icon: '◧' },
  { id: 'categories',label: 'الأقسام',     icon: '◫' },
];

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

  const login = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwErr(false); }
    else setPwErr(true);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [o, p, b, c] = await Promise.all([
        fetch(`${API}/api/orders?limit=100`).then(r => r.json()),
        fetch(`${API}/api/products?limit=200`).then(r => r.json()),
        fetch(`${API}/api/banners?all=true`).then(r => r.json()),
        fetch(`${API}/api/categories`).then(r => r.json()),
      ]);
      const newOrders = o.orders || [];
      if (prevCount.current > 0 && newOrders.length > prevCount.current) {
        notify(`🔔 ${newOrders.length - prevCount.current} طلب جديد!`);
      }
      prevCount.current = newOrders.length;
      setOrders(newOrders);
      setProducts(Array.isArray(p) ? p : p.products || []);
      setBanners(b.banners || []);
      setCategories(Array.isArray(c) ? c : []);
    } catch {}
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
    setOrders(p => p.map(o => o._id === id ? { ...o, status } : o));
    if (selectedOrder?._id === id) setSelectedOrder(p => p ? { ...p, status } : null);
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
    setProducts(p => p.filter(x => x._id !== id));
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

  // ─── LOGIN ───
  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Tajawal', sans-serif", direction: 'rtl' }}>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <div style={{ width: 400, padding: '48px', background: '#1a1a1a', borderRadius: 24, border: '1px solid #2a2a2a' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg, #E91E8C, #ff6bb5)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32, fontWeight: 900, color: '#fff' }}>ز</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 6 }}>زورا أدمن</h1>
          <p style={{ fontSize: 13, color: '#555' }}>لوحة التحكم الإدارية</p>
        </div>
        <input type="password" placeholder="كلمة المرور" value={pw}
          onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()}
          style={{ width: '100%', background: '#111', border: `1px solid ${pwErr ? '#ef4444' : '#333'}`, borderRadius: 12, padding: '14px 18px', fontSize: 15, color: '#fff', outline: 'none', textAlign: 'right', marginBottom: 12, fontFamily: 'Tajawal' }} />
        {pwErr && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>كلمة المرور غلط</p>}
        <button onClick={login} style={{ width: '100%', background: 'linear-gradient(135deg, #E91E8C, #c91678)', color: '#fff', border: 'none', borderRadius: 12, padding: 15, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'Tajawal' }}>
          دخول
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Tajawal', sans-serif", direction: 'rtl', background: '#f4f5f7' }}>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
        input, select, textarea, button { font-family: 'Tajawal', sans-serif; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 11px 18px; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 500; color: #888; transition: all .2s; margin-bottom: 2px; }
        .nav-item:hover { background: #f0f0f0; color: #1a1a1a; }
        .nav-item.active { background: #fce8f5; color: #E91E8C; font-weight: 700; }
        .stat-card { background: #fff; border-radius: 16px; padding: 20px 22px; border: 1px solid #eee; }
        .btn-primary { background: #E91E8C; color: #fff; border: none; border-radius: 10px; padding: 10px 20px; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: background .2s; }
        .btn-primary:hover { background: #c91678; }
        .btn-ghost { background: #f5f5f5; color: #555; border: none; border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .2s; }
        .btn-ghost:hover { background: #eee; }
        .btn-danger { background: #fff0f0; color: #ef4444; border: none; border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .input { width: 100%; background: #f8f8f8; border: 1px solid #eee; border-radius: 10px; padding: 10px 14px; font-size: 14px; color: #1a1a1a; outline: none; text-align: right; transition: border .2s; }
        .input:focus { border-color: #E91E8C; background: #fff; }
        .table-row { display: grid; padding: 12px 16px; border-bottom: 1px solid #f5f5f5; align-items: center; cursor: pointer; transition: background .15s; font-size: 13px; }
        .table-row:hover { background: #fafafa; }
        .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
        .card { background: #fff; border-radius: 16px; border: 1px solid #eee; overflow: hidden; }
        .toggle { width: 42px; height: 24px; border-radius: 12px; border: none; cursor: pointer; position: relative; transition: background .2s; flex-shrink: 0; }
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .section-title { font-size: 17px; font-weight: 800; color: #1a1a1a; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', color: '#fff', padding: '12px 24px', borderRadius: 24, fontSize: 14, fontWeight: 700, zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,.2)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      {/* SIDEBAR */}
      <div style={{ width: 230, background: '#fff', borderLeft: '1px solid #eee', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', padding: '20px 12px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#E91E8C,#ff6bb5)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 900 }}>ز</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a' }}>زورا</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>لوحة التحكم</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1 }}>
          {NAV.map(n => (
            <div key={n.id} className={`nav-item${page === n.id ? ' active' : ''}`} onClick={() => setPage(n.id)}>
              <span style={{ fontSize: 16 }}>{n.icon}</span>
              {n.label}
              {n.id === 'orders' && pendingCount > 0 && (
                <span style={{ marginRight: 'auto', background: '#E91E8C', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>{pendingCount}</span>
              )}
            </div>
          ))}
        </nav>

        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 12 }}>
          <button onClick={fetchAll} className="btn-ghost" style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}>
            {loading ? '...' : '↺ تحديث'}
          </button>
          <div className="nav-item" onClick={() => setAuthed(false)} style={{ color: '#ef4444' }}>
            <span>⎋</span> تسجيل الخروج
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Topbar */}
        <div style={{ background: '#fff', padding: '16px 28px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ display: 'flex', gap: 20, fontSize: 12, color: '#aaa' }}>
            <span>📦 {orders.length} طلب</span>
            <span>🛒 {products.length} منتج</span>
            <span>🖼️ {banners.length} بنر</span>
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a' }}>{NAV.find(n => n.id === page)?.label}</h1>
        </div>

        <div style={{ padding: 24 }}>

          {/* ═══ DASHBOARD ═══ */}
          {page === 'dashboard' && (
            <div>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
                {[
                  { label: 'إجمالي الطلبات', val: orders.length, icon: '📦', sub: `${pendingCount} جديد`, subColor: '#E91E8C' },
                  { label: 'إجمالي الإيرادات', val: `${totalRev.toLocaleString()} ج`, icon: '💰', sub: `${todayRev} ج اليوم`, subColor: '#10b981' },
                  { label: 'المنتجات', val: products.length, icon: '🛒', sub: `${banners.length} بنر نشط`, subColor: '#8b5cf6' },
                  { label: 'الأقسام', val: categories.length, icon: '📂', sub: `${products.filter(p=>p.sales_count&&p.sales_count>0).length} منتج مباع`, subColor: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <span style={{ fontSize: 28 }}>{s.icon}</span>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: '#1a1a1a', marginBottom: 4 }}>{s.val}</div>
                    <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: s.subColor }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14 }}>
                {/* Latest orders */}
                <div className="card">
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>آخر الطلبات</span>
                    <button className="btn-ghost" onClick={() => setPage('orders')}>عرض الكل</button>
                  </div>
                  <div style={{ padding: '0 4px' }}>
                    {orders.slice(0, 8).map(o => {
                      const st = STATUS[o.status] || STATUS.pending;
                      return (
                        <div key={o._id} className="table-row" style={{ gridTemplateColumns: '1fr 80px 80px 90px', gap: 8 }} onClick={() => { setSelectedOrder(o); setPage('orders'); }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{o.name || o.customer?.name}</div>
                            <div style={{ fontSize: 11, color: '#aaa' }}>{o.phone || o.customer?.phone}</div>
                          </div>
                          <span style={{ fontSize: 13, color: '#aaa' }}>{o.items?.length} منتج</span>
                          <span style={{ fontSize: 14, fontWeight: 800, color: '#E91E8C' }}>{o.total} ج</span>
                          <span className="badge" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top products */}
                <div className="card">
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #f5f5f5' }}>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>الأكثر مبيعاً</span>
                  </div>
                  <div style={{ padding: 16 }}>
                    {[...products].sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0)).slice(0, 5).map((p, i) => (
                      <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#E91E8C', width: 20 }}>{i + 1}</span>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f5f5f5', overflow: 'hidden', flexShrink: 0 }}>
                          {p.image && <img src={p.image} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { (e.target as any).style.display = 'none'; }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: '#aaa' }}>{p.sales_count || 0} مبيعة</div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#E91E8C' }}>{p.price} ج</span>
                      </div>
                    ))}
                    {products.length === 0 && <div style={{ textAlign: 'center', padding: 20, color: '#ccc', fontSize: 13 }}>لا توجد بيانات</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ ORDERS ═══ */}
          {page === 'orders' && (
            <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1fr 320px' : '1fr', gap: 16 }}>
              <div className="card">
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #f5f5f5', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(STATUS).map(([k, v]: any) => (
                    <span key={k} className="badge" style={{ background: v.bg, color: v.color, cursor: 'pointer', padding: '5px 12px', fontSize: 12 }}>
                      {v.label} ({orders.filter(o => o.status === k).length})
                    </span>
                  ))}
                </div>
                <div style={{ padding: '8px 12px 0', background: '#f9f9f9', display: 'grid', gridTemplateColumns: '1fr 80px 60px 90px 80px', gap: 8, fontSize: 12, color: '#aaa', fontWeight: 700 }}>
                  <span>العميل</span><span>الإجمالي</span><span>المنتجات</span><span>الحالة</span><span>التاريخ</span>
                </div>
                {orders.map(o => {
                  const st = STATUS[o.status] || STATUS.pending;
                  return (
                    <div key={o._id} className="table-row" style={{ gridTemplateColumns: '1fr 80px 60px 90px 80px', gap: 8, background: selectedOrder?._id === o._id ? '#fce8f5' : '' }}
                      onClick={() => setSelectedOrder(selectedOrder?._id === o._id ? null : o)}>
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
                    <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#aaa', lineHeight: 1 }}>×</button>
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
                      <span>الإجمالي</span><span style={{ color: '#E91E8C' }}>{selectedOrder.total} ج</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#1a1a1a' }}>تغيير الحالة</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[
                        { id: 'placed', label: 'جديد' },
                        { id: 'preparing', label: 'جاري التحضير' },
                        { id: 'onway', label: 'في الطريق' },
                        { id: 'delivered', label: 'تم التوصيل' },
                        { id: 'cancelled', label: 'إلغاء' },
                      ].map(s => {
                        const st = STATUS[s.id];
                        const isActive = selectedOrder.status === s.id;
                        return (
                          <button key={s.id} onClick={() => updateStatus(selectedOrder._id, s.id)}
                            style={{ padding: '9px 14px', borderRadius: 8, border: `1.5px solid ${isActive ? st.color : '#eee'}`, background: isActive ? st.bg : '#fff', color: isActive ? st.color : '#555', fontSize: 13, fontWeight: isActive ? 700 : 500, cursor: 'pointer', textAlign: 'right' }}>
                            {s.label}
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
                <input className="input" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="ابحث عن منتج..." style={{ flex: 1 }} />
                <button className="btn-primary" onClick={() => { setEditProduct({}); setIsEditMode(false); setShowProductForm(true); window.scrollTo(0, 0); }}>
                  + إضافة منتج
                </button>
              </div>

              {showProductForm && (
                <div className="card" style={{ padding: 24, marginBottom: 16, border: '2px solid #E91E8C' }}>
                  <div className="section-header">
                    <span className="section-title">{isEditMode ? 'تعديل المنتج' : 'إضافة منتج جديد'}</span>
                    <button className="btn-ghost" onClick={() => { setShowProductForm(false); setEditProduct({}); }}>إلغاء ×</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    {[
                      { k: 'name', l: 'الاسم *', ph: 'اسم المنتج' },
                      { k: 'price', l: 'السعر *', ph: '0', t: 'number' },
                      { k: 'old_price', l: 'السعر القديم', ph: '0', t: 'number' },
                      { k: 'discount', l: 'الخصم %', ph: '0', t: 'number' },
                      { k: 'category', l: 'القسم', ph: 'بقالة' },
                      { k: 'sub_category', l: 'القسم الفرعي', ph: 'ألبان' },
                      { k: 'unit', l: 'الوحدة', ph: '1 لتر' },
                      { k: 'image', l: 'رابط الصورة', ph: 'https://...' },
                    ].map(f => (
                      <div key={f.k}>
                        <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 5 }}>{f.l}</label>
                        <input className="input" type={f.t || 'text'} placeholder={f.ph} value={(editProduct as any)[f.k] || ''}
                          onChange={e => setEditProduct(p => ({ ...p, [f.k]: f.t === 'number' ? +e.target.value : e.target.value }))} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 5 }}>الوصف</label>
                    <textarea className="input" rows={3} placeholder="وصف المنتج..." value={editProduct.description || ''}
                      onChange={e => setEditProduct(p => ({ ...p, description: e.target.value }))} style={{ resize: 'none' }} />
                  </div>
                  <button className="btn-primary" onClick={saveProduct}>{isEditMode ? 'حفظ التعديلات' : 'إضافة المنتج'}</button>
                </div>
              )}

              <div className="card">
                <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 90px 80px 70px 100px', gap: 8, padding: '10px 16px', background: '#f9f9f9', fontSize: 12, color: '#aaa', fontWeight: 700 }}>
                  <span>صورة</span><span>المنتج</span><span>القسم</span><span>السعر</span><span>خصم</span><span>إجراءات</span>
                </div>
                {filteredProducts.slice(0, 60).map(p => (
                  <div key={p._id} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 90px 80px 70px 100px', gap: 8, padding: '10px 16px', borderTop: '1px solid #f5f5f5', alignItems: 'center', fontSize: 13 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f5f5f5', overflow: 'hidden' }}>
                      {p.image ? <img src={p.image} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { (e.target as any).style.display = 'none'; }} /> : <span style={{ fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>🛍️</span>}
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
                      <button className="btn-danger" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => deleteProduct(p._id)}>حذف</button>
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
              <div className="card" style={{ padding: 22, marginBottom: 16 }}>
                <div className="section-header"><span className="section-title">إضافة بنر جديد</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px auto', gap: 10, alignItems: 'end' }}>
                  {[{ k: 'title', l: 'العنوان', ph: 'عنوان البنر' }, { k: 'image', l: 'رابط الصورة', ph: 'https://...' }, { k: 'order', l: 'الترتيب', ph: '1', t: 'number' }].map(f => (
                    <div key={f.k}>
                      <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 5 }}>{f.l}</label>
                      <input className="input" type={f.t || 'text'} placeholder={f.ph} value={(newBanner as any)[f.k]}
                        onChange={e => setNewBanner(p => ({ ...p, [f.k]: f.t === 'number' ? +e.target.value : e.target.value }))} />
                    </div>
                  ))}
                  <button className="btn-primary" onClick={addBanner} style={{ height: 42 }}>+ إضافة</button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {banners.map(b => (
                  <div key={b._id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 110, height: 62, borderRadius: 10, overflow: 'hidden', background: '#f5f5f5', flexShrink: 0 }}>
                      {b.image && <img src={b.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as any).style.display = 'none'; }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      {editBanner?._id === b._id ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input className="input" value={editBanner.title} onChange={e => setEditBanner({ ...editBanner, title: e.target.value })} style={{ flex: 1 }} />
                          <input className="input" value={editBanner.image} onChange={e => setEditBanner({ ...editBanner, image: e.target.value })} style={{ flex: 2 }} />
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{b.title || 'بدون عنوان'}</div>
                          <div style={{ fontSize: 11, color: '#aaa' }}>ترتيب: {b.order}</div>
                        </>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button className="toggle" onClick={() => toggleBanner(b)} style={{ background: b.isActive ? '#E91E8C' : '#e0e0e0' }} />
                      <span style={{ fontSize: 12, color: b.isActive ? '#E91E8C' : '#aaa', fontWeight: 600 }}>{b.isActive ? 'نشط' : 'موقوف'}</span>
                      {editBanner?._id === b._id
                        ? <button className="btn-primary" style={{ padding: '7px 14px', fontSize: 12 }} onClick={saveBanner}>حفظ</button>
                        : <button className="btn-ghost" onClick={() => setEditBanner(b)}>تعديل</button>}
                      <button className="btn-danger" onClick={() => deleteBanner(b._id)}>حذف</button>
                    </div>
                  </div>
                ))}
                {banners.length === 0 && <div className="card" style={{ padding: 40, textAlign: 'center', color: '#ccc' }}>لا توجد بنرات — أضف أول بنر</div>}
              </div>
            </div>
          )}

          {/* ═══ CATEGORIES ═══ */}
          {page === 'categories' && (
            <div>
              <div className="card" style={{ padding: 22, marginBottom: 16 }}>
                <div className="section-header"><span className="section-title">إضافة قسم جديد</span></div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'end' }}>
                  {[{ k: 'name', l: 'اسم القسم', ph: 'بقالة' }, { k: 'icon', l: 'أيقونة', ph: '🛒' }].map(f => (
                    <div key={f.k} style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 5 }}>{f.l}</label>
                      <input className="input" placeholder={f.ph} value={(newCat as any)[f.k]}
                        onChange={e => setNewCat(p => ({ ...p, [f.k]: e.target.value }))} />
                    </div>
                  ))}
                  <button className="btn-primary" onClick={addCategory} style={{ height: 42 }}>+ إضافة</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {categories.map(c => (
                  <div key={c._id} className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 28 }}>{c.icon || '📂'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: '#aaa' }}>{products.filter(p => p.category === c.name).length} منتج</div>
                    </div>
                    <button className="btn-danger" onClick={() => deleteCategory(c._id)}>حذف</button>
                  </div>
                ))}
                {categories.length === 0 && <div className="card" style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: '#ccc' }}>لا توجد أقسام</div>}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
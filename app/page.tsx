'use client';
import { useState, useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://zura-web-production-42ca.up.railway.app';
const ADMIN_PASSWORD = 'zura2025';
const kPrimary = '#E91E8C';
const kDark = '#1a1a1a';

interface Banner { _id: string; title: string; image: string; isActive: boolean; order: number; link?: string; }
interface Order { _id: string; name: string; phone: string; address: any; total: number; subtotal: number; deliveryFee: number; status: string; createdAt: string; items: any[]; paymentMethod: string; customer?: any; }
interface Product { _id: string; name: string; price: number; old_price?: number; image: string; category: string; sub_category?: string; unit?: string; description?: string; discount?: number; isActive?: boolean; }
interface Category { _id: string; name: string; icon?: string; order?: number; }

const navItems = [
  { id: 'dashboard', label: 'الرئيسية', icon: '📊' },
  { id: 'orders',    label: 'الطلبات',  icon: '📦' },
  { id: 'products',  label: 'المنتجات', icon: '🛒' },
  { id: 'banners',   label: 'البنرات',  icon: '🖼️' },
  { id: 'categories',label: 'الأقسام',  icon: '📂' },
];

const STATUS_LABELS: any = {
  placed:    { label: 'جديد',         color: '#E91E8C', bg: '#fce8f5' },
  preparing: { label: 'جاري التحضير', color: '#f59e0b', bg: '#fef3c7' },
  onway:     { label: 'في الطريق',    color: '#3b82f6', bg: '#dbeafe' },
  delivered: { label: 'تم التوصيل',   color: '#10b981', bg: '#d1fae5' },
  cancelled: { label: 'ملغي',         color: '#ef4444', bg: '#fee2e2' },
  pending:   { label: 'معلق',         color: '#f59e0b', bg: '#fef3c7' },
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [passError, setPassError] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({});
  const [isEditingProduct, setIsEditingProduct] = useState(false);

  // banner form
  const [newBanner, setNewBanner] = useState({ title: '', image: '', link: '', order: 1 });
  const [editBanner, setEditBanner] = useState<Banner | null>(null);

  // category form
  const [newCat, setNewCat] = useState({ name: '', icon: '' });

  const prevOrderCount = useRef(0);

  const login = () => {
    if (password === ADMIN_PASSWORD) { setAuthed(true); setPassError(false); }
    else setPassError(true);
  };

  useEffect(() => {
    if (!authed) return;
    fetchAll();
    const interval = setInterval(async () => {
      const res = await fetch(`${API}/api/orders?limit=50`);
      const data = await res.json();
      const newOrders = data.orders || [];
      if (prevOrderCount.current > 0 && newOrders.length > prevOrderCount.current) {
        const diff = newOrders.length - prevOrderCount.current;
        setNotification(`🔔 ${diff} طلب جديد وصل!`);
        setTimeout(() => setNotification(''), 5000);
      }
      prevOrderCount.current = newOrders.length;
      setOrders(newOrders);
    }, 15000);
    return () => clearInterval(interval);
  }, [authed]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [o, b, p, c] = await Promise.all([
        fetch(`${API}/api/orders?limit=100`).then(r => r.json()),
        fetch(`${API}/api/banners?all=true`).then(r => r.json()),
        fetch(`${API}/api/products?limit=200`).then(r => r.json()),
        fetch(`${API}/api/categories`).then(r => r.json()),
      ]);
      const newOrders = o.orders || [];
      if (prevOrderCount.current === 0) prevOrderCount.current = newOrders.length;
      setOrders(newOrders);
      setBanners(b.banners || []);
      setProducts(Array.isArray(p) ? p : p.products || []);
      setCategories(Array.isArray(c) ? c : []);
    } catch {}
    setLoading(false);
  };

  const notify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(''), 3000); };

  // ── ORDER ACTIONS ──
  const updateOrderStatus = async (id: string, status: string) => {
    await fetch(`${API}/api/orders/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setOrders(prev => prev.map(o => o._id === id ? { ...o, status } : o));
    if (selectedOrder?._id === id) setSelectedOrder(prev => prev ? { ...prev, status } : null);
    notify('✅ تم تحديث حالة الطلب');
  };

  // ── PRODUCT ACTIONS ──
  const saveProduct = async () => {
    if (!editProduct.name || !editProduct.price) return alert('اكتب الاسم والسعر');
    const method = isEditingProduct ? 'PUT' : 'POST';
    const url = isEditingProduct ? `${API}/api/products/${editProduct._id}` : `${API}/api/products`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editProduct) });
    setShowProductForm(false); setEditProduct({}); setIsEditingProduct(false);
    fetchAll(); notify(isEditingProduct ? '✅ تم تعديل المنتج' : '✅ تم إضافة المنتج');
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('هتحذف المنتج ده؟')) return;
    await fetch(`${API}/api/products/${id}`, { method: 'DELETE' });
    setProducts(prev => prev.filter(p => p._id !== id));
    notify('🗑️ تم حذف المنتج');
  };

  // ── BANNER ACTIONS ──
  const addBanner = async () => {
    if (!newBanner.title) return;
    await fetch(`${API}/api/banners`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newBanner, isActive: true }) });
    setNewBanner({ title: '', image: '', link: '', order: 1 }); fetchAll(); notify('✅ تم إضافة البنر');
  };
  const deleteBanner = async (id: string) => {
    if (!confirm('هتحذف البنر ده؟')) return;
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

  // ── CATEGORY ACTIONS ──
  const addCategory = async () => {
    if (!newCat.name) return;
    await fetch(`${API}/api/categories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCat) });
    setNewCat({ name: '', icon: '' }); fetchAll(); notify('✅ تم إضافة القسم');
  };
  const deleteCategory = async (id: string) => {
    if (!confirm('هتحذف القسم ده؟')) return;
    await fetch(`${API}/api/categories/${id}`, { method: 'DELETE' });
    fetchAll(); notify('🗑️ تم حذف القسم');
  };

  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'placed').length;
  const todayRevenue = orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString()).reduce((s, o) => s + o.total, 0);
  const filteredProducts = products.filter(p => p.name?.toLowerCase().includes(searchQ.toLowerCase()));

  // ── LOGIN ──
  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Tajawal, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ background: '#fff', borderRadius: 20, padding: 48, width: 380, boxShadow: '0 8px 40px rgba(0,0,0,0.08)', direction: 'rtl' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: kPrimary, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 14px', color: '#fff', fontWeight: 900 }}>ز</div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: kDark, marginBottom: 4 }}>لوحة تحكم زورا</h2>
          <p style={{ fontSize: 13, color: '#aaa' }}>ادخل كلمة المرور للمتابعة</p>
        </div>
        <input type="password" placeholder="كلمة المرور" value={password}
          onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()}
          style={{ width: '100%', border: `1.5px solid ${passError ? '#e53935' : '#eee'}`, borderRadius: 10, padding: '12px 16px', fontSize: 15, fontFamily: 'Tajawal', textAlign: 'right', outline: 'none', marginBottom: 8, color: kDark, boxSizing: 'border-box' }} />
        {passError && <p style={{ fontSize: 12, color: '#e53935', marginBottom: 8 }}>كلمة المرور غلط</p>}
        <button onClick={login} style={{ width: '100%', background: kPrimary, color: '#fff', border: 'none', borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'Tajawal' }}>دخول</button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Tajawal, sans-serif', direction: 'rtl', background: '#f7f7f7' }}>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800;900&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; } input, select, textarea { font-family: Tajawal, sans-serif; }`}</style>

      {/* Notification */}
      {notification && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: kDark, color: '#fff', padding: '12px 28px', borderRadius: 24, fontSize: 14, fontWeight: 700, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,.2)' }}>
          {notification}
        </div>
      )}

      {/* SIDEBAR */}
      <div style={{ width: 220, background: kDark, display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #333' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: kPrimary }}>زورا</div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>لوحة التحكم</div>
        </div>
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {navItems.map(item => (
            <div key={item.id} onClick={() => setPage(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', cursor: 'pointer', fontSize: 14, fontWeight: page === item.id ? 800 : 500, color: page === item.id ? '#fff' : '#888', background: page === item.id ? 'rgba(233,30,140,0.15)' : 'transparent', borderRight: page === item.id ? `3px solid ${kPrimary}` : '3px solid transparent', transition: 'all .2s' }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {item.label}
              {item.id === 'orders' && pendingOrders > 0 && (
                <span style={{ marginRight: 'auto', background: kPrimary, color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>{pendingOrders}</span>
              )}
            </div>
          ))}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid #333' }}>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>آخر تحديث: الآن</div>
          <button onClick={fetchAll} style={{ width: '100%', background: 'rgba(255,255,255,.08)', color: '#aaa', border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, cursor: 'pointer', fontFamily: 'Tajawal' }}>🔄 تحديث</button>
        </div>
        <div onClick={() => setAuthed(false)} style={{ padding: '14px 20px', cursor: 'pointer', color: '#e53935', fontSize: 13, borderTop: '1px solid #222', display: 'flex', alignItems: 'center', gap: 8 }}>
          🚪 خروج
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ background: '#fff', padding: '16px 32px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ fontSize: 12, color: '#aaa' }}>{products.length} منتج • {orders.length} طلب • {banners.length} بنر</div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: kDark }}>{navItems.find(n => n.id === page)?.label}</h1>
        </div>

        <div style={{ padding: 28 }}>

          {/* ── DASHBOARD ── */}
          {page === 'dashboard' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
                {[
                  { label: 'إجمالي الطلبات', value: orders.length, icon: '📦', color: '#3B5BDB' },
                  { label: 'طلبات جديدة', value: pendingOrders, icon: '🔔', color: kPrimary },
                  { label: 'إيراد اليوم', value: `${todayRevenue} ج`, icon: '💰', color: '#10b981' },
                  { label: 'المنتجات', value: products.length, icon: '🛒', color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', border: '1px solid #eee' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: kDark, marginBottom: 4 }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: '#aaa' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #eee', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', fontWeight: 900, fontSize: 15 }}>آخر الطلبات</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#f9f9f9' }}>{['الاسم', 'الهاتف', 'الإجمالي', 'الحالة', 'التاريخ'].map(h => <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, color: '#888', fontWeight: 700 }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {orders.slice(0, 10).map(o => {
                      const st = STATUS_LABELS[o.status] || STATUS_LABELS.pending;
                      return (
                        <tr key={o._id} style={{ borderTop: '1px solid #f5f5f5', cursor: 'pointer' }} onClick={() => { setSelectedOrder(o); setPage('orders'); }}>
                          <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700 }}>{o.name || o.customer?.name}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#666' }}>{o.phone || o.customer?.phone}</td>
                          <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 900, color: kPrimary }}>{o.total} ج</td>
                          <td style={{ padding: '12px 16px' }}><span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{st.label}</span></td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: '#aaa' }}>{new Date(o.createdAt).toLocaleDateString('ar-EG')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ORDERS ── */}
          {page === 'orders' && (
            <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1fr 340px' : '1fr', gap: 16 }}>
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #eee', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #eee', display: 'flex', gap: 8 }}>
                  {['الكل', 'placed', 'preparing', 'onway', 'delivered', 'cancelled'].map(s => (
                    <button key={s} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Tajawal', background: '#f5f5f5', color: '#555' }}>
                      {s === 'الكل' ? 'الكل' : STATUS_LABELS[s]?.label}
                    </button>
                  ))}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#f9f9f9' }}>{['الاسم', 'الهاتف', 'المنتجات', 'الإجمالي', 'الحالة', 'التاريخ'].map(h => <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, color: '#888', fontWeight: 700 }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {orders.map(o => {
                      const st = STATUS_LABELS[o.status] || STATUS_LABELS.pending;
                      return (
                        <tr key={o._id} onClick={() => setSelectedOrder(selectedOrder?._id === o._id ? null : o)} style={{ borderTop: '1px solid #f5f5f5', cursor: 'pointer', background: selectedOrder?._id === o._id ? '#fce8f5' : 'transparent' }}>
                          <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700 }}>{o.name || o.customer?.name}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13 }}>{o.phone || o.customer?.phone}</td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: '#888' }}>{o.items?.length} منتج</td>
                          <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 900, color: kPrimary }}>{o.total} ج</td>
                          <td style={{ padding: '12px 16px' }}><span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{st.label}</span></td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: '#aaa' }}>{new Date(o.createdAt).toLocaleDateString('ar-EG')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {orders.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>لا توجد طلبات</div>}
              </div>

              {/* Order detail panel */}
              {selectedOrder && (
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #eee', padding: 20, height: 'fit-content', position: 'sticky', top: 80 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ fontSize: 15, fontWeight: 900 }}>تفاصيل الطلب</span>
                    <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#aaa' }}>✕</button>
                  </div>
                  <div style={{ fontSize: 12, color: '#aaa', marginBottom: 12 }}>#{selectedOrder._id.slice(-8).toUpperCase()}</div>
                  {[
                    { label: 'الاسم', val: selectedOrder.name || selectedOrder.customer?.name },
                    { label: 'الهاتف', val: selectedOrder.phone || selectedOrder.customer?.phone },
                    { label: 'العنوان', val: typeof selectedOrder.address === 'string' ? selectedOrder.address : `${selectedOrder.address?.area} - ${selectedOrder.address?.street}` },
                    { label: 'الدفع', val: selectedOrder.paymentMethod === 'cash' ? 'كاش عند الاستلام' : selectedOrder.paymentMethod },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                      <span style={{ color: '#888' }}>{r.label}</span>
                      <span style={{ fontWeight: 600 }}>{r.val}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid #eee', margin: '14px 0', paddingTop: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>المنتجات:</div>
                    {selectedOrder.items?.map((item: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, color: '#555' }}>
                        <span>{item.name} × {item.quantity}</span>
                        <span style={{ fontWeight: 700 }}>{item.total || item.price * item.quantity} ج</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 15, borderTop: '1px solid #eee', paddingTop: 12, marginBottom: 16 }}>
                    <span>الإجمالي</span>
                    <span style={{ color: kPrimary }}>{selectedOrder.total} ج</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>تغيير الحالة:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { id: 'placed', label: '📋 جديد' },
                      { id: 'preparing', label: '👨‍🍳 جاري التحضير' },
                      { id: 'onway', label: '🛵 في الطريق' },
                      { id: 'delivered', label: '✅ تم التوصيل' },
                      { id: 'cancelled', label: '❌ إلغاء' },
                    ].map(s => (
                      <button key={s.id} onClick={() => updateOrderStatus(selectedOrder._id, s.id)}
                        style={{ padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${selectedOrder.status === s.id ? kPrimary : '#eee'}`, background: selectedOrder.status === s.id ? '#fce8f5' : '#fff', color: selectedOrder.status === s.id ? kPrimary : '#555', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Tajawal', textAlign: 'right' }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PRODUCTS ── */}
          {page === 'products' && (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="ابحث عن منتج..."
                  style={{ flex: 1, border: '1px solid #eee', borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none', textAlign: 'right' }} />
                <button onClick={() => { setEditProduct({}); setIsEditingProduct(false); setShowProductForm(true); }}
                  style={{ background: kPrimary, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Tajawal', whiteSpace: 'nowrap' }}>
                  + إضافة منتج
                </button>
              </div>

              {/* Product Form */}
              {showProductForm && (
                <div style={{ background: '#fff', borderRadius: 14, border: `2px solid ${kPrimary}`, padding: 24, marginBottom: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 16 }}>{isEditingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    {[
                      { k: 'name', label: 'الاسم *', ph: 'اسم المنتج' },
                      { k: 'price', label: 'السعر *', ph: '0', type: 'number' },
                      { k: 'old_price', label: 'السعر القديم', ph: '0', type: 'number' },
                      { k: 'unit', label: 'الوحدة', ph: 'مثال: 1 لتر' },
                      { k: 'category', label: 'القسم', ph: 'مثال: بقالة' },
                      { k: 'sub_category', label: 'القسم الفرعي', ph: 'مثال: ألبان' },
                      { k: 'image', label: 'رابط الصورة', ph: 'https://...' },
                      { k: 'discount', label: 'الخصم %', ph: '0', type: 'number' },
                    ].map(f => (
                      <div key={f.k}>
                        <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>{f.label}</label>
                        <input type={f.type || 'text'} placeholder={f.ph} value={(editProduct as any)[f.k] || ''}
                          onChange={e => setEditProduct(prev => ({ ...prev, [f.k]: f.type === 'number' ? +e.target.value : e.target.value }))}
                          style={{ width: '100%', border: '1px solid #eee', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', textAlign: 'right' }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>الوصف</label>
                    <textarea placeholder="وصف المنتج..." value={editProduct.description || ''} rows={3}
                      onChange={e => setEditProduct(prev => ({ ...prev, description: e.target.value }))}
                      style={{ width: '100%', border: '1px solid #eee', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', resize: 'none', textAlign: 'right' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={saveProduct} style={{ background: kPrimary, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Tajawal' }}>
                      {isEditingProduct ? 'حفظ التعديلات' : 'إضافة'}
                    </button>
                    <button onClick={() => { setShowProductForm(false); setEditProduct({}); }} style={{ background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, cursor: 'pointer', fontFamily: 'Tajawal' }}>إلغاء</button>
                  </div>
                </div>
              )}

              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #eee', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: '#f9f9f9', display: 'grid', gridTemplateColumns: '60px 1fr 80px 80px 80px 100px', gap: 8, fontSize: 12, color: '#888', fontWeight: 700 }}>
                  <span>صورة</span><span>المنتج</span><span>القسم</span><span>السعر</span><span>الخصم</span><span>إجراءات</span>
                </div>
                {filteredProducts.slice(0, 50).map(p => (
                  <div key={p._id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 80px 80px 80px 100px', gap: 8, padding: '10px 16px', borderTop: '1px solid #f5f5f5', alignItems: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f9f9f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.image ? <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <span style={{ fontSize: 20 }}>🛍️</span>}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: '#aaa' }}>{p.unit}</div>
                    </div>
                    <span style={{ fontSize: 12, color: '#666' }}>{p.category}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: kPrimary }}>{p.price} ج</span>
                    <span style={{ fontSize: 12 }}>{p.discount ? `-${p.discount}%` : '-'}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => { setEditProduct(p); setIsEditingProduct(true); setShowProductForm(true); window.scrollTo(0, 0); }}
                        style={{ background: '#f0f9ff', color: '#3b82f6', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'Tajawal' }}>تعديل</button>
                      <button onClick={() => deleteProduct(p._id)}
                        style={{ background: '#fff0f0', color: '#e53935', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'Tajawal' }}>حذف</button>
                    </div>
                  </div>
                ))}
                {filteredProducts.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>لا توجد منتجات</div>}
              </div>
            </div>
          )}

          {/* ── BANNERS ── */}
          {page === 'banners' && (
            <div>
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #eee', padding: 24, marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 900, marginBottom: 16 }}>إضافة بنر جديد</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px auto', gap: 10, alignItems: 'end' }}>
                  {[
                    { k: 'title', label: 'العنوان', ph: 'عنوان البنر' },
                    { k: 'image', label: 'رابط الصورة', ph: 'https://...' },
                    { k: 'order', label: 'الترتيب', ph: '1', type: 'number' },
                  ].map(f => (
                    <div key={f.k}>
                      <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>{f.label}</label>
                      <input type={f.type || 'text'} placeholder={f.ph} value={(newBanner as any)[f.k]}
                        onChange={e => setNewBanner(prev => ({ ...prev, [f.k]: f.type === 'number' ? +e.target.value : e.target.value }))}
                        style={{ width: '100%', border: '1px solid #eee', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', textAlign: 'right' }} />
                    </div>
                  ))}
                  <button onClick={addBanner} style={{ background: kPrimary, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Tajawal', whiteSpace: 'nowrap' }}>+ إضافة</button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {banners.map(b => (
                  <div key={b._id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #eee', padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 120, height: 68, borderRadius: 8, overflow: 'hidden', background: '#f5f5f5', flexShrink: 0 }}>
                      {b.image && <img src={b.image} alt={b.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      {editBanner?._id === b._id ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input value={editBanner.title} onChange={e => setEditBanner({ ...editBanner, title: e.target.value })}
                            style={{ flex: 1, border: '1px solid #eee', borderRadius: 6, padding: '7px 10px', fontSize: 13, textAlign: 'right' }} />
                          <input value={editBanner.image} onChange={e => setEditBanner({ ...editBanner, image: e.target.value })}
                            style={{ flex: 2, border: '1px solid #eee', borderRadius: 6, padding: '7px 10px', fontSize: 13 }} />
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{b.title || 'بدون عنوان'}</div>
                          <div style={{ fontSize: 11, color: '#aaa' }}>ترتيب: {b.order}</div>
                        </>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => toggleBanner(b)} style={{ background: b.isActive ? '#e8f5ee' : '#f5f5f5', color: b.isActive ? '#10b981' : '#aaa', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Tajawal' }}>
                        {b.isActive ? '✓ نشط' : 'موقوف'}
                      </button>
                      {editBanner?._id === b._id
                        ? <button onClick={saveBanner} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Tajawal' }}>حفظ</button>
                        : <button onClick={() => setEditBanner(b)} style={{ background: '#f5f5f5', color: '#555', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Tajawal' }}>تعديل</button>}
                      <button onClick={() => deleteBanner(b._id)} style={{ background: '#fff0f0', color: '#e53935', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Tajawal' }}>حذف</button>
                    </div>
                  </div>
                ))}
                {banners.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#aaa', background: '#fff', borderRadius: 14, border: '1px solid #eee' }}>لا توجد بنرات</div>}
              </div>
            </div>
          )}

          {/* ── CATEGORIES ── */}
          {page === 'categories' && (
            <div>
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #eee', padding: 24, marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 900, marginBottom: 16 }}>إضافة قسم جديد</h3>
                <div style={{ display: 'flex', gap: 10, alignItems: 'end' }}>
                  {[{ k: 'name', label: 'اسم القسم', ph: 'مثال: بقالة' }, { k: 'icon', label: 'الأيقونة (emoji)', ph: '🛒' }].map(f => (
                    <div key={f.k} style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>{f.label}</label>
                      <input placeholder={f.ph} value={(newCat as any)[f.k]}
                        onChange={e => setNewCat(prev => ({ ...prev, [f.k]: e.target.value }))}
                        style={{ width: '100%', border: '1px solid #eee', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', textAlign: 'right' }} />
                    </div>
                  ))}
                  <button onClick={addCategory} style={{ background: kPrimary, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Tajawal' }}>+ إضافة</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {categories.map(c => (
                  <div key={c._id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 28 }}>{c.icon || '📂'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div>
                    </div>
                    <button onClick={() => deleteCategory(c._id)} style={{ background: '#fff0f0', color: '#e53935', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Tajawal' }}>حذف</button>
                  </div>
                ))}
                {categories.length === 0 && <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: '#aaa', background: '#fff', borderRadius: 14, border: '1px solid #eee' }}>لا توجد أقسام</div>}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminShell from '../../components/admin/AdminShell';
import { MEAL_TYPES, errMsg, vnd } from '../../components/admin/products/productUtils';
import { createProduct, getProduct, updateProduct } from '../../api/product.api';
import { listCategories } from '../../api/category.api';

// UC-32.4 Add Product (/admin/products/new) và UC-32.5 Update Product (/admin/products/:id/edit)
const EMPTY = { name: '', sku: '', barcode: '', categoryId: '', mealType: '', unit: 'cái', description: '', price: '', lowStockThreshold: '10', status: 'active', images: [''] };
const UNITS = ['cái', 'gói', 'chai', 'lon', 'hộp', 'ly', 'phần', 'kg'];

const autoSku = (name) => {
    const letters = String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'D').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 3) || 'SP';
    return `${letters}-${String(Date.now()).slice(-5)}`;
};

function validate(f) {
    const e = {};
    if (!f.name.trim()) e.name = 'Product name is required';
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{1,39}$/.test(f.sku.trim())) e.sku = 'SKU: 2–40 characters (letters, digits, - _ .)';
    if (f.barcode.trim() && !/^\d{8,14}$/.test(f.barcode.trim())) e.barcode = 'Barcode must be 8–14 digits';
    if (!f.categoryId) e.categoryId = 'Choose a category';
    if (!f.mealType) e.mealType = 'Choose a meal group';
    if (f.price === '' || !Number.isInteger(Number(f.price))) e.price = 'Enter a price in VND';
    else if (Number(f.price) > 100000000) e.price = 'Price is too large';
    if (f.lowStockThreshold === '' || !Number.isInteger(Number(f.lowStockThreshold)) || Number(f.lowStockThreshold) < 0) e.lowStockThreshold = 'Enter a whole number ≥ 0';
    const bad = f.images.find((u) => u.trim() && !/^https?:\/\/\S+$/i.test(u.trim()));
    if (bad) e.images = 'Image links must start with http:// or https://';
    return e;
}

export default function AdminProductFormPage() {
    const { id } = useParams();
    const editing = Boolean(id);
    const navigate = useNavigate();
    const [form, setForm] = useState(EMPTY);
    const [initial, setInitial] = useState(EMPTY);
    const [categories, setCategories] = useState([]);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState(false);
    const [loading, setLoading] = useState(editing);
    const [saving, setSaving] = useState(false);
    const [serverError, setServerError] = useState('');
    const [stock, setStock] = useState(null);

    useEffect(() => { listCategories().then((r) => setCategories(r.data || [])).catch(() => setServerError('Unable to load categories.')); }, []);
    useEffect(() => {
        if (!editing) return;
        getProduct(id).then(({ data }) => {
            const f = {
                name: data.name, sku: data.sku, barcode: data.barcode || '', categoryId: data.categoryId?._id || data.categoryId || '', mealType: data.mealType,
                unit: data.unit || 'cái', description: data.description || '', price: String(data.price), lowStockThreshold: String(data.lowStockThreshold ?? 10),
                status: data.status, images: data.images?.length ? data.images : [''],
            };
            setForm(f); setInitial(f); setStock(data.stockQuantity);
        }).catch((err) => setServerError(errMsg(err, 'Product not found.'))).finally(() => setLoading(false));
    }, [editing, id]);

    const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);
    const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); if (touched) setErrors((e) => ({ ...e, [k]: undefined })); };
    const setImage = (i, v) => set('images', form.images.map((u, idx) => (idx === i ? v : u)));
    const price = Number(form.price) || 0;

    const discard = () => { if (!dirty || window.confirm('Discard your changes?')) navigate(editing ? `/admin/products/${id}` : '/admin/products'); };

    const submit = async (ev) => {
        ev?.preventDefault();
        setTouched(true); setServerError('');
        const errs = validate(form); setErrors(errs);
        if (Object.keys(errs).length) return;
        const body = {
            name: form.name.trim(), sku: form.sku.trim(), barcode: form.barcode.trim(), categoryId: form.categoryId, mealType: form.mealType,
            unit: form.unit.trim() || 'cái', description: form.description.trim(), price: Number(form.price), lowStockThreshold: Number(form.lowStockThreshold),
            status: form.status, images: form.images.map((u) => u.trim()).filter(Boolean),
        };
        setSaving(true);
        try {
            const { data } = editing ? await updateProduct(id, body) : await createProduct(body);
            navigate(`/admin/products/${data._id}`, { state: { flash: editing ? 'Product updated.' : 'Product created.' } });
        } catch (err) {
            const fields = err.response?.data?.fields || [];
            if (err.response?.status === 409 && fields.length) setErrors((e) => ({ ...e, ...Object.fromEntries(fields.map((k) => [k, err.response.data.message])) }));
            else setServerError(errMsg(err, 'Unable to save the product.'));
        } finally { setSaving(false); }
    };

    const field = (key, label, input, { required, extra } = {}) => (
        <label className={`ap-field${errors[key] ? ' bad' : ''}`}>
            <span><span>{label}{required && <em> *</em>}</span>{extra}</span>
            {input}
            {errors[key] && <small className="err">{errors[key]}</small>}
        </label>
    );

    if (loading) return <AdminShell crumbs={['Products', 'Edit']}><p className="ap-empty-note">Loading product…</p></AdminShell>;
    if (editing && serverError && !form.name) return <AdminShell crumbs={['Products', 'Edit']}><p className="ap-alert error">{serverError}</p></AdminShell>;

    return (
        <AdminShell crumbs={['Products', editing ? 'Edit Product' : 'Add Product']}>
            <form className="ap-page" onSubmit={submit} noValidate>
                <div className="ap-head">
                    <div>
                        <h1>{editing ? 'Edit Product' : 'Add New Product'}</h1>
                        <p>{editing ? 'Update catalog details, pricing and selling status.' : 'Create a catalog item, set its price and decide whether it is visible to customers.'}</p>
                    </div>
                    <div className="ap-actions">
                        <button type="button" className="ap-btn ghost" onClick={discard}><span className="review-material-icon">close</span>Discard</button>
                        <button type="submit" className="ap-btn primary" disabled={saving}><span className="review-material-icon">check_circle</span>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Product'}</button>
                    </div>
                </div>
                {serverError && <p className="ap-alert error" role="alert">{serverError}</p>}

                <div className="ap-layout">
                    <div className="ap-col">
                        <section className="ap-card">
                            <div className="ap-card-head"><h2><span className="review-material-icon">inventory_2</span>Basic Product Details</h2><small>* Required</small></div>
                            {field('name', 'Product name', <input maxLength={120} placeholder="e.g. Coca-Cola Original 330ml Can" value={form.name} onChange={(e) => set('name', e.target.value)} />, { required: true, extra: <span className="ap-counter">{form.name.length} / 120</span> })}
                            <div className="ap-grid2">
                                {field('sku', 'SKU code', <input className="ap-mono" placeholder="BEV-CC-330" value={form.sku} onChange={(e) => set('sku', e.target.value.toUpperCase())} />, {
                                    required: true, extra: <button type="button" className="ap-link-btn" onClick={() => set('sku', autoSku(form.name))}><span className="review-material-icon">auto_fix_high</span>Auto-generate</button>
                                })}
                                {field('barcode', 'Barcode / EAN', <input className="ap-mono" inputMode="numeric" placeholder="8934567100293" value={form.barcode} onChange={(e) => set('barcode', e.target.value.replace(/\D/g, ''))} />)}
                            </div>
                            <div className="ap-grid2">
                                {field('categoryId', 'Category', <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}><option value="">Select category…</option>{categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select>, { required: true })}
                                {field('mealType', 'Meal group', <select value={form.mealType} onChange={(e) => set('mealType', e.target.value)}><option value="">Select group…</option>{MEAL_TYPES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select>, { required: true })}
                            </div>
                            <p className="ap-hint" style={{ margin: '-6px 0 0' }}>Meal group drives the budget-based basket suggestions (main / light / snack / beverage).</p>
                            {field('description', 'Description & storage', <textarea maxLength={2000} placeholder="Pack size, storage, ingredients, allergens, shelf life…" value={form.description} onChange={(e) => set('description', e.target.value)} />, { extra: <span className="ap-counter">{form.description.length} / 2000</span> })}
                        </section>

                        <section className="ap-card">
                            <div className="ap-card-head"><h2><span className="review-material-icon">payments</span>Pricing & Unit</h2></div>
                            <div className="ap-grid2">
                                {field('price', 'Retail price (VND)', <div className="ap-input-affix"><i>₫</i><input inputMode="numeric" placeholder="12,000" value={form.price === '' ? '' : Number(form.price).toLocaleString('en-US')} onChange={(e) => set('price', e.target.value.replace(/[^\d]/g, ''))} /></div>, { required: true })}
                                <label className="ap-field"><span>Unit of measure</span>
                                    <input list="ap-units" value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="cái, gói, chai…" maxLength={30} />
                                    <datalist id="ap-units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
                                </label>
                            </div>
                            {editing && price > 0 && Number(initial.price) !== price && <p className="ap-note"><span className="review-material-icon">info</span>Price changes from {vnd(initial.price)} to {vnd(price)} and will be recorded in the price history.</p>}
                            {field('lowStockThreshold', 'Low-stock alert level', <div className="ap-input-affix"><input inputMode="numeric" value={form.lowStockThreshold} onChange={(e) => set('lowStockThreshold', e.target.value.replace(/\D/g, ''))} /><i>units</i></div>)}
                            <p className="ap-note"><span className="review-material-icon">warehouse</span>
                                {editing ? `Current stock: ${stock ?? 0} units. ` : 'New products start with 0 stock. '}Stock is added by receiving batches in Inventory, not edited here.</p>
                        </section>
                    </div>

                    <div className="ap-col">
                        <section className="ap-card">
                            <div className="ap-card-head"><h2><span className="review-material-icon">add_photo_alternate</span>Product Imagery</h2><small>Up to 8 links</small></div>
                            {form.images.map((url, i) => (
                                <div className="ap-img-row" key={i}>
                                    <span className="ap-thumb">{url.trim() && /^https?:\/\//i.test(url) ? <img src={url} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <span className="review-material-icon">image</span>}</span>
                                    <input placeholder="https://… image URL" value={url} onChange={(e) => setImage(i, e.target.value)} />
                                    {i === 0 && url.trim() && <span className="ap-main-tag">MAIN</span>}
                                    {form.images.length > 1 && <button type="button" className="ap-icon-btn danger" aria-label="Remove image" onClick={() => set('images', form.images.filter((_, idx) => idx !== i))}><span className="review-material-icon">delete</span></button>}
                                </div>
                            ))}
                            {errors.images && <small className="err" style={{ color: '#ba1a1a' }}>{errors.images}</small>}
                            {form.images.length < 8 && <button type="button" className="ap-btn soft" onClick={() => set('images', [...form.images, ''])}><span className="review-material-icon">add</span>Add image link</button>}
                            <p className="ap-hint">The first image is the main photo. File upload is not available yet; paste a hosted image URL.</p>
                        </section>

                        <section className="ap-card">
                            <div className="ap-card-head"><h2><span className="review-material-icon">toggle_on</span>Catalog Status</h2></div>
                            {[
                                { v: 'active', t: 'Active & visible', d: 'Customers can find this product and add it to their cart.' },
                                { v: 'inactive', t: 'Inactive / hidden', d: 'Hidden from the storefront and carts. The record stays in the catalog.' },
                            ].map((o) => (
                                <label key={o.v} className={`ap-radio-card${form.status === o.v ? ' on' : ''}`}>
                                    <input type="radio" name="status" checked={form.status === o.v} onChange={() => set('status', o.v)} />
                                    <div><b>{o.t}</b><span>{o.d}</span></div>
                                </label>
                            ))}
                        </section>
                    </div>
                </div>
                <div className="ap-formbar">
                    <button type="button" className="ap-btn ghost" onClick={discard}>Discard</button>
                    <button type="submit" className="ap-btn primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Product'}</button>
                </div>
            </form>
        </AdminShell>
    );
}
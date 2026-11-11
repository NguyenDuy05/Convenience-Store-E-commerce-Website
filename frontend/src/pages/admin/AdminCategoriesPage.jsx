import { useState } from 'react';
import { createCategory, deleteCategory, listCategories, updateCategory } from '../../api/category.api';
import { Badge, Confirm, Notice, STATUS_TONE, useAction, useFetch } from '../../components/admin/kit';

// Form thêm / sửa danh mục
function CategoryEditor({ category, busy, error, onSave, onCancel }) {
  const [f, setF] = useState({ name: category?.name || '', description: category?.description || '', imageUrl: category?.imageUrl || '', sortOrder: category?.sortOrder ?? 0, status: category?.status || 'active' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return setErr('Category name is required.');
    if (f.imageUrl.trim() && !/^https?:\/\/\S+$/i.test(f.imageUrl.trim())) return setErr('Image must be an http(s) URL.');
    const n = Number(f.sortOrder);
    if (!Number.isInteger(n) || n < 0 || n > 9999) return setErr('Sort order must be a whole number between 0 and 9999.');
    setErr(''); onSave({ ...f, sortOrder: n });
  };
  return <section className="pm-card" aria-labelledby="cat-edit">
    <h2 id="cat-edit">{category ? 'Update Category' : 'Add Category'}</h2>
    <p>Inactive categories are hidden from the storefront menu.</p>
    <form onSubmit={submit}><fieldset disabled={busy}>
      <div className="pm-form-grid">
        <label>Name<input autoFocus value={f.name} maxLength={80} onChange={set('name')} /></label>
        <label>Status<select value={f.status} onChange={set('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <label>Sort order<input type="number" min="0" max="9999" value={f.sortOrder} onChange={set('sortOrder')} /></label>
        <label>Image URL (optional)<input value={f.imageUrl} onChange={set('imageUrl')} placeholder="https://..." /></label>
        <label className="pm-wide">Description<textarea rows={3} maxLength={500} value={f.description} onChange={set('description')} /></label>
      </div>
      {(err || error) && <p className="pm-error" role="alert">{err || error}</p>}
      <div className="pm-actions"><button className="pm-primary" type="submit">{busy ? 'Saving...' : 'Save category'}</button><button type="button" onClick={onCancel}>Cancel</button></div>
    </fieldset></form>
  </section>;
}

// UC-33 Admin quản lý danh mục
export default function AdminCategoriesPage() {
  const { data, loading, error, reload } = useFetch(listCategories, { all: 1 });
  const act = useAction(reload);
  const [panel, setPanel] = useState(null);
  const open = (type, category) => { act.setError(''); act.setSuccess(''); setPanel({ type, category }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const run = async (op, notice) => { if (await act.run(op, notice)) setPanel(null); };
  const items = data || [];

  return <div className="pm-page">
    <header className="pm-heading"><div><span className="pm-eyebrow">CATALOG</span><h1>Manage Categories</h1><p>Organise products into categories shown on the storefront.</p></div>
      <button className="pm-primary" onClick={() => open('add')}>+ Add Category</button></header>
    <Notice success={act.success} error={!panel ? act.error : ''} />
    {panel?.type === 'add' && <CategoryEditor busy={act.busy} error={act.error} onCancel={() => setPanel(null)} onSave={(f) => run(() => createCategory(f), 'Category created.')} />}
    {panel?.type === 'edit' && <CategoryEditor key={panel.category._id} category={panel.category} busy={act.busy} error={act.error} onCancel={() => setPanel(null)} onSave={(f) => run(() => updateCategory(panel.category._id, f), 'Category updated.')} />}
    {panel?.type === 'delete' && <Confirm title="Delete category?" danger confirmLabel="Delete" busy={act.busy} error={act.error} onCancel={() => setPanel(null)} onConfirm={() => run(() => deleteCategory(panel.category._id), 'Category deleted.')}>
      <p><strong>{panel.category.name}</strong> will be removed permanently. A category that still has products cannot be deleted.</p></Confirm>}

    <section className="pm-card" aria-label="Categories list">
      {loading ? <p role="status">Loading categories...</p> : error ? <p className="pm-error" role="alert">{error}</p> : !items.length ?
        <div className="pm-empty"><h2>No categories yet</h2><p>Add your first category to organise products.</p></div> :
        <div className="pm-table-wrap"><table><thead><tr><th>Category</th><th>Slug</th><th>Order</th><th>Products</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {items.map((c) => <tr key={c._id}>
            <td><strong>{c.name}</strong>{c.description && <p className="pm-description">{c.description}</p>}</td>
            <td>{c.slug}</td><td>{c.sortOrder}</td><td>{c.productCount ?? 0}</td>
            <td><Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge></td>
            <td><div className="pm-row-actions"><button onClick={() => open('edit', c)}>Update</button><button className="pm-delete" onClick={() => open('delete', c)}>Delete</button></div></td>
          </tr>)}
        </tbody></table></div>}
    </section>
  </div>;
}

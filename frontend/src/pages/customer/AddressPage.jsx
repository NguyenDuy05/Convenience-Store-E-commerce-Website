import { useCallback, useEffect, useState } from 'react';
import { MapPin, Phone, Plus, Pencil, Trash2, Star } from 'lucide-react';
import { listAddresses, addAddress, updateAddress, deleteAddress } from '../../api/address.api';
import '../../styles/address.css';

const MAX_ADDRESSES = 10;
const PHONE_RE = /^(\+?84|0)\d{9,10}$/;
const EMPTY = { label: '', receiverName: '', phone: '', addressLine: '', isDefault: false };

const messageOf = (error, fallback) => error.response?.data?.message || fallback;

function validate(form) {
  const errors = {};
  if (!form.receiverName.trim()) errors.receiverName = 'Receiver name is required';
  if (!form.phone.trim()) errors.phone = 'Phone number is required';
  else if (!PHONE_RE.test(form.phone.trim().replace(/[\s.-]/g, ''))) errors.phone = 'Phone number is invalid';
  if (!form.addressLine.trim()) errors.addressLine = 'Address is required';
  return errors;
}

function AddressForm({ initial, busy, onSubmit, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState({});
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(form);
  };

  return (
    <form className="address-form" onSubmit={submit} noValidate>
      <h2>{initial?._id ? 'Edit address' : 'Add address'}</h2>
      <label>Label (optional)
        <input value={form.label} onChange={set('label')} maxLength={50} placeholder="Home, Office..." />
      </label>
      <label>Receiver name *
        <input value={form.receiverName} onChange={set('receiverName')} maxLength={100} aria-invalid={!!errors.receiverName} />
        {errors.receiverName && <span className="address-error">{errors.receiverName}</span>}
      </label>
      <label>Phone number *
        <input value={form.phone} onChange={set('phone')} inputMode="tel" aria-invalid={!!errors.phone} />
        {errors.phone && <span className="address-error">{errors.phone}</span>}
      </label>
      <label>Address *
        <textarea rows={3} value={form.addressLine} onChange={set('addressLine')} maxLength={255} aria-invalid={!!errors.addressLine} />
        {errors.addressLine && <span className="address-error">{errors.addressLine}</span>}
      </label>
      <label className="address-check">
        <input type="checkbox" checked={form.isDefault} onChange={set('isDefault')} disabled={!!initial?.isDefault} />
        Set as default address
      </label>
      <div className="address-actions">
        <button type="submit" className="address-primary" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
        <button type="button" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}

export default function AddressPage() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | address object

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await listAddresses();
      setAddresses(data);
      setError('');
    } catch (err) { setError(messageOf(err, 'Unable to load addresses. Please try again.')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (form) => {
    setBusy(true); setError(''); setNotice('');
    const body = { ...form, isDefault: !!form.isDefault };
    try {
      if (editing?._id) await updateAddress(editing._id, body);
      else await addAddress(body);
      setNotice(editing?._id ? 'Address updated.' : 'Address added.');
      setEditing(null);
      await load();
    } catch (err) { setError(messageOf(err, 'Unable to save the address.')); }
    finally { setBusy(false); }
  };

  const makeDefault = async (address) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await updateAddress(address._id, { ...address, isDefault: true });
      setNotice('Default address changed.');
      await load();
    } catch (err) { setError(messageOf(err, 'Unable to change the default address.')); }
    finally { setBusy(false); }
  };

  const remove = async (address) => {
    if (!window.confirm('Delete this address?')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await deleteAddress(address._id);
      setNotice('Address deleted.');
      await load();
    } catch (err) { setError(messageOf(err, 'Unable to delete the address.')); }
    finally { setBusy(false); }
  };

  return (
    <section className="address-page">
      <header className="address-head">
        <div>
          <h1>My addresses</h1>
          <p>{addresses.length}/{MAX_ADDRESSES} saved addresses</p>
        </div>
        {!editing && (
          <button type="button" className="address-primary" disabled={addresses.length >= MAX_ADDRESSES} onClick={() => { setNotice(''); setEditing('new'); }}>
            <Plus size={16} aria-hidden="true" /> Add address
          </button>
        )}
      </header>

      {error && <p className="address-banner address-banner-error" role="alert">{error}</p>}
      {notice && <p className="address-banner address-banner-ok" role="status">{notice}</p>}

      {editing && (
        <AddressForm
          initial={editing === 'new' ? { isDefault: addresses.length === 0 } : editing}
          busy={busy}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading ? <p>Loading...</p> : addresses.length === 0 && !editing ? (
        <div className="address-empty">
          <MapPin size={32} aria-hidden="true" />
          <p>You haven't saved any address yet.</p>
        </div>
      ) : (
        <ul className="address-list">
          {addresses.map((a) => (
            <li key={a._id} className={`address-card${a.isDefault ? ' is-default' : ''}`}>
              <div className="address-card-top">
                <strong>{a.label || a.receiverName}</strong>
                {a.isDefault && <span className="address-badge"><Star size={12} aria-hidden="true" /> Default</span>}
              </div>
              <p>{a.receiverName}</p>
              <p><Phone size={14} aria-hidden="true" /> {a.phone}</p>
              <p><MapPin size={14} aria-hidden="true" /> {a.addressLine}</p>
              <div className="address-actions">
                <button type="button" onClick={() => { setNotice(''); setEditing(a); }} disabled={busy}><Pencil size={14} aria-hidden="true" /> Edit</button>
                {!a.isDefault && <button type="button" onClick={() => makeDefault(a)} disabled={busy}>Set default</button>}
                <button type="button" className="address-danger" onClick={() => remove(a)} disabled={busy}><Trash2 size={14} aria-hidden="true" /> Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import { useEffect, useState } from 'react';
import api from '../../../api/axios';
import './product-image-picker.css';

// Chọn ảnh sản phẩm từ thư viện ảnh
export default function ProductImagePicker({ value, onChange, disabled }) {
  const [library, setLibrary] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const selected = value.filter(Boolean);
  const reload = () => api.get('/products/image-library').then(r => { setLibrary(r.data.items); setError(''); }).catch(() => setError('Could not load the image folder. Please retry.'));
  useEffect(() => { reload(); }, []);
  const src = url => url.startsWith('/api/') && /^https?:/.test(api.defaults.baseURL || '')
    ? new URL(url, api.defaults.baseURL).href : url;
  const chooseFiles = async files => {
    try {
      const remaining = 8 - selected.length;
      if (files.length > remaining) throw new Error('Select up to 8 images in total.');
      const photos = await Promise.all(Array.from(files).map(file => new Promise((resolve, reject) => {
        if (!/^image\/(png|jpeg|webp|gif)$/i.test(file.type) || file.size > 2 * 1024 * 1024) return reject(new Error('Choose PNG, JPG, WEBP or GIF images up to 2 MB each.'));
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read the selected file.'));
        reader.readAsDataURL(file);
      })));
      onChange([...selected, ...photos]); setError('');
    } catch (err) { setError(err.message); }
  };
  return <div className="product-image-picker">
    <div className="pip-selected">{selected.map((url, index) => <div className="pip-photo" key={url}>
      <img src={src(url)} alt={`Product photo ${index + 1}`} />
      {index === 0 && <small>MAIN</small>}
      <button type="button" disabled={disabled} aria-label={`Remove photo ${index + 1}`} onClick={() => onChange(selected.filter((_, i) => i !== index))}>×</button>
    </div>)}</div>
    <div className="ap-actions">
      <button type="button" className="ap-btn soft" onClick={() => setOpen(!open)}>{open ? 'Close folder' : 'Browse image folder'}</button>
      <label className="ap-btn soft ap-file-pick">Choose files<input type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" disabled={disabled || selected.length >= 8} onChange={e => { chooseFiles(e.target.files); e.target.value = ''; }} /></label>
    </div>
    {error && <p role="alert" className="ap-alert error">{error}<button type="button" className="ap-btn ghost" onClick={reload}>Retry</button></p>}
    {open && <div className="pip-library">
      <label className="ap-field"><span>Search image folder</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search file names" /></label>
      <div className="pip-grid">{library.filter(file => file.name.toLowerCase().includes(query.toLowerCase())).map(file => {
        const active = selected.includes(file.url);
        return <button type="button" key={file.url} title={file.name} aria-pressed={active} disabled={disabled || (!active && selected.length >= 8)} onClick={() => onChange(active ? selected.filter(url => url !== file.url) : [...selected, file.url])}>
          <img src={src(file.url)} alt="" loading="lazy" /><span>{file.name}</span>
        </button>;
      })}</div>
      {!library.length && <p>No photos in the image folder yet.</p>}
    </div>}
    <p className="ap-hint">The first photo is the main image. Select up to 8 photos from the folder or your device. PNG, JPG, WEBP or GIF; up to 2 MB per upload.</p>
  </div>;
}

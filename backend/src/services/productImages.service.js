const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ApiError = require('../utils/ApiError');
const directory = path.resolve(__dirname, '../../..', 'frontend/public/images/products');
const prefix = '/api/products/images/file/';
const supported = /\.(png|jpg|jpeg|webp|gif)$/i;
// Nhận dạng định dạng ảnh từ nội dung file (png, jpg, webp, gif)
function format(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg';
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'webp';
  if (/^GIF8[79]a$/.test(bytes.subarray(0, 6).toString())) return 'gif';
  return null;
}
// Danh sách ảnh trong thư viện ảnh sản phẩm
function list() {
  fs.mkdirSync(directory, { recursive: true });
  return fs.readdirSync(directory, { withFileTypes: true }).filter(e => e.isFile() && supported.test(e.name))
    .map(e => ({ name: e.name, url: prefix + encodeURIComponent(e.name) })).sort((a, b) => a.name.localeCompare(b.name));
}
// Kiểm tra ảnh sản phẩm gửi lên chỉ là ảnh trong thư viện
function clean(images, existing = []) {
  if (!Array.isArray(images) || images.length > 8) throw new ApiError(400, 'Select up to 8 images');
  return images.filter(Boolean).map(value => {
    if (typeof value !== 'string') throw new ApiError(400, 'Invalid image');
    if (value.startsWith(prefix)) {
      let name;
      try { name = decodeURIComponent(value.slice(prefix.length)); }
      catch { throw new ApiError(400, 'Invalid image file name'); }
      if (name === path.basename(name) && !name.includes('\\') && supported.test(name) && fs.existsSync(path.join(directory, name))) return value;
    }
    if (existing.includes(value)) return value;
    const match = value.match(/^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+=*)$/i);
    if (!match) throw new ApiError(400, 'Choose photos from the image library or your device');
    const bytes = Buffer.from(match[2], 'base64');
    const ext = format(bytes);
    if (!ext || bytes.length > 2 * 1024 * 1024) throw new ApiError(400, 'Choose a PNG, JPG, WEBP or GIF image up to 2 MB');
    fs.mkdirSync(directory, { recursive: true });
    const name = crypto.createHash('sha256').update(bytes).digest('hex') + '.' + ext;
    fs.writeFileSync(path.join(directory, name), bytes);
    return prefix + name;
  });
}
module.exports = { directory, list, clean, format };

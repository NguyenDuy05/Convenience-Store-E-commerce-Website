import '../../styles/icon.css';

// <Icon name="receipt_long" size="md" fill />  (tên icon xem tại fonts.google.com/icons)
export default function Icon({ name, size = '', fill = false }) {
    return <span className={`qk-icon ${size} ${fill ? 'fill' : ''}`} aria-hidden="true">{name}</span>;
}

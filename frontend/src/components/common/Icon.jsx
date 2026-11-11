import '../../styles/icon.css';

// Icon Material Symbols dùng chung
export default function Icon({ name, size = '', fill = false }) {
    return <span className={`qk-icon ${size} ${fill ? 'fill' : ''}`} aria-hidden="true">{name}</span>;
}

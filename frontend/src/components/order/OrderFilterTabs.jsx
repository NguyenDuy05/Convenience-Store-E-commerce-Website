import '../../styles/qk-tokens.css';
import '../../styles/order-filter-tabs.css';
import Icon from '../common/Icon';
import { ORDER_TABS } from '../../utils/orderMeta';

// Tab lọc theo trạng thái. counts = { all, preparing, ... } lấy từ API.
export default function OrderFilterTabs({ active, counts, onChange }) {
  return (
    <div className="otabs">
      <div className="otabs-list" role="tablist" aria-label="Lọc đơn hàng theo trạng thái">
        {ORDER_TABS.map((t) => {
          const selected = active === t.key;
          const n = counts ? counts[t.key || 'all'] ?? 0 : null;
          return (
            <button
              key={t.key || 'all'}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`otabs-tab ${selected ? 'active' : ''} ${t.key === 'ready_for_pickup' ? 'ready' : ''}`}
              onClick={() => onChange(t.key)}
            >
              <span>{t.label}</span>
              {n !== null && <span className="otabs-badge">{n}</span>}
            </button>
          );
        })}
      </div>
      <div className="otabs-sort"><Icon name="swap_vert" size="md" /> Mới nhất trước</div>
    </div>
  );
}

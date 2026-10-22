import '../../styles/qk-tokens.css';
import '../../styles/order-timeline.css';
import Icon from '../common/Icon';
import { buildTimeline } from '../../utils/orderTimeline';
import { formatDateTime } from '../../utils/format';

// Timeline dọc các mốc của đơn. Mốc chưa diễn ra hiện mờ; mốc thiếu dữ liệu thời gian ghi rõ thay vì bịa.
export default function OrderTimeline({ order }) {
  const steps = buildTimeline(order);
  if (steps.length === 0) return <p className="otl-empty">Chưa có thông tin các mốc của đơn này.</p>;

  return (
    <ol className="otl" aria-label="Các mốc của đơn hàng">
      {steps.map((s) => (
        <li key={s.key} className={`otl-step ${s.state}`} aria-current={s.state === 'current' ? 'step' : undefined}>
          <span className="otl-mark">
            {s.state === 'done' && <Icon name="check" size="md" />}
            {s.state === 'error' && <Icon name="close" size="md" />}
            {s.state === 'current' && <i />}
          </span>
          <div className="otl-body">
            <strong>{s.title}</strong>
            {s.state !== 'upcoming' && <span className="otl-desc">{s.desc}</span>}
            <span className="otl-time">
              {s.state === 'upcoming'
                ? 'Chưa diễn ra'
                : s.time ? formatDateTime(s.time) : 'Không có dữ liệu thời gian cho mốc này'}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

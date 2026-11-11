import '../../styles/qk-tokens.css';
import '../../styles/order-timeline.css';
import Icon from '../common/Icon';
import { buildTimeline } from '../../utils/orderTimeline';
import { formatDateTime } from '../../utils/format';

// Timeline các mốc của đơn
export default function OrderTimeline({ order }) {
  const steps = buildTimeline(order);
  if (steps.length === 0) return <p className="otl-empty">No timeline information is available for this order.</p>;

  return (
    <ol className="otl" aria-label="Order timeline">
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
                ? "Not yet reached"
                : s.time ? formatDateTime(s.time) : "No timestamp is available for this step"}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

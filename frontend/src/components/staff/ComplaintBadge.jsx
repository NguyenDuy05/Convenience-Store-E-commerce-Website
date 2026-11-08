import '../../styles/qk-tokens.css';
import '../../styles/complaint-badge.css';
import { COMPLAINT_STATUS, COMPLAINT_TYPE } from '../../utils/complaintMeta';

// <ComplaintBadge status="open" /> hoặc <ComplaintBadge type="complaint" />
export default function ComplaintBadge({ status, type }) {
  if (type) return <span className={`cbadge type ${type}`}>{COMPLAINT_TYPE[type] || type}</span>;
  const meta = COMPLAINT_STATUS[status] || { label: status, tone: 'info' };
  return <span className={`cbadge ${meta.tone}`}>{meta.label}</span>;
}

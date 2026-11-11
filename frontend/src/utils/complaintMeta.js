export const COMPLAINT_STATUS = {
  open: { label: 'Open', tone: 'warn' },
  in_progress: { label: 'In progress', tone: 'info' },
  resolved: { label: 'Resolved', tone: 'success' },
};
export const COMPLAINT_TYPE = { complaint: 'Complaint', support: 'Support' };
export const COMPLAINT_TABS = [
  { key: '', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'resolved', label: 'Resolved' },
];
export const STATUS_ACTION = {
  in_progress: { label: 'Start handling', hint: 'Mark this request as in progress' },
  resolved: { label: 'Resolved', hint: 'Close the request; a customer response is required' },
};
export const CUSTOMER_STATUS = { active: 'Active', locked: 'Locked' };

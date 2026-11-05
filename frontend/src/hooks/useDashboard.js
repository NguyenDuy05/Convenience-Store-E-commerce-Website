import { useCallback, useEffect, useState } from 'react';
import { getAdminDashboard, getStaffDashboard } from '../api/dashboard.api';

// Lấy số liệu dashboard thật từ server. kind: 'admin' | 'staff'. params: { range, from, to }.
// Khi đổi khoảng ngày / bấm làm mới vẫn giữ dữ liệu cũ trên màn hình (chỉ bật cờ refreshing).
export default function useDashboard(kind, params) {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [tick, setTick] = useState(0);
    const key = JSON.stringify(params);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        (kind === 'admin' ? getAdminDashboard : getStaffDashboard)(JSON.parse(key))
            .then((res) => { if (alive) { setData(res.data); setError(''); } })
            .catch((err) => { if (alive) setError(err.response?.data?.message || 'Unable to load dashboard data.'); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [kind, key, tick]);

    const refresh = useCallback(() => setTick((t) => t + 1), []);
    return { data, error, loading, refresh };
}
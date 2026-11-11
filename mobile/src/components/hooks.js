import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { errMsg } from '../utils/format';

// Tải dữ liệu: { data, loading, error, reload, refreshing, refresh }. reloadOnFocus: tải lại mỗi khi quay lại màn hình.
export function useLoad(fn, deps = [], { reloadOnFocus = false } = {}) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [refreshing, setRefreshing] = useState(false);
  const seq = useRef(0);
  const run = useCallback(async (silent) => {
    const id = ++seq.current;
    if (!silent) setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const data = await fn();
      if (id === seq.current) setState({ data, loading: false, error: '' });
    } catch (err) {
      if (id === seq.current) setState((s) => ({ data: silent ? s.data : null, loading: false, error: errMsg(err, 'Không tải được dữ liệu.') }));
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  const first = useRef(true);
  useEffect(() => { first.current = true; run(false); }, [run]);
  useFocusEffect(useCallback(() => {
    if (!reloadOnFocus) return;
    if (first.current) { first.current = false; return; }
    run(true);
  }, [reloadOnFocus, run]));
  const refresh = useCallback(async () => { setRefreshing(true); await run(true); setRefreshing(false); }, [run]);
  return { ...state, reload: () => run(false), refresh, refreshing };
}

export function useDebounced(value, ms = 400) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

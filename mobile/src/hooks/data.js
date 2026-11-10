import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { get, post, put, remove } from '../services/api';
import { useSession } from '../context/Session';
import { useToast } from '../context/Toast';

export function useResource(path, params = {}, options = {}) {
  const { user } = useSession();
  const query = useQuery({
    queryKey: [user?.id || 'guest', path, params],
    queryFn: ({ signal }) => get(path, params, signal),
    ...options,
  });
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (options.enabled !== false) refetch();
    }, [refetch, options.enabled]),
  );
  return query;
}
export function usePages(path, params = {}, options = {}) {
  const { user } = useSession();
  const query = useInfiniteQuery({
    queryKey: [user?.id || 'guest', path, params, 'pages'],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      get(path, { limit: 20, ...params, page: pageParam }, signal),
    getNextPageParam: (last, pages) =>
      pages.reduce((n, p) => n + p.items.length, 0) < last.total
        ? Number(last.page) + 1
        : undefined,
    ...options,
  });
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (options.enabled !== false) refetch();
    }, [refetch, options.enabled]),
  );
  return { ...query, items: query.data?.pages.flatMap((page) => page.items) || [] };
}
export function useCart() {
  const { user } = useSession();
  return useResource('/cart', {}, { enabled: !!user });
}
export function useCartAction() {
  const toast = useToast();
  const client = useQueryClient();
  const { user } = useSession();
  return useMutation({
    mutationFn: ({ id, quantity = 1, action = 'add' }) =>
      action === 'remove'
        ? remove(`/cart/items/${id}`)
        : action === 'update'
          ? put(`/cart/items/${id}`, { quantity })
          : post('/cart/items', { productId: id, quantity }),
    onSuccess: (data, variables) => {
      client.setQueryData([user?.id, '/cart', {}], data);
      client.invalidateQueries({ predicate: (q) => q.queryKey.includes('/orders/preview') });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast(
        variables.action === 'remove'
          ? 'Item removed from your bag'
          : variables.action === 'update'
            ? 'Bag updated'
            : 'Added to your bag',
      );
    },
    onError: () => client.invalidateQueries({ predicate: (q) => q.queryKey.includes('/cart') }),
  });
}
export function useRefreshAll() {
  const client = useQueryClient();
  return useCallback(() => client.invalidateQueries(), [client]);
}

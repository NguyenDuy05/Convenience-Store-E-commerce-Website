import { useEffect, useState } from 'react';
import { listProducts } from '../api/product.api';
import { listCategories } from '../api/category.api';
import { listPromotions } from '../api/promotion.api';
import { listStores } from '../api/store.api';
import { listOrders } from '../api/order.api';

// Mock order API nếu chưa có, sau này replace bằng API thật
const mockOrders = {
    data: {
        items: [
            { _id: '1', status: 'completed', total: 150000, createdAt: new Date() },
            { _id: '2', status: 'ready_for_pickup', total: 280000, createdAt: new Date(Date.now() - 3600000) },
            { _id: '3', status: 'preparing', total: 120000, createdAt: new Date(Date.now() - 7200000) },
        ],
    },
};

export default function useDashboardData(refresh = 0) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        setError('');
        Promise.allSettled([
            listProducts({ limit: 100 }),
            listCategories(),
            listPromotions(),
            listStores(),
            listOrders ? listOrders({ limit: 100 }) : Promise.resolve(mockOrders),
        ]).then(([p, c, pr, s, o]) => {
            const result = {
                products: p.status === 'fulfilled' ? p.value.data.items || [] : [],
                categories: c.status === 'fulfilled' ? c.value.data : [],
                promotions: pr.status === 'fulfilled' ? pr.value.data : [],
                stores: s.status === 'fulfilled' ? s.value.data : [],
                orders: o.status === 'fulfilled' ? o.value.data.items || [] : [],
                error: p.status === 'rejected' ? p.reason?.response?.data?.message || 'Error loading products' : '',
            };
            setData(result);
            setError(result.error);
            setLoading(false);
        });
    }, [refresh]);

    return { data, loading, error };
}
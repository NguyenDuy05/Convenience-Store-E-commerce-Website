import PortalShell from '../layout/PortalShell';

export const ADMIN_GROUPS = [
    { title: 'Main', items: [{ to: '/admin', label: 'Dashboard', icon: 'space_dashboard', end: true }] },
    {
        title: 'Management', items: [
            { to: '/admin/customers', label: 'Customers', icon: 'group' },
            { to: '/admin/staff', label: 'Staff', icon: 'badge' },
            { to: '/admin/shifts', label: 'Work Shifts', icon: 'schedule' },
            { to: '/admin/stores', label: 'Stores', icon: 'storefront' },
            { to: '/admin/products', label: 'Products', icon: 'inventory_2' },
            { to: '/admin/categories', label: 'Categories', icon: 'category' },
            { to: '/admin/inventory', label: 'Inventory', icon: 'warehouse' },
        ]
    },
    {
        title: 'Operations', items: [
            { to: '/admin/orders', label: 'Orders', icon: 'shopping_bag' },
            { to: '/admin/transactions', label: 'Transactions', icon: 'receipt_long' },
            { to: '/admin/promotions', label: 'Promotions', icon: 'campaign' },
            { to: '/admin/discount-codes', label: 'Discount Codes', icon: 'sell' },
            { to: '/admin/notifications', label: "Manage notifications", icon: 'campaign' },
            { to: '/admin/inbox', label: "Inbox", icon: 'notifications' },
        ]
    },
    {
        title: 'Customer Programs', items: [
            { to: '/admin/membership', label: 'Membership', icon: 'card_membership' },
            { to: '/admin/reviews', label: 'Reviews', icon: 'star' },
        ]
    },
    { title: 'Finance', items: [{ to: '/admin/payments', label: 'Payments', icon: 'payments' }, { to: '/admin/refunds', label: 'Refunds', icon: 'currency_exchange' }] },
];

// Khung trang admin: menu bên trái theo nhóm chức năng
export default function AdminShell({ crumbs, children }) {
    return <PortalShell tag="ADMIN" roleLabel="Administrator" groups={ADMIN_GROUPS} profilePath="/admin/profile" crumbs={crumbs}>{children}</PortalShell>;
}

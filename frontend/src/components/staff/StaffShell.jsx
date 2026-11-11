import PortalShell from '../layout/PortalShell';

export const STAFF_GROUPS = [
    { title: 'Main', items: [{ to: '/staff', label: 'Dashboard', icon: 'space_dashboard', end: true }] },
    {
        title: 'Sales', items: [
            { to: '/staff/store-order', label: 'Point of sale', icon: 'point_of_sale' },
            { to: '/staff/orders', label: 'Pickup orders', icon: 'shopping_bag', end: true },
            { to: '/staff/orders/history', label: 'Order history', icon: 'history' },
            { to: '/staff/payment', label: 'Pending counter bills', icon: 'payments' },
            { to: '/staff/transactions', label: 'Transactions', icon: 'receipt_long' },
        ]
    },
    {
        title: 'Catalog', items: [
            { to: '/staff/products', label: 'Products', icon: 'inventory_2' },
            { to: '/staff/inventory', label: 'Inventory', icon: 'warehouse' },
        ]
    },
    {
        title: 'Customers', items: [
            { to: '/staff/customers', label: 'Customers', icon: 'group' },
            { to: '/staff/complaints', label: 'Complaints', icon: 'support_agent' },
            { to: '/staff/promotions', label: 'Promotions', icon: 'campaign' },
        ]
    },
    { title: 'Work', items: [{ to: '/staff/shifts', label: 'Work Shifts', icon: 'schedule' }, { to: '/staff/notifications', label: "Notifications", icon: 'notifications' }] },
];

// Khung trang staff: menu bên trái theo nhóm chức năng
export default function StaffShell({ crumbs, children }) {
    return <PortalShell tag="STAFF" roleLabel="Staff" groups={STAFF_GROUPS} profilePath="/staff/profile" crumbs={crumbs}>{children}</PortalShell>;
}

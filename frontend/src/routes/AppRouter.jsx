
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

import PublicLayout from '../layouts/PublicLayout';
import CustomerLayout from '../layouts/CustomerLayout';
import StaffLayout from '../layouts/StaffLayout';
import AdminLayout from '../layouts/AdminLayout';

import NotFoundPage from '../pages/NotFoundPage';

// Guest
import ProductListPage from '../pages/guest/ProductListPage';
import ProductDetailPage from '../pages/guest/ProductDetailPage';
import PromotionsPage from '../pages/guest/PromotionsPage';
import LoginPage from '../pages/guest/LoginPage';
import RegisterPage from '../pages/guest/RegisterPage';
import ForgotPasswordPage from '../pages/guest/ForgotPasswordPage';
import ResetPasswordPage from '../pages/guest/ResetPasswordPage';

// Customer
import ProfilePage from '../pages/customer/ProfilePage';
import AddressPage from '../pages/customer/AddressPage';
import CartPage from '../pages/customer/CartPage';
import CheckoutPage from '../pages/customer/CheckoutPage';
import PaymentResultPage from '../pages/customer/PaymentResultPage';
import OrdersPage from '../pages/customer/OrdersPage';
import OrderDetailPage from '../pages/customer/OrderDetailPage';
import OrderTrackingPage from '../pages/customer/OrderTrackingPage';
import OrderHistoryPage from '../pages/customer/OrderHistoryPage';
import PayOrderPage from '../pages/customer/PayOrderPage';
import MyReviewsPage from '../pages/customer/MyReviewsPage';
import MembershipPage from '../pages/customer/MembershipPage';
import SupportPage from '../pages/customer/SupportPage';

// Staff
import StaffDashboardPage from '../pages/staff/StaffDashboardPage';
import StoreOrderPage from '../pages/staff/StoreOrderPage';
import StaffPaymentPage from '../pages/staff/StaffPaymentPage';
import StaffTransactionsPage from '../pages/staff/StaffTransactionsPage';
import StaffProductsPage from '../pages/staff/StaffProductsPage';
import StaffInventoryPage from '../pages/staff/StaffInventoryPage';
import StaffCustomersPage from '../pages/staff/StaffCustomersPage';
import StaffComplaintsPage from '../pages/staff/StaffComplaintsPage';
import StaffCustomerDetailPage from '../pages/staff/StaffCustomerDetailPage';
import StaffComplaintDetailPage from '../pages/staff/StaffComplaintDetailPage';
import StaffPromotionsPage from '../pages/staff/StaffPromotionsPage';
import WorkShiftPage from '../pages/staff/WorkShiftPage';
import StaffProfilePage from '../pages/staff/StaffProfilePage';

// Admin
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminOrdersPage from '../pages/admin/AdminOrdersPage';
import AdminOrderDetailPage from '../pages/admin/AdminOrderDetailPage';
import AdminTransactionsPage from '../pages/admin/AdminTransactionsPage';
import AdminPaymentsPage from '../pages/admin/AdminPaymentsPage';
import AdminProductsPage from '../pages/admin/AdminProductsPage';
import AdminProductFormPage from '../pages/admin/AdminProductFormPage';
import AdminProductDetailPage from '../pages/admin/AdminProductDetailPage';
import AdminCategoriesPage from '../pages/admin/AdminCategoriesPage';
import AdminInventoryPage from '../pages/admin/AdminInventoryPage';
import AdminCustomersPage from '../pages/admin/AdminCustomersPage';
import AdminStaffPage from '../pages/admin/AdminStaffPage';
import AdminStoresPage from '../pages/admin/AdminStoresPage';
import AdminPromotionsPage from '../pages/admin/AdminPromotionsPage';
import AdminDiscountCodesPage from '../pages/admin/AdminDiscountCodesPage';
import AdminMembershipPage from '../pages/admin/AdminMembershipPage';
import AdminReviewsPage from '../pages/admin/AdminReviewsPage';
import AdminProfilePage from '../pages/admin/AdminProfilePage';

const HomePage = lazy(() => import('../pages/guest/HomePage'));

export default function AppRouter() {
  return (
    <Routes>
      {/* Guest */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Suspense fallback={<div className="container">Loading store…</div>}><HomePage /></Suspense>} />
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/promotions" element={<PromotionsPage />} />
        <Route path="/promotion" element={<PromotionsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Customer */}
      <Route
        element={
          <ProtectedRoute roles={['customer']}>
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/addresses" element={<AddressPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/payment/result" element={<PaymentResultPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/history" element={<OrderHistoryPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/orders/:id/tracking" element={<OrderTrackingPage />} />
        <Route path="/orders/:id/pay" element={<PayOrderPage />} />
        <Route path="/reviews" element={<MyReviewsPage />} />
        <Route path="/membership" element={<MembershipPage />} />
        <Route path="/support" element={<SupportPage />} />
      </Route>

      {/* Staff */}
      <Route
        path="/staff"
        element={
          <ProtectedRoute roles={['staff']}>
            <StaffLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StaffDashboardPage />} />
        <Route path="store-order" element={<StoreOrderPage />} />
        <Route path="payment" element={<StaffPaymentPage />} />
        <Route path="transactions" element={<StaffTransactionsPage />} />
        <Route path="products" element={<StaffProductsPage />} />
        <Route path="inventory" element={<StaffInventoryPage />} />
        <Route path="customers" element={<StaffCustomersPage />} />
        <Route path="customers/:id" element={<StaffCustomerDetailPage />} />
        <Route path="complaints" element={<StaffComplaintsPage />} />
        <Route path="complaints/:id" element={<StaffComplaintDetailPage />} />
        <Route path="promotions" element={<StaffPromotionsPage />} />
        <Route path="shifts" element={<WorkShiftPage />} />
        <Route path="profile" element={<StaffProfilePage />} />
      </Route>

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="orders/:id" element={<AdminOrderDetailPage />} />
        <Route path="transactions" element={<AdminTransactionsPage />} />
        <Route path="payments" element={<AdminPaymentsPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="products/new" element={<AdminProductFormPage />} />
        <Route path="products/:id" element={<AdminProductDetailPage />} />
        <Route path="products/:id/edit" element={<AdminProductFormPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="inventory" element={<AdminInventoryPage />} />
        <Route path="customers" element={<AdminCustomersPage />} />
        <Route path="staff" element={<AdminStaffPage />} />
        <Route path="stores" element={<AdminStoresPage />} />
        <Route path="promotions" element={<AdminPromotionsPage />} />
        <Route path="discount-codes" element={<AdminDiscountCodesPage />} />
        <Route path="membership" element={<AdminMembershipPage />} />
        <Route path="reviews" element={<AdminReviewsPage />} />
        <Route path="profile" element={<AdminProfilePage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

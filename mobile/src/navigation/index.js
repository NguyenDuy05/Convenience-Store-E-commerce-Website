import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, shadowLg } from '../theme';
import SplashView from '../components/SplashView';
import { ForgotPasswordScreen, LoginScreen, RegisterScreen, ResetPasswordScreen } from '../screens/auth';
import { HomeScreen, ProductDetailScreen, ProductsScreen } from '../screens/catalog';
import { DealsScreen } from '../screens/deals';
import { CartScreen, CheckoutScreen, PayOrderScreen, PaymentResultScreen } from '../screens/shop';
import { OrderDetailScreen, OrderHistoryScreen, OrderTrackingScreen, OrdersScreen } from '../screens/orders';
import { AccountScreen, AddressesScreen, MembershipScreen, ProfileScreen } from '../screens/account';
import { MyReviewsScreen, SupportDetailScreen, SupportScreen } from '../screens/feedback';
import { FavoritesScreen, MemberCardScreen, StoreInfoScreen } from '../screens/extra';
import OrderWatcher from '../components/OrderWatcher';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { WELCOME_KEY, WelcomeScreen } from '../screens/welcome';
import CartIcon from '../components/CartIcon';
import { NotificationsScreen, WalletScreen } from '../screens/wallet';
import { PosScreen, StaffComplaintDetailScreen, StaffComplaintsScreen, StaffHomeScreen, StaffInventoryScreen, StaffMembersScreen, StaffMoreScreen, StaffOrderDetailScreen, StaffOrdersScreen, StaffShiftsScreen } from '../screens/staff';
import { AdminCustomerDetailScreen, AdminCustomersScreen, AdminFinanceScreen, AdminHomeScreen, AdminMoreScreen, AdminOrderDetailScreen, AdminOrdersScreen, AdminProductsScreen, AdminShiftsScreen, AdminStaffDetailScreen, AdminStaffScreen } from '../screens/admin';

const Stack = createNativeStackNavigator();
export const navRef = createNavigationContainerRef();
const Tab = createBottomTabNavigator();

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.primary, card: colors.bg, text: colors.text, border: colors.border } };
const ICONS = { Home: 'home', Products: 'grid', Deals: 'pricetags', Cart: 'bag-handle', Account: 'person' };

function Tabs() {
  const { cartCount, user } = useAuth();
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.outline,
      tabBarLabelStyle: { fontFamily: fonts.semi, fontSize: 11 }, tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 0, height: 64, paddingTop: 6, ...shadowLg },
      tabBarBadgeStyle: { backgroundColor: colors.primary, fontFamily: fonts.bold, fontSize: 10 },
      tabBarIcon: ({ color, size, focused }) => (route.name === 'Cart'
        ? <CartIcon size={size} color={color} strokeWidth={focused ? 2.3 : 1.8} />
        : <Ionicons name={focused ? ICONS[route.name] : `${ICONS[route.name]}-outline`} size={size} color={color} />),
    })}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Trang chủ' }} />
      <Tab.Screen name="Products" component={ProductsScreen} options={{ title: 'Danh mục' }} />
      <Tab.Screen name="Deals" component={DealsScreen} options={{ title: 'Ưu đãi' }} />
      <Tab.Screen name="Cart" component={CartScreen} options={{ title: 'Giỏ hàng', tabBarBadge: user && cartCount > 0 ? cartCount : undefined }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Cá nhân' }} />
    </Tab.Navigator>
  );
}

// Bộ tab theo vai trò: nhân viên / quản trị viên
const tabOptions = (icons) => ({ route }) => ({
  headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.outline,
  tabBarLabelStyle: { fontFamily: fonts.semi, fontSize: 11 }, tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 0, height: 64, paddingTop: 6, ...shadowLg },
  tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? icons[route.name] : `${icons[route.name]}-outline`} size={size} color={color} />,
});
const STAFF_ICONS = { StaffHome: 'home', StaffOrders: 'receipt', StaffPOS: 'calculator', StaffShifts: 'time', StaffMore: 'grid' };
function StaffTabs() {
  return (
    <Tab.Navigator screenOptions={tabOptions(STAFF_ICONS)}>
      <Tab.Screen name="StaffHome" component={StaffHomeScreen} options={{ title: 'Tổng quan' }} />
      <Tab.Screen name="StaffOrders" component={StaffOrdersScreen} options={{ title: 'Đơn hàng' }} />
      <Tab.Screen name="StaffPOS" component={PosScreen} options={{ title: 'Bán hàng' }} />
      <Tab.Screen name="StaffShifts" component={StaffShiftsScreen} options={{ title: 'Ca làm' }} />
      <Tab.Screen name="StaffMore" component={StaffMoreScreen} options={{ title: 'Thêm' }} />
    </Tab.Navigator>
  );
}
const ADMIN_ICONS = { AdminHome: 'speedometer', AdminOrders: 'receipt', AdminFinance: 'wallet', AdminShifts: 'calendar', AdminMore: 'grid' };
function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={tabOptions(ADMIN_ICONS)}>
      <Tab.Screen name="AdminHome" component={AdminHomeScreen} options={{ title: 'Tổng quan' }} />
      <Tab.Screen name="AdminOrders" component={AdminOrdersScreen} options={{ title: 'Đơn hàng' }} />
      <Tab.Screen name="AdminFinance" component={AdminFinanceScreen} options={{ title: 'Tài chính' }} />
      <Tab.Screen name="AdminShifts" component={AdminShiftsScreen} options={{ title: 'Ca làm' }} />
      <Tab.Screen name="AdminMore" component={AdminMoreScreen} options={{ title: 'Thêm' }} />
    </Tab.Navigator>
  );
}

const hdr = {
  headerTintColor: colors.text, headerTitleStyle: { color: colors.text, fontFamily: fonts.displayBold, fontSize: 17 }, headerBackTitle: 'Quay lại',
  headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false, contentStyle: { backgroundColor: colors.bg },
};

export default function Navigation() {
  const { loading, user } = useAuth();
  const [welcomed, setWelcomed] = useState(null);
  useEffect(() => { AsyncStorage.getItem(WELCOME_KEY).then((v) => setWelcomed(!!v)).catch(() => setWelcomed(true)); }, []);
  if (loading || welcomed === null) return <SplashView progressText="Sẵn sàng phục vụ bạn!" />;
  if (user?.role === 'staff' || user?.role === 'admin') return <WorkNavigation role={user.role} />;
  return (
    <NavigationContainer theme={theme} ref={navRef}>
      <Stack.Navigator screenOptions={hdr} initialRouteName={user || welcomed ? 'Tabs' : 'Welcome'}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Chi tiết sản phẩm' }} />
        <Stack.Screen name="Promotions" component={DealsScreen} options={{ title: 'Khuyến mãi & ưu đãi' }} />
        <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'Đơn hàng của tôi' }} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Xác nhận đơn hàng' }} />
        <Stack.Screen name="PayOrder" component={PayOrderScreen} options={{ title: 'Thanh toán đơn hàng' }} />
        <Stack.Screen name="PaymentResult" component={PaymentResultScreen} options={{ title: 'Kết quả đặt hàng', headerBackVisible: false }} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Chi tiết đơn hàng' }} />
        <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} options={{ title: 'Theo dõi đơn hàng' }} />
        <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} options={{ title: 'Lịch sử đơn hàng' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Hồ sơ cá nhân' }} />
        <Stack.Screen name="Addresses" component={AddressesScreen} options={{ title: 'Địa chỉ' }} />
        <Stack.Screen name="Membership" component={MembershipScreen} options={{ title: 'Thành viên & điểm' }} />
        <Stack.Screen name="MyReviews" component={MyReviewsScreen} options={{ title: 'Đánh giá của tôi' }} />
        <Stack.Screen name="Support" component={SupportScreen} options={{ title: 'Hỗ trợ & khiếu nại' }} />
        <Stack.Screen name="SupportDetail" component={SupportDetailScreen} options={{ title: 'Chi tiết yêu cầu' }} />
        <Stack.Screen name="MemberCard" component={MemberCardScreen} options={{ title: 'Thẻ thành viên' }} />
        <Stack.Screen name="StoreInfo" component={StoreInfoScreen} options={{ title: 'Thông tin cửa hàng' }} />
        <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Yêu thích & đã xem' }} />
        <Stack.Screen name="Vouchers" component={DealsScreen} options={{ title: 'Kho voucher' }} />
        <Stack.Screen name="Wallet" component={WalletScreen} options={{ title: 'Ví QUICK' }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Thông báo' }} />
        <Stack.Group screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </Stack.Group>
      </Stack.Navigator>
      <OrderWatcher navRef={navRef} />
    </NavigationContainer>
  );
}

// Điều hướng cho nhân viên / quản trị viên (đổi vai trò thì dựng lại toàn bộ cây màn hình)
function WorkNavigation({ role }) {
  const staff = role === 'staff';
  return (
    <NavigationContainer theme={theme} ref={navRef} key={role}>
      <Stack.Navigator screenOptions={hdr}>
        {staff ? (
          <>
            <Stack.Screen name="StaffTabs" component={StaffTabs} options={{ headerShown: false }} />
            <Stack.Screen name="StaffOrderDetail" component={StaffOrderDetailScreen} options={{ title: 'Chi tiết đơn' }} />
            <Stack.Screen name="StaffOrderHistory" component={StaffOrdersScreen} initialParams={{ status: 'history' }} options={{ title: 'Lịch sử đơn' }} />
            <Stack.Screen name="StaffMembers" component={StaffMembersScreen} options={{ title: 'Thành viên' }} />
            <Stack.Screen name="StaffInventory" component={StaffInventoryScreen} options={{ title: 'Tồn kho' }} />
            <Stack.Screen name="StaffComplaints" component={StaffComplaintsScreen} options={{ title: 'Khiếu nại & hỗ trợ' }} />
            <Stack.Screen name="StaffComplaintDetail" component={StaffComplaintDetailScreen} options={{ title: 'Chi tiết yêu cầu' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="AdminTabs" component={AdminTabs} options={{ headerShown: false }} />
            <Stack.Screen name="AdminOrderDetail" component={AdminOrderDetailScreen} options={{ title: 'Chi tiết đơn' }} />
            <Stack.Screen name="AdminStaff" component={AdminStaffScreen} options={{ title: 'Nhân viên' }} />
            <Stack.Screen name="AdminStaffDetail" component={AdminStaffDetailScreen} options={{ title: 'Chi tiết nhân viên' }} />
            <Stack.Screen name="AdminProducts" component={AdminProductsScreen} options={{ title: 'Sản phẩm & giá' }} />
            <Stack.Screen name="AdminCustomers" component={AdminCustomersScreen} options={{ title: 'Khách hàng' }} />
            <Stack.Screen name="AdminCustomerDetail" component={AdminCustomerDetailScreen} options={{ title: 'Chi tiết khách hàng' }} />
          </>
        )}
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Thông báo' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Hồ sơ cá nhân' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// navigation/RootStackNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AppNavigator from './AppNavigator';
import CourierNavigator from './CourierNavigator';
import ProductDetailScreen from '@features/product/screens/ProductDetailScreen';
import ProductListScreen from '@features/product/screens/ProductListScreen';
import OrderHistoryScreen from '@features/order/screens/OrderHistoryScreen';
import OrderDetailScreen from '@features/order/screens/OrderDetailScreen';
import SearchInputScreen from '@features/search/screens/SearchInputScreen';
import AddressListScreen from '@features/profile/screens/AddressListScreen';
import AddAddressScreen from '@features/profile/screens/AddAddressScreen';
import CheckoutScreen from '@features/order/screens/CheckoutScreen';
import OrderSuccessScreen from '@features/order/screens/OrderSuccessScreen';
import BankTransferScreen from '@features/order/screens/BankTransferScreen';
import PromptPayScreen from '@features/order/screens/PromptPayScreen';
import WriteReviewScreen from '@features/others/screens/review/WriteReviewScreen';
import MyReviewsScreen from '@features/others/screens/review/MyReviewsScreen';
import EditProfileScreen from '@features/profile/screens/EditProfileScreen';
import SettingsScreen from '@features/profile/screens/SettingsScreen';
import SellerCenterScreen from '@features/others/screens/seller/SellerCenterScreen';
import SellerFlashSaleInfoScreen from '@features/others/screens/seller/SellerFlashSaleInfoScreen';
import AddProductScreen from '@features/others/screens/seller/AddProductScreen';
import AdminOrderListScreen from '@features/others/screens/seller/AdminOrderListScreen';
import SellerReturnListScreen from '@features/others/screens/seller/SellerReturnListScreen';
import CreateStoreScreen from '@features/others/screens/seller/CreateStoreScreen';
import CouponListScreen from '@features/others/screens/seller/CouponListScreen';
import AddCouponScreen from '@features/others/screens/seller/AddCouponScreen';
import SellerProductListScreen from '@features/others/screens/seller/SellerProductListScreen';
import StoreSettingsScreen from '@features/others/screens/seller/StoreSettingsScreen';
import SellerWalletScreen from '@features/others/screens/seller/SellerWalletScreen';
import SellerWithdrawScreen from '@features/others/screens/seller/SellerWithdrawScreen';
import AdminDashboardScreen from '@features/others/screens/admin/AdminDashboardScreen';
import AdminFlashSaleListScreen from '@features/others/screens/admin/AdminFlashSaleListScreen';
import AdminCreateFlashSaleScreen from '@features/others/screens/admin/AdminCreateFlashSaleScreen';
import AdminUserListScreen from '@features/others/screens/admin/AdminUserListScreen';
import AdminStoreListScreen from '@features/others/screens/admin/AdminStoreListScreen';
import AdminActivityLogScreen from '@features/others/screens/admin/AdminActivityLogScreen';
import AdminStatsScreen from '@features/others/screens/admin/AdminStatsScreen';
import AdminUserDetailsScreen from '@features/others/screens/admin/AdminUserDetailsScreen';
import AdminStoreDetailScreen from '@features/others/screens/admin/AdminStoreDetailScreen';
import AdminCategoryListScreen from '@features/others/screens/admin/AdminCategoryListScreen';
import AdminManageCategoryScreen from '@features/others/screens/admin/AdminManageCategoryScreen';
import FullScreenChartScreen from '@features/others/screens/admin/FullScreenChartScreen';
import AdminChatListScreen from '@features/others/screens/admin/AdminChatListScreen';
import AdminReviewReportsScreen from '@features/others/screens/admin/AdminReviewReportsScreen';
import AdminBannerListScreen from '@features/others/screens/admin/AdminBannerListScreen';
import AdminAddBannerScreen from '@features/others/screens/admin/AdminAddBannerScreen';
import AdminCouponListScreen from '@features/others/screens/admin/AdminCouponListScreen';
import AdminWithdrawalListScreen from '@features/others/screens/admin/AdminWithdrawalListScreen';
import AdminWithdrawalDetailScreen from '@features/others/screens/admin/AdminWithdrawalDetailScreen';
import MyPointsScreen from '@features/profile/screens/MyPointsScreen';
import TrackingScreen from '@features/order/screens/TrackingScreen';
import ChatScreen from '@features/others/screens/ChatScreen';
import GreetingScreen from '@features/home/screens/GreetingScreen';
import ForgotPasswordScreen from '@features/auth/screens/ForgotPasswordScreen';
import ResetPasswordScreen from '@features/auth/screens/ResetPasswordScreen';
import FollowingScreen from '@features/profile/screens/FollowingScreen';
import HelpCenterScreen from '@features/profile/screens/HelpCenterScreen';
import NotificationSettingsScreen from '@features/profile/screens/NotificationSettingsScreen';
import VerifyEmailScreen from '@features/auth/screens/VerifyEmailScreen';
import StoreProfileScreen from '@features/others/screens/store/StoreProfileScreen';
import MallStoresScreen from '@features/others/screens/store/MallStoresScreen';
import NotificationScreen from '@features/others/screens/NotificationScreen';
import UserChatListScreen from '@features/others/screens/UserChatListScreen';
import OnboardingScreen from '@features/others/screens/OnboardingScreen';
import RegisterScreen from '@features/auth/screens/RegisterScreen';
import RequestReturnScreen from '@features/order/screens/RequestReturnScreen';
import ReturnHistoryScreen from '@features/order/screens/ReturnHistoryScreen';
import OrderReturnRequestScreen from '@features/order/screens/OrderReturnRequestScreen';
import OrderReturnListScreen from '@features/order/screens/OrderReturnListScreen';
import OrderReturnDetailScreen from '@features/order/screens/OrderReturnDetailScreen';
import SelectCouponScreen from '@features/order/screens/SelectCouponScreen';
import CouponsScreen from '@features/others/screens/CouponsScreen';
import FlashSaleScreen from '@features/others/screens/FlashSaleScreen';
import { OrderReturn } from '@shared/interfaces/returns';

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  CourierApp: undefined;
  ProductDetail: { productId: number };
  ProductList:
  | {
    query?: string;
    categoryId?: number;
    products?: any[]; // สำหรับ Visual Search results
  }
  | undefined;
  OrderHistory: { initialTab?: string } | undefined;
  OrderDetail: { orderId: number };
  Tracking: { trackingNumber: string; provider?: string; orderId?: number };
  RequestReturn: { orderId: number; order?: any };
  ReturnHistory: undefined;
  OrderReturnRequest: { orderId: number; order?: any };
  OrderReturnList: undefined;
  OrderReturnDetail: { orderReturn: OrderReturn };
  SearchInput: undefined;
  AddressList: { mode?: 'select' | 'manage' };
  AddAddress: undefined;
  Checkout: undefined;
  SelectCoupon: undefined;
  OrderSuccess: undefined;
  BankTransfer: {
    orderId: number;
    totalAmount: number;
  };
  PromptPay: {
    orderId: number;
    totalAmount: number;
    paymentExpiredAt?: string;
  };
  WriteReview: {
    productId: number;
    productName: string;
    productImage: string;
    existingReview?: any; // ✅ เพิ่มสำหรับการแก้ไข
  };
  EditProfile: undefined;
  Settings: undefined;
  SellerCenter: undefined;
  SellerFlashSaleInfo: undefined;
  AddProduct: undefined;
  AdminOrderList: undefined;
  SellerReturnList: undefined;
  CreateStore: undefined;
  CouponList: undefined;
  AddCoupon: undefined;
  SellerProductList: undefined;
  StoreSettings: undefined;
  SellerWallet: undefined;
  SellerWithdraw: { storeId: number; balance: number };
  AdminDashboard: undefined;
  AdminFlashSaleList: undefined;
  AdminUserList: undefined;
  AdminUserDetails: { userId: number };
  AdminStoreList: undefined;
  AdminStoreDetail: { storeId: number };
  AdminCategoryList: undefined;
  AdminManageCategory: { category?: any };
  AdminActivityLog: undefined;
  AdminStats: undefined;
  FullScreenChart: { chartType: 'revenue' | 'orders'; period: number };
  AdminChatList: undefined;
  Chat: { roomId?: string };
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  Following: undefined;
  HelpCenter: undefined;
  NotificationSettings: undefined;
  VerifyEmail: { email: string };
  MyReviews: undefined;
  AdminReviewReports: undefined;
  AdminBannerList: undefined;
  AdminAddBanner: { banner?: any } | undefined;
  AdminCouponList: undefined;
  AdminWithdrawalList: undefined;
  AdminWithdrawalDetail: { withdrawalId: number };
  StoreProfile: { storeId: number };
  MallStoresScreen: undefined;
  Notification: undefined;
  UserChatList: undefined;
  RegisterScreen: undefined;
  MyPoints: undefined;
  CouponsScreen: undefined;
  FlashSale: undefined;

  AdminCreateFlashSale: undefined;
  Greeting: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

interface RootStackNavigatorProps {
  initialRouteName?: 'Onboarding' | 'MainTabs';
}

export default function RootStackNavigator({ initialRouteName = 'MainTabs' }: RootStackNavigatorProps) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        // ✅ ป้องกันพื้นหลังสีดำตอนเปลี่ยนหน้าจอ / reset stack
        contentStyle: { backgroundColor: '#ffffff' },
      }}
      initialRouteName={initialRouteName}
    >
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="MainTabs" component={AppNavigator} />
      <Stack.Screen
        name="CourierApp"
        component={CourierNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="ProductList" component={ProductListScreen} />
      <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen
        name="RequestReturn"
        component={RequestReturnScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ReturnHistory"
        component={ReturnHistoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OrderReturnRequest"
        component={OrderReturnRequestScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OrderReturnList"
        component={OrderReturnListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OrderReturnDetail"
        component={OrderReturnDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="SearchInput" component={SearchInputScreen} />
      <Stack.Screen name="AddressList" component={AddressListScreen} />
      <Stack.Screen name="AddAddress" component={AddAddressScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen
        name="SelectCoupon"
        component={SelectCouponScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="BankTransfer" component={BankTransferScreen} />
      <Stack.Screen name="PromptPay" component={PromptPayScreen} />
      <Stack.Screen name="Tracking" component={TrackingScreen} />
      <Stack.Screen
        name="OrderSuccess"
        component={OrderSuccessScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
          headerLeft: () => null,
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="WriteReview"
        component={WriteReviewScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MyReviews"
        component={MyReviewsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminReviewReports"
        component={AdminReviewReportsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminBannerList"
        component={AdminBannerListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MyPoints"
        component={MyPointsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminAddBanner"
        component={AdminAddBannerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerCenter"
        component={SellerCenterScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerFlashSaleInfo"
        component={SellerFlashSaleInfoScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddProduct"
        component={AddProductScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminOrderList"
        component={AdminOrderListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerReturnList"
        component={SellerReturnListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateStore"
        component={CreateStoreScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CouponList"
        component={CouponListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddCoupon"
        component={AddCouponScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerProductList"
        component={SellerProductListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StoreSettings"
        component={StoreSettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerWallet"
        component={SellerWalletScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SellerWithdraw"
        component={SellerWithdrawScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminFlashSaleList"
        component={AdminFlashSaleListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminCreateFlashSale"
        component={AdminCreateFlashSaleScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminUserList"
        component={AdminUserListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminUserDetails"
        component={AdminUserDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminStoreList"
        component={AdminStoreListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminStoreDetail"
        component={AdminStoreDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminCategoryList"
        component={AdminCategoryListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminManageCategory"
        component={AdminManageCategoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminActivityLog"
        component={AdminActivityLogScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminStats"
        component={AdminStatsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminCouponList"
        component={AdminCouponListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminWithdrawalList"
        component={AdminWithdrawalListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminWithdrawalDetail"
        component={AdminWithdrawalDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FullScreenChart"
        component={FullScreenChartScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminChatList"
        component={AdminChatListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Following"
        component={FollowingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="HelpCenter"
        component={HelpCenterScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="VerifyEmail"
        component={VerifyEmailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StoreProfile"
        component={StoreProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MallStoresScreen"
        component={MallStoresScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Notification"
        component={NotificationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="UserChatList"
        component={UserChatListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RegisterScreen"
        component={RegisterScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CouponsScreen"
        component={CouponsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FlashSale"
        component={FlashSaleScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Greeting"
        component={GreetingScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

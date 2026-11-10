# QUICK Mobile UI/UX delivery

9 November 2026. Target: Expo Go SDK 54, React Native 0.81.5, React 19.1. Implementation notes for the current redesign; earlier QA screenshots/results in this directory describe the previous interface.

## Source audit and decisions

The existing app already integrated authentication, catalog, cart, checkout, VNPay, orders, wallet, membership, profile, addresses, reviews, support and notifications with the website backend. The main issues were form-heavy composition, inconsistent typography, repeated account buttons, an overlong home page, no first-launch introduction, and checkout actions below long content.

Reviewed mobile feature screens, navigation, storage, query/mutation hooks, shared controls and payment handling; website home/header/product cards, price summary and theme; and public product filter behavior. The public catalog supports search and category filtering. Sorting and stock filters in the controller are restricted to management users, so customer controls do not advertise those operations.

The repository has a QUICK storefront app icon, Baloo 2, and real product photographs. The website's logo configuration is empty. No official penguin mascot, separate logo file or reference screenshots were present in the supplied attachment directory. Existing branding and storefront/bag illustrations are used without inventing a replacement mascot.

## Screens implemented

| Area | Current interface and behavior |
| --- | --- |
| Startup | Branded font/session-loading screen with no artificial timeout; native splash configuration for builds |
| Welcome/onboarding | Welcome plus three swipeable discovery/order/pickup pages; Skip, Next, registration and guest entry; animated dots; locally persisted completion |
| Authentication | Branded login/register/recovery layouts, form surfaces, password visibility, validation and keyboard-aware scrolling; reset links/tokens retained |
| Home | Compact QUICK header, live cart/unread counts, greeting, search, real promotion carousel, API categories, product grid and store-details sheet |
| Explore | Sticky search/category header, category bottom sheet, reset controls, result count, paginated FlatList, loading/error/empty states |
| Product | Large image gallery with pagination, actual prices/stock/reviews, image entrance, quantity stepper, cart shortcut and fixed purchase area |
| Cart | Item cards, thumbnails, unit/line prices, swipe removal and accessible button alternative; fixed subtotal/checkout area |
| Checkout | Store first, contact details, product summary, voucher and note, wallet/VNPay breakdown, fixed confirmation area and recovery of interrupted confirmations |
| Payment | Status-based heading, verified API payment badges, browser payment, refresh and tracking actions; illustration does not claim an order is ready |
| Orders | Status filters, order/payment details, totals and ready-for-pickup emphasis |
| Order detail | Shared animated timeline driven by backend statuses/history; pickup instructions, store, totals, cancel/support actions |
| Account | Initial avatar, customer details, real wallet/membership summary and grouped navigation including order history |
| Profile/security | Consistent introductions and white form cards, password visibility and saved/error feedback |
| Membership | QUICK Club card, real tier/point totals, animated next-tier progress and points history |
| Wallet | Balance card, refund policy explanation and real transaction history |
| Address book | Shared controls, account-only address explanation, CRUD and default switch; no shipping checkout |
| Reviews | Branded introductions, rating controls, eligibility, create/edit/delete flows and public/store reviews |
| Support | Request form/history, status badges and store-response conversation |
| Notifications | Branded inbox, unread emphasis, mark-read/all-read and supported destination links |
| Promotions | Real offers, discount/expiry/scope information and browse action |

## Shared design system

`mobile/src/theme/tokens.js` defines the required QUICK blue/lime/yellow/sky/navy/white palette, semantic feedback colors, Baloo 2/Inter type scale, spacing, radii, shadows and motion durations. Darker blue is used for small text contrast.

Existing `T`, `Button`, `Field`, `Card`, `Screen`, `Chip`, `Quantity`, `Empty`, `Skeleton`, `QueryState`, `Notice`, `ProductImage` and `StoreCard` were refined rather than duplicated under new names. `Screen.footer` places purchase actions outside scroll content.

New components in `commerce.jsx`: `Brand`, `Entrance`, `IconButton`, `CartBadge`, `SectionHeader`, `PageIntro`, `SearchBar`, `CategoryCard`, `PromoBanner`, `BottomSheet`, `StatusBadge`, `OrderTimeline` and `MenuItem`. `ToastProvider` supplies shared cart feedback. ProductCard remains the shared catalog card.

Navigation stays with Expo Router: Home, Explore, Cart, Orders and Account tabs, plus existing detail/form routes. First-launch onboarding is an overlay over the mounted router, so the navigation tree is available when a guest/account destination is selected. Existing authenticated users and non-entry deep links are not forced through onboarding.

## Motion, assets and dependencies

- Reanimated: page/illustration entrance, press feedback, selected tabs, cart badges, quantity changes, progress, pagination dots and skeletons.
- Gesture Handler: existing swipe-to-remove cart interaction. Native Modal: dismissible filter/store sheets and onboarding. Horizontal swipes: onboarding, offers and product images.
- Reduced-motion preferences disable or shorten animation. Forms retain accessibility labels, dynamic text, safe areas and password controls. Native smoothness and device accessibility have not been measured for this revision.
- Reused `quick-icon.png`, licensed Baloo 2 and the site's snack/milk product photographs for onboarding illustration. Catalog photos continue to come from actual product records.
- Added bundled `inter-variable.ttf` and its SIL Open Font License from [Google Fonts Inter](https://github.com/google/fonts/tree/main/ofl/inter).
- No new runtime dependencies. Removed the unused `expo-linear-gradient` dependency. SDK 54 remains selected for the requested Expo Go emulator.
- Expo Go controls its own native launch screen; the custom in-app welcome experience is available there. Native splash configuration applies to app builds.

## Changed files

- `mobile/src/theme/tokens.js`, `components/ui.js`, new `components/commerce.jsx`.
- `mobile/src/context/Toast.jsx`, `hooks/data.js`, `utils/domain.js`.
- `mobile/src/app/_layout.jsx`, `mobile/src/app/(tabs)/_layout.jsx`.
- New `mobile/src/features/onboarding/WelcomeFlow.jsx`.
- Updated feature screens: `auth/AuthScreen.jsx`, `home/HomeScreen.jsx`, `products/ExploreScreen.jsx`, `products/ProductCard.jsx`, `products/ProductScreen.jsx`, `cart/CartScreen.jsx`, `checkout/CheckoutScreen.jsx`, `payment/PaymentScreen.jsx`, `orders/OrdersScreen.jsx`, `orders/OrderScreen.jsx`, `profile/AccountScreen.jsx`, `profile/ProfileScreen.jsx`, `membership/MembershipScreen.jsx`, `wallet/WalletScreen.jsx`, `addresses/AddressesScreen.jsx`, `reviews/ReviewsScreen.jsx`, `support/SupportScreen.jsx`, `notifications/NotificationsScreen.jsx`, `promotions/PromotionsScreen.jsx`.
- `mobile/assets/fonts/inter-variable.ttf`, `mobile/assets/fonts/LICENSE-inter.txt`, `mobile/assets/brand/snack.png`, `mobile/assets/brand/milk.png`.
- `mobile/app.json`, `mobile/package.json`, `mobile/package-lock.json`, `mobile/README.md`, this report, and historical-baseline notes in `REPORT.md` / `FEATURE_MATRIX.md`.

No backend contracts, database records or website functionality were changed by this UI redesign. Wallet-first payments, server-calculated checkout, persisted idempotency keys, customer cancellation eligibility and refund-to-wallet behavior remain in place.

## Verification and remaining limits

Per the user's explicit request, no unit/integration/UI tests, emulator acceptance sessions, payment transactions or export builds were run for the redesign. Source formatting and lint/parse checks are separate from functional testing. This document does not claim device acceptance or tested payment success for the new interface.

- `npm run lint`: passed, no errors or warnings.
- `npm run typecheck`: passed; project uses JavaScript with `checkJs: false`, so this is parse/module-resolution validation, not comprehensive type checking.
- Missing official penguin/logo/reference assets remain the only unfilled visual asset request. Existing branded artwork is used in their place, without a substitute character.
- Native Google login, push notifications, delivery, reward redemption and unsupported catalog sorts are not presented as working features. Their original integration limits remain unchanged.
- Native device layout, large-font accessibility, animation performance and VNPay merchant acceptance remain unverified in this revision.

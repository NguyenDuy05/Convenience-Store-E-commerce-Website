# QUICK mobile coverage matrix

Audit date: 9 November 2026. Created before app initialization. Source-verified means the implementation exists and its route/controller/model path has been inspected; it is not a claim of a passed mobile test. Actual execution results will be recorded separately.

The application connects to the existing Express API and the existing MongoDB database. It does not contain a backend or a new database. Existing architecture/package documentation and `docs/qa/REPORT.md` were reviewed; the package workbook describes architecture rather than complete acceptance criteria. Internal staff/admin features stay on the website.

| Mobile destination | Existing API | Route → implementation → data | Audit classification / implementation decision |
| --- | --- | --- | --- |
| Home / Explore | GET `/products`, `/categories`, `/promotions`, `/stores` | product/category/promotion/store routes → matching controllers → Product, Category, Promotion, Store | Implemented in source. Paginate products; use `q`, `categoryId`; prices/stock from API. Public product sort is not supported server-side. |
| Product detail | GET `/products/:id`, `/reviews/product/:id` | product/review controllers → Product, Review | Implemented. Gallery uses actual image URLs; missing photos get an icon. |
| Login / Register | POST `/auth/login`, `/auth/register`; GET `/auth/me` | auth routes/controller → bcrypt/JWT → User | Implemented. Customer role only in app; SecureStore persists native session. |
| Logout / expiry | POST `/auth/logout`; authenticated 401 | auth controller / authenticate middleware → User status and role recheck | Implemented. Clear local session/cache; retain intended protected destination. |
| Forgot / Reset password | POST `/auth/forgot-password`, `/auth/reset-password` | auth controller → mail.service → User.passwordReset | Implemented. Email link currently targets web; app offers token/link entry and custom-scheme reset route. No invented email delivery. |
| Change password | PUT `/profile/password` | profile controller → bcrypt → User | Implemented. currentPassword, newPassword, confirmPassword. |
| Google native login | POST `/auth/google` | auth controller → google-auth-library → configured web client audience | Partial for mobile. Web Google credentials exist; native Android/iOS OAuth client configuration is absent. Do not expose a nonfunctional native Google button. |
| Cart | GET `/cart`, POST `/cart/items`, PUT/DELETE `/cart/items/:id` | cart controller → cart.service / stock.service → Cart, Product, StockBatch | Implemented. Same server cart as web; max 99 per product; expired batches excluded server-side. |
| Checkout preview | POST `/orders/preview` | order controller → checkout.service / pricing.service → Cart, Product, Promotion, DiscountCode, Store, Wallet | Implemented. Server totals, issue list, wallet credit, schedule and canCheckout are authoritative. |
| Pickup store | Preview.store; GET `/stores` | checkout.service → Store.findOne | Single store supported. Show and confirm the actual pickup location. Multiple-branch selection is not implemented and will not be fabricated. |
| Place order | POST `/orders`, `Idempotency-Key` | checkout.service → stock, discountReservation, wallet services → Order, StockBatch, Transaction, Wallet | Implemented. Persist unresolved attempt key/payload across app restarts; no automatic submissions. Wallet first, VNPay remainder. |
| VNPay start | POST `/payments/online` | payment controller → payment.service → vnpay.service → Transaction | Implemented. Ownership check, pending-attempt reuse, no duplicate payment requests. |
| VNPay mobile return | Existing GET `/payments/vnpay/return`, `/vnpay/ipn` | signature verification → applyGatewayResult → Order, Transaction | Web-only return currently. Add an optional fixed mobile return path without changing the web path or schemas; always fetch authenticated order after returning/resuming. |
| Orders / History | GET `/orders/my`, `/orders/my/history` | order controller → Order / payment expiry service | Implemented. Backend pagination/filter/status; refresh on focus. |
| Order detail / Tracking | GET `/orders/my/:id`, `/orders/my/:id/tracking` | order controller → Order, Store | Implemented. Use actual statusHistory and orderCode. Confirmed → preparing → ready_for_pickup → completed. |
| Cancellation | POST `/orders/my/:id/cancel` | order controller → stock / wallet / reservations | Implemented. Customer cancellation before preparation only; paid funds return to wallet. |
| Wallet | GET `/wallet` | wallet route → Wallet aggregate / User.membership | Implemented. Balance and paginated entries; no top-up/withdrawal API. |
| Notifications | GET `/notifications`, PATCH `/:id/read`, `/read-all` | notification controller → inAppNotification service → Notification, NotificationReceipt | Implemented in-app inbox. Poll while active; native push registration is not implemented. |
| Profile | GET/PUT `/profile` | profile controller → User | Implemented. fullName, phone, avatarUrl, dateOfBirth; email/role read-only. Preserve unedited fields. |
| Saved addresses | GET/POST `/addresses`, PUT/DELETE `/:id` | address controller → embedded User.addresses | Implemented. Max 10, default flag, phone/length validation. Account address book only, not a delivery flow. |
| Membership | GET `/membership/me`, `/membership/me/history` | membership controller → points.service → User, MembershipTier, PointHistory | Implemented. Points earned only after paid/completed pickup; no invented redemption endpoint. |
| Reviews | GET `/reviews/mine`, `/mine/eligible`, `/store`; POST `/reviews`, PUT/DELETE `/:id` | review controller → eligible completed orders → Review, Order, Product | Implemented with purchase eligibility/ownership. Show only eligible review targets and actual ratings. |
| Support | POST `/support`, GET `/support/my`, `/support/:id` | support controller → SupportRequest, Order, User | Implemented. Create/read requests and staff responses; customers cannot change administrative statuses. |
| Suggested carts | GET `/cart/suggestions` | cart controller → notImplemented | Documented but not implemented (501). Excluded. |
| Delivery / couriers / shipping / MoMo / cash online / POS | No supported customer flow | Excluded business scope | Not included. |

## Technology decision

Current target: Expo SDK 54 with React Native 0.81.5 and React 19.1, selected for the user?s Expo Go emulator. Expo Router remains the single navigation architecture. TanStack Query owns server state, Context owns authentication, SecureStore stores native tokens, and Reanimated/Gesture Handler provide interactions. Dependencies match the SDK 54 package map. The original SDK 57 QA record below is historical. See [UI redesign delivery](UI_REDESIGN.md) for the current screens and verification limits.

## Implementation checklist

- [x] Audit customer API paths and identify unsupported features.
- [x] Initialize compatible Expo application and design system.
- [x] Implement five tabs and protected destination restoration, including deep-link query parameters.
- [x] Implement product browsing, authentication and synchronized cart.
- [x] Implement persisted checkout attempts, VNPay return and real order tracking.
- [x] Implement profile, address book, wallet, notifications, membership, reviews and support.
- [x] Add gestures, reduced motion, accessibility labels and loading/error states.
- [x] Execute contract, integration, export and UI checks; report device limitations honestly.
- [x] Document environment setup, web compatibility and necessary backend changes.
- [ ] Execute physical Android/iOS, native SecureStore and live VNPay sandbox acceptance checks (environment-dependent; not claimed as passed).

The classification column above records the pre-implementation backend audit. The mobile callback is now implemented; executed results and limits are in [REPORT.md](REPORT.md). The application uses order detail's actual `statusHistory` for the timeline, so it does not need a second tracking request for the same order.

# QUICK mobile implementation and QA report

Date: 9 November 2026. This is the historical SDK 57 implementation/QA baseline. The current app targets SDK 54 and has since received a UI redesign. The results and screenshots below do not verify the current revision. See [current UI delivery notes](UI_REDESIGN.md); functional tests were intentionally not run for the redesign.

## Delivered

The `/mobile` application uses real React Native components, Expo Router and the existing Express API. It includes the five customer tabs, protected authentication flows, product search/details, synchronized cart, authoritative checkout, wallet-first payment, VNPay return handling, orders/pickup, profile/password/address management, wallet history, membership/points, reviews, support and the customer notification inbox.

No database schema was changed and no mobile database/backend was created. Store selection is a confirmation of the single supported store. Internal staff/admin/POS work remains on the website. Native Google OAuth and push notifications were excluded because the required backend/device setup is not implemented.

## Executed checks

The machine-readable result is [evidence/results.json](evidence/results.json). Each group contains multiple assertions against real API responses and persisted MongoDB records. UI tests run the actual Expo React Native Web rendering in Edge; requests are forwarded to a separate instance of the same Express app connected to the existing database. This isolates email configuration and test signing keys without replacing business APIs with canned responses.

| Check | Result / scope |
| --- | --- |
| Shared API and UI integration groups | 18/18 passed; includes all groups listed below |
| Mobile regression tests | 9 passed (`cd mobile; npm test`) |
| Clean install from lockfile | `npm ci` passed; postinstall decoder patch and 9 regression tests passed again |
| Existing backend controller tests | 48 passed (`cd backend; npm test`) |
| Mobile lint | Passed, no errors/warnings |
| JavaScript/JSX parse and module-resolution check | Passed (`npm run typecheck`; not full JS static typing) |
| Expo Doctor | 21/21 passed |
| Dependency audit | 0 vulnerabilities at verification time; [audit output](evidence/dependency-audit.json) |
| Android, iOS and web JavaScript/Hermes exports | Passed; no signed native binary or device execution implied |
| Existing website production build | Passed; existing bundle-size warning remains |

Executed integration coverage:

1. Local Expo preview CORS and preservation of the production website origin.
2. Real login, invalid credentials, guest denial and staff/customer authorization.
3. Registration, duplicate email, forgot/reset-password token handling, single-use reset tokens, password change and expired-session rejection. Email was captured locally; SMTP delivery was not exercised.
4. Product loading/search/details/gallery from real catalog responses.
5. Guest add-to-cart → login → original product destination → actual cart write.
6. Quantity update and shared server cart persistence.
7. Checkout preview, actual store data, server totals and absence of automatic order creation.
8. Price change and insufficient stock rejection before order creation.
9. A successfully processed checkout with a deliberately lost network response, followed by a safe replay: exactly one order persisted.
10. VNPay initiation, pending-attempt reuse, invalid signature, wrong amount, verified mobile redirect and duplicate callback handling.
11. Staff preparing → ready → completed, ready notification, customer cancellation boundary and membership points.
12. Paid cancellation → single wallet refund → partial-wallet checkout with VNPay remainder.
13. Failed/cancelled gateway response, payment expiry, inventory/wallet restoration and cart removal.
14. Ownership protection; profile, address, review and support persistence.
15. Mobile account screens loading real wallet, membership, reviews, support and notification read receipts.
16. Layout overflow checks at 320/390/768 CSS pixels, reduced-motion navigation and JavaScript runtime errors.
17. Existing website rendering a mobile-created order; an order submitted by the website browser's API appearing on mobile. The latter checks cross-client API integration, not a full replay of the website checkout form.
18. Payment deep-link order ID surviving login, then logout removing protected access.

## Fixes found during implementation/testing

- Retained the checkout key and exact payload after ambiguous network failures to prevent duplicate orders.
- Preserved query parameters through the login gate so a payment return still identifies the correct order.
- Used `dismissTo` after login to avoid an unnecessary duplicate product screen in navigation history.
- Matched cancellation validation to the existing backend: a reason of 3–500 characters is required.
- Corrected wallet list keys to the actual journal `key` field; entries do not have `_id`.
- Preserved avatar/date fields during profile updates and refreshed data when screens regain focus.
- Used backend image routes for legacy relative web image paths.
- Adjusted bottom navigation for safe-area insets and reduced the icon import scope.
- Patched the vulnerable transitive URI decoder while retaining SDK 57 and its CommonJS compatibility. Verified Unicode decoding and malformed input handling.
- Added narrowly scoped development CORS support so the Expo browser preview can call the backend without changing production website access.

## Backend changes made for mobile

| File | Reason |
| --- | --- |
| `backend/src/app.js` | Allow local Expo browser origins on ports 8081/8082 in development; retain configured website access in production |
| `backend/src/routes/payment.routes.js` | Register the fixed `/vnpay/mobile-return` route |
| `backend/src/controllers/payment.controller.js` | Validate optional `returnTo`; verify/apply payment callbacks before redirecting to the fixed app scheme |
| `backend/src/services/payment.service.js` | Forward optional return destination when creating a new payment URL; preserve pending transaction reuse |
| `backend/src/services/vnpay.service.js` | Include the server-owned mobile HTTP(S) callback in the signed payment request |
| `backend/.env.example` | Document optional mobile callback configuration |

The existing web return/IPN paths, transaction models, wallet rules and checkout schemas remain in use. This list describes this mobile task's edits; the repository already contained unrelated uncommitted work.

## Evidence

- [Home](evidence/home.png)
- [Product details](evidence/product.png)
- [Shared cart](evidence/cart.png)
- [Checkout](evidence/checkout.png)
- [Backend-verified payment](evidence/payment-verified.png)
- [Ready for pickup](evidence/ready-for-pickup.png)
- [Account](evidence/account.png)
- [The same order on the website](evidence/website-shared-order.png)

These screenshots contain disposable QA records. The runner cleans its accounts, products, batches, carts, orders, transactions, wallet entries, points, reviews, support, local notifications and activity records. It does not rewind shared order/member counters or alter unrelated customer records. No email or staff broadcast is sent by the test process.

## Remaining acceptance checks — not reported as passed

- Android/iOS physical-device execution, keyboard/safe-area behavior, OS back gestures, TalkBack/VoiceOver and measured native frame rate.
- Native SecureStore persistence across force-close/relaunch, storage-write failures and OS credential-store behavior. The browser preview intentionally uses memory-only credentials.
- A real merchant VNPay sandbox transaction from a development/standalone app, including custom-scheme OS return, browser dismissal, app termination/resume, reachable callback and registered IPN delivery. Automated callbacks use test signing keys and real backend verification; they are not live gateway transactions.
- SMTP inbox delivery and reset-email links on physical devices.
- Signed Android/iOS binaries, signing account configuration, store review and release deployment.
- Long-running device/offline stress tests and visual inspection with very large accessibility text.

No Android emulator/ADB or iOS simulator was available in this Windows environment. Compilation and browser viewport checks are useful evidence, but they do not substitute for these device acceptance checks. Use [mobile/README.md](../../mobile/README.md) for setup and the native payment acceptance sequence.

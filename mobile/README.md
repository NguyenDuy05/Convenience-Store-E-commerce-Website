# QUICK mobile

Native customer shopping app for the existing QUICK store. Uses Expo SDK 54, React Native 0.81.5, JavaScript, Expo Router, TanStack Query and the existing Express API. There is no second backend or database.

The current redesign is documented in [UI/UX delivery notes](../docs/mobile/UI_REDESIGN.md). This revision keeps Expo SDK 54 for the requested Expo Go emulator demo. Historical QA evidence is not a test result for this redesign.

## Run locally

Use Node 22.13+ and npm. Keep MongoDB and the existing backend running:

```powershell
cd backend
npm run dev
```

In another terminal:

```powershell
cd mobile
npm ci
Copy-Item .env.example .env
# Edit EXPO_PUBLIC_API_URL for the device you will use.
npm start
```

| Target | Example API URL |
| --- | --- |
| Android Studio emulator | `http://10.0.2.2:5000/api` |
| iOS simulator on macOS | `http://127.0.0.1:5000/api` |
| BlueStacks emulator | `http://YOUR_COMPUTER_LAN_IP:5000/api` |
| Physical phone on the same Wi-Fi | `http://YOUR_COMPUTER_LAN_IP:5000/api` |
| Browser preview | `http://127.0.0.1:5000/api` |
| Production build | `https://YOUR_BACKEND_DOMAIN/api` |

The phone must be able to reach the backend port. `localhost` on a phone refers to that phone. With no development environment override, the app first uses the Expo server host and falls back to the platform emulator address. Set an explicit LAN address for reliable device testing. An Expo tunnel exposes Metro, not your Express API.

Restart Expo after changing `.env`. All `EXPO_PUBLIC_*` values are embedded in the client bundle: include only the public API address. MongoDB, SMTP, JWT signing and VNPay secrets remain exclusively in `backend/.env`.

For browser preview, run `npm run web` on Expo's default port 8081. Ports 8081 and 8082 on localhost/127.0.0.1 are allowed by backend CORS in development only. The browser preview keeps its token in memory; reloading it intentionally logs out. Native tokens use Expo SecureStore.

If backend startup reports `EADDRINUSE:5000`, an existing process already owns that port. Reuse the running backend or inspect its PID before stopping anything:

```powershell
Get-NetTCPConnection -LocalPort 5000 -State Listen | Select-Object OwningProcess
```

## Native builds and VNPay

Browsing, email authentication, cart, profile and customer account features use Expo-compatible modules. Use an Expo Go version compatible with SDK 54; if your installed Expo Go targets a different SDK, use a development build. A development or standalone build is required to validate the app-owned `quickstore://` payment return. Expo Go does not own this scheme; its fallback is opening the payment browser and refreshing on return to the app.

With Expo/Apple/Android build credentials configured, use the supplied profiles:

```powershell
npx eas-cli@latest build --profile development --platform android
# After installing the development build:
npx expo start --dev-client

# Installable Android preview APK, with an HTTPS API configured:
npx eas-cli@latest build --profile preview --platform android
```

Use `--platform ios` with the corresponding Apple credentials. Set `EXPO_PUBLIC_API_URL` in the selected EAS environment before building. Review bundle identifiers in `app.json` for your signing accounts. No EAS project, binary signing, store submission or publication was performed by this task.

Payment sequence:

1. Review the backend checkout preview, pickup location, promotions and wallet amount.
2. Tap **Confirm pickup order**. The app saves an idempotency key and the exact reviewed payload in SecureStore before posting. A timeout retains that attempt; **Continue confirmation** retrieves/retries it safely.
3. Tap **Continue with VNPay**. The app requests the existing payment endpoint with `returnTo: "mobile"` in native builds and opens the permitted VNPay host in the system browser.
4. VNPay returns to the backend's HTTP(S) callback, which verifies the signature and applies the same payment processing as web/IPN.
5. The backend redirects to `quickstore://payment-result?orderId=...`. The app fetches the authenticated order again. URL parameters never mark an order paid.

Backend configuration for a phone or deployed build:

```dotenv
VNPAY_RETURN_URL=https://YOUR_BACKEND_DOMAIN/api/payments/vnpay/return
VNPAY_MOBILE_RETURN_URL=https://YOUR_BACKEND_DOMAIN/api/payments/vnpay/mobile-return
```

`VNPAY_MOBILE_RETURN_URL` is optional; it defaults to `/api/payments/vnpay/mobile-return` on the web callback origin. Configure a reachable callback and register the IPN URL with VNPay according to your merchant setup. Keep `/api/payments/vnpay/ipn` as the server notification endpoint. A phone cannot reach a callback pointing at your computer's `localhost`.

The existing web return remains supported. A pending payment first created on web is reused, including its original callback. Returning to the app or tapping **Check payment status** handles this case without creating another payment attempt. Browser dismissal does not cancel an order. Existing development mock payments retain the web callback and require manual return/refetch; they are not enabled in this app or in the existing backend configuration.

## Customer scope and business rules

- Five tabs: Home, Explore, Cart, Orders, Account; native detail/form routes under `src/app`.
- Shared accounts, catalog, cart, order records, profile, addresses, wallet, membership, reviews, support requests and notification receipts.
- Product discovery supports the backend's search and category filters, with pagination. Catalog promotion prices are estimates; checkout totals come from the server.
- One pickup store, using actual store data. Outside normal hours, the backend's preorder notice tells customers when preparation starts. A manually closed store can reject orders.
- Wallet funds are used first; VNPay pays the remainder. A fully covered order is paid from the wallet. No online cash, MoMo, delivery, top-up or withdrawal flows.
- Customers can cancel before staff preparation begins, with a required reason. Paid refunds go to the wallet. Staff perform preparation, **Done / ready for pickup**, and handover on the existing website.
- Points and tiers come from the existing membership rules; no invented redemption system.
- Product reviews use eligible completed orders. Store review permissions follow the existing endpoint. Hidden reviews are not editable.
- Notifications are an in-app inbox, with active-session refresh/polling. No native push delivery is claimed.
- Google native login is not shown because Android/iOS OAuth configuration is absent. Existing Google-linked customers may set a password through the existing password-reset flow and sign in with email.
- Reset emails currently link to the website. Users can finish there and sign in to mobile, or paste the link into the app's reset screen.

## Source layout

```text
src/app/           Expo Router tabs and thin route entries
src/features/      Auth, home, products, cart, checkout, payment, orders,
                   profile, addresses, wallet, membership, reviews,
                   support, promotions and notifications
src/components/    Native controls, feedback, product images and progress
src/context/       Session restoration, authentication and toast feedback
src/hooks/         Server queries, pagination and cart mutations
src/services/      Axios API client and native secure storage
src/theme/         QUICK colors, typography, spacing, radii, shadows and motion
src/utils/         Formatting, safe navigation and payment URL validation
assets/            QUICK storefront icon, product illustrations, Baloo 2 and Inter
tests/             Payment, quantity, navigation and parsing regression tests
```

Reanimated drives press feedback, cart badges, progress and skeletons. Gesture Handler provides swipe removal, with a visible remove button as an accessible alternative. Native screen transitions and image fades respect reduced motion. Product photos come from backend records; missing photos show an honest placeholder. No arbitrary images have been assigned to existing products.

## Verification

The UI redesign intentionally skips functional tests, emulator runs and exports at the user?s request. Only lint and the existing JavaScript/JSX parse/module-resolution check were run. Commands below are available for a later QA pass.

```powershell
npm run lint
npm run typecheck
npm test
npx expo-doctor
npm audit
npm run export
```

`typecheck` parses/resolves the JavaScript/JSX project through TypeScript with `allowJs`; it does not claim complete static typing of JavaScript API responses. Exports validate Android/iOS/web bundling, not native device execution. Configure a real HTTPS API for release exports; the QA export used a placeholder HTTPS domain solely to verify bundling.

The SDK 54 Router depends on a vulnerable old URI decoder. `package.json` overrides it to upstream `decode-uri-component@0.5.1`, and `scripts/patch-decode-uri.cjs` changes only the module export to CommonJS for `query-string@7`. The upstream decoding algorithm and license remain intact. The patch is explicit and repeatable through `npm ci`; review it before changing Router/decoder versions. Build-tool `glob`/`minimatch` overrides pin security fixes. Do not use `npm audit fix --force` to silently change Expo SDKs.

See the [coverage matrix](../docs/mobile/FEATURE_MATRIX.md), [executed QA report](../docs/mobile/REPORT.md), and [shared-database QA runner](../docs/mobile/check.cjs). The runner creates uniquely named QA records in the existing database, disables email/staff broadcasts in its own process, then removes only its records. It requires the local Expo preview on port 8082, the website on port 5173, MongoDB and Playwright/Edge. It never creates or drops a database. Order/member counters may contain gaps after cleanup; they are deliberately not rewound.

References: [Expo SDK 54](https://expo.dev/changelog/sdk-54), [Expo Router](https://docs.expo.dev/versions/v54.0.0/sdk/router/), [Expo WebBrowser](https://docs.expo.dev/versions/v54.0.0/sdk/webbrowser/).

# QUICK homepage implementation review — 9 November 2026

The homepage now connects discovery, real product shelves, product selection, cart review, confirmation, VNPay and store pickup in one continuous experience. The existing footer, authentication, checkout and order routes are retained.

## Implementation

- Full viewport hero with local Baloo 2 typography, storefront illustration, layered entry and scroll parallax.
- Two product shelf rows, category navigation and swipe/drag, search, sorting, stock/offer filters and load more. All product data comes from the existing API.
- Accessible product dialog refreshes details before allowing purchase, reuses AddToCart and QuantityStepper, and restores keyboard focus on close.
- A shared server-confirmed cart update event refreshes the header count after add/update/remove; failed requests do not publish success.
- Five connected process illustrations explain selection, cart, confirmation, wallet/VNPay payment and pickup. They never submit orders or payments.
- Desktop uses one GSAP transformation timeline inside a CSS sticky stage. Mobile and reduced motion show each illustration in normal document flow. Lenis uses the GSAP ticker and forwards scroll updates to ScrollTrigger; it runs only on desktop fine-pointer devices. Route cleanup removes media handlers, observer, ticker callback, timelines and triggers. Implementation follows [Lenis integration guidance](https://github.com/darkroomengineering/lenis) and [GSAP matchMedia lifecycle guidance](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/).
- A ResizeObserver refreshes timeline geometry when shelf content changes. The route loading placeholder reserves viewport height to avoid moving the footer during lazy loading.

## Files changed in this task

| File | Purpose |
| --- | --- |
| `frontend/src/pages/guest/HomePage.jsx` | API orchestration, hero, shelves, selection and final CTA |
| `frontend/src/components/home/PickupJourney.jsx` | Five real-process explanatory scenes |
| `frontend/src/components/home/ProductStoreSection.jsx` | Reused shelves; swipe, animation cleanup, accessibility and two-row default |
| `frontend/src/components/home/ProductModal.jsx` | Native dialog, product refresh and existing purchase controls |
| `frontend/src/components/home/HomeHeader.jsx` | Actual cart count |
| `frontend/src/components/home/HomeParts.jsx` | Reserved image dimensions |
| `frontend/src/hooks/useSmoothScroll.js` | Single Lenis instance and responsive cleanup |
| `frontend/src/hooks/useHomeStoryAnimations.js` | Scoped GSAP timelines and layout refresh |
| `frontend/src/api/cart.api.js` | Publish successful cart mutations without changing API contracts |
| `frontend/src/utils/promoPrice.js` | Support public promotion DTO fields `categories` and `products` |
| `frontend/src/styles/pickup-home.css` | Homepage theme, native dialog and responsive scenes |
| `frontend/src/styles/home.css` | Cart count and compact 320px header |
| `frontend/src/routes/AppRouter.jsx` | Reserve space while homepage loads |

New files: `frontend/public/fonts/baloo-2-variable.ttf`, its `LICENSE-baloo-2.txt`, `docs/homepage-check.cjs`, and evidence/report files in this directory. No npm dependencies were added. No backend, schema, Staff or Admin changes were needed.

Reused components/utilities: ProductStoreSection, Media, Icon, ProductSearchInput, AddToCart, QuantityStepper, estimatePromo, formatCurrency, existing API modules, AuthContext and StorefrontShell/footer.

## Executed validation

The final functional run passed **20/20 checks** in headless Microsoft Edge. See [machine-readable results](results.json) and [reproducible runner](../homepage-check.cjs). The runner copies the public catalog into a disposable test database, uses real Express routes and MongoDB writes for authentication/cart validation, then removes that database. It does not alter the application database.

Validated: category changes including rapid switching; search/reset; price sorting and promotions; guest login return; dialog focus/Escape; actual add quantity 2 and cart count; stock race rejection without false success; out-of-stock control; existing cart update/removal; expanding shelves; all story scenes including direct jumps/reverse scroll; repeated SPA animation cleanup; widths 320/390/768/1024/1440; touch swipe and vertical scroll; reduced motion; catalog failure/retry/empty; zero runtime exceptions and zero scroll-initiated orders/payments.

`npm.cmd run build` passed. Existing shared application bundle still exceeds Vite's 500 kB warning threshold. Scoped whitespace checks passed. After the functional run, the loading placeholder was adjusted and a fresh load/performance check verified that adjustment.

Local desktop sampling after the loading placeholder fix: initial layout shift **0.00085**, median frame interval **5.6 ms**, p95 **16.6 ms**, 119 intervals. [Raw measurement](performance.json). This is a short headless desktop sample, not a performance guarantee for physical mobile devices.

Screenshots: [hero](desktop-hero.png), [real cart success](real-cart-success.png), [VNPay explanatory scene](payment-story.png), [mobile shelves](mobile-shelves.png).

## Findings fixed

- Public promotion DTO names did not match the existing client price helper, omitting category/product discounts.
- Separate competing scene timelines could leave multiple panels visible after a direct scroll jump; replaced with one master timeline.
- Dialog keyboard wrapping and opener restoration needed explicit handling.
- The authenticated header overflowed at 320px; compact branding preserves all actions.
- Shelf expansion required refreshing scroll geometry.
- Lazy-route loading moved the footer into and out of view; the new placeholder reserves height.

## Intentional limits

- No branch selector: the existing checkout supports one store. The scene displays that actual store.
- No mascot asset exists in the available public assets. No substitute mascot was generated.
- The current public catalog has no product photos assigned. Existing icon placeholders remain; assigning product images in Admin makes the same real image data appear here.
- No fly-to-cart effect; confirmed success feedback and the actual header count are used.
- No new payment processing: scenes are informational and actions lead to existing authenticated routes. No live VNPay transaction, Google OAuth, or email delivery was tested in this task.
- No physical Android/iOS hardware benchmark was performed. The catalog currently loads all pages; a very large future catalog should use server-side shelf pagination/search.

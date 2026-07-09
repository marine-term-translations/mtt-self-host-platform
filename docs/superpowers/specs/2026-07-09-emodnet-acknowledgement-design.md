# Design Spec: EMODnet Sponsorship Acknowledgment

This document specifies the integration of the EMODnet sponsorship acknowledgment and logo within the Marine Term Translations (MTT) self-hosted platform.

## Goal Description

Acknowledge EMODnet for sponsoring this project by showing their logo and a description on the "About the Project" page, and presenting a "Sponsored by [EMODnet Logo]" badge in the site's global footer.

## Proposed Changes

### Assets

#### [NEW] [emodnet-logo.png](file:///data/projects/mtt-self-host-platform/frontend/public/emodnet-logo.png)
- Downloaded from: `https://emodnet.ec.europa.eu/sites/emodnet.ec.europa.eu/files/public/emodnet_logos/web/EMODnet_standard_colour.png`
- Location: Saved directly in the `/frontend/public/` folder.

---

### Component & Page Changes

#### [MODIFY] [About.tsx](file:///data/projects/mtt-self-host-platform/frontend/pages/About.tsx)
- Add a card inside the `Partners & Sponsors` section.
- **Card Content**:
  - Image: `/emodnet-logo.png` (styled with a max height/width for card display).
  - Title Link: `EMODnet` pointing to `https://emodnet.ec.europa.eu/` target="_blank".
  - Description: "This project is sponsored by EMODnet (European Marine Observation and Data Network), supporting the development of this platform to facilitate the internationalization and harmonization of marine science vocabularies."
  - Styling: Consistent with existing partner cards. To keep the grid balanced, we will adjust the layout of the Partners & Sponsors container (e.g., matching height, proper grid row span or flex wrap).

#### [MODIFY] [Layout.tsx](file:///data/projects/mtt-self-host-platform/frontend/components/Layout.tsx)
- Integrate a "Sponsored by" section in the footer.
- **Footer Section**:
  - Position: Next to or aligned with the main branding/copyright area.
  - Image: EMODnet logo wrapped in an anchor linking to `https://emodnet.ec.europa.eu/`.
  - Styling:
    - Label text: "Sponsored by" (small, muted text: `text-xs text-slate-500 dark:text-slate-400`).
    - Logo image: Styled to a maximum height (e.g., `h-6` or `h-7`) to match the vertical footprint of the footer elements.
    - Dark mode consideration: Ensure the EMODnet standard logo colors are readable on dark backgrounds (e.g., by wrapping the logo in a white background with rounded border when dark mode is enabled, or applying a light background generally for the logo badge).

---

## Verification Plan

### Automated Checks
- Run TypeScript compilation checks on the frontend (`npm run build` or `npx tsc`).

### Manual Verification
- Deploy/start the development server.
- Verify the About page `/about` displays the new card correctly.
- Verify the global footer displays the EMODnet logo and "Sponsored by" text on both light and dark modes.
- Verify that both logo links redirect to `https://emodnet.ec.europa.eu/` in a new browser tab.

# EMODnet / MTT Infographic & Illustration Style Guide

This style guide captures the visual aesthetic of the National Oceanography Centre (NOC) poster, adapted for the Marine Term Translations (MTT) platform. Use these rules to generate and maintain cohesive, premium visual assets.

---

## 🎨 Color Palette
The illustration system uses the site's primary colors, layered to mimic ocean depth, with amber/yellow warnings or assets providing focal contrast.

| Layer | Hex Code | Tailwind / HSL Equivalent | Description |
| :--- | :--- | :--- | :--- |
| **Abyssal/Deep Background** | `#090d16` to `#0b1a30` | `slate-950` / `slate-900` | Deep baseline shadows, vignette borders, outer container fills. |
| **Benthic/Pelagic Ocean** | `#0284c7` to `#0ea5e9` | `sky-600` / `sky-500` (Primary) | Mid-tones, water layers, primary vector currents, waves. |
| **Atmospheric Glow** | `#e0f2fe` to `#bae6fd` | `sky-100` / `sky-200` | Highlights, background bubbles, icebergs, light shafts. |
| **Active Target/Asset** | `#f59e0b` | `amber-500` (Accent) | Technical equipment, nodes, AUVs, warnings. |
| **Linework & Type** | `#ffffff` | `white` | Core text, foreground organisms (corals, jellyfish outlines). |

---

## 📐 Composition & Layout Guidelines
1. **Circular Vignette:** Enclose the primary graphic elements in organic, circular, or droplet-shaped wave contours. The background outside the vignette should bleed into the deep background (`#090d16`).
2. **Organic Layering:** Use overlapping flat vector shapes to create depth. Stack shapes from background (light skies/glaciers) to midground (marine life, submersibles) to foreground (text, framing waves).
3. **Fine Detail Linework:** Accent the borders with delicate, white-outlined vector drawings of marine ecosystems (e.g. anemone curves, jellyfish bells, coral branches).

---

## font-sans 🔠 Typography
- **Primary Overlay Text:** Use **Ultra-Bold, Condensed, Uppercase Sans-Serif typography** (e.g., *Impact*, *Oswald*, *Inter ExtraBold Condensed*).
- **Styling:** The overlay text should overlap or intersect the organic elements of the composition to bind the text to the illustration. Text is always flat white (`#ffffff`).
- **Secondary Labels:** Smaller metadata descriptions should use a clean, uppercase monospace font (*Fira Code* / *Courier*) with wide letter-spacing (`tracking-wider`).

---

## 🖼️ Graphic Generation Prompts
When prompting image models for new blog headers or illustrations, use the following template formula:

> **Prompt:** "A flat, premium vector graphic illustration of [FEATURE_THEME] in a circular ocean vignette. Sleek modern vector style with layered organic wave cutouts. Background: deep navy ocean `#0b1a30`. Midground: sky-blue `#0ea5e9` wave currents and a high-contrast amber `#f59e0b` [FEATURED_TECH_ITEM]. Foreground: delicate white vector outline drawings of [MARINE_LIFE]. White uppercase bold condensed text overlapping the center. Minimalist flat aesthetic, premium design, no photorealism."

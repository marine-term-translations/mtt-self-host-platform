# EMODnet Sponsorship Acknowledgment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add EMODnet sponsorship logo and acknowledgement text to the About page and the global footer.

**Architecture:** Download the official EMODnet logo and save it locally in the public assets folder. Update the Partners & Sponsors grid in `About.tsx` and the footer layout in `Layout.tsx` to reference this logo and render the acknowledgement with clean CSS styles.

**Tech Stack:** React, TailwindCSS, HTML5.

## Global Constraints
- Naming rules: Local logo file should be saved as `/frontend/public/emodnet-logo.png`.
- Styling: Ensure contrast of the EMODnet logo on dark backgrounds by applying a white background styling with padding and rounding.

---

### Task 1: Download EMODnet Logo

**Files:**
- Create: `frontend/public/emodnet-logo.png`

**Interfaces:**
- Produces: Local image asset `/emodnet-logo.png`

- [ ] **Step 1: Download the EMODnet logo from the official URL**

Run:
```bash
curl -L -o frontend/public/emodnet-logo.png https://emodnet.ec.europa.eu/sites/emodnet.ec.europa.eu/files/public/emodnet_logos/web/EMODnet_standard_colour.png
```

- [ ] **Step 2: Verify the logo file exists and has size greater than 0**

Run:
```bash
ls -l frontend/public/emodnet-logo.png
```
Expected: The file should exist and its size should be greater than 0 bytes.

- [ ] **Step 3: Commit the new asset**

Run:
```bash
git add frontend/public/emodnet-logo.png
git commit -m "assets: download emodnet logo to public directory"
```

---

### Task 2: Add EMODnet Sponsor Card to About Page

**Files:**
- Modify: `frontend/pages/About.tsx`

**Interfaces:**
- Consumes: `/emodnet-logo.png`

- [ ] **Step 1: Modify About.tsx to add the EMODnet card to the sponsors grid**

Modify `frontend/pages/About.tsx` by adding a card for EMODnet within the "Partners & Sponsors" list, and update the grid container layout to span 3 columns on larger screens so the 5 cards lay out cleanly.

Modify the grid container at line 196:
```diff
-              <div className="grid md:grid-cols-2 gap-6">
+              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
```

And insert the EMODnet card before the final grid closing tag:
```diff
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                          <a href="https://vocab.vliz.be/" target="_blank" rel="noopener noreferrer" className="text-marine-600 hover:text-marine-700 dark:text-marine-400 dark:hover:text-marine-300 hover:underline">
                              VLIZ Vocabulary Server
                          </a>
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                          A comprehensive vocabulary management tool that will leverage the multilingual translations created by this platform's community to enhance marine terminology accessibility.
                      </p>
                  </div>
+
+                 <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col justify-between h-full md:col-span-2 lg:col-span-1">
+                     <div>
+                         <div className="h-10 flex items-center mb-4">
+                             <img src="/emodnet-logo.png" alt="EMODnet Logo" className="max-h-full object-contain bg-white/90 dark:bg-white px-2 py-1 rounded" />
+                         </div>
+                         <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
+                             <a href="https://emodnet.ec.europa.eu/" target="_blank" rel="noopener noreferrer" className="text-marine-600 hover:text-marine-700 dark:text-marine-400 dark:hover:text-marine-300 hover:underline">
+                                 EMODnet
+                             </a>
+                         </h3>
+                         <p className="text-sm text-slate-600 dark:text-slate-400">
+                             This project is sponsored by EMODnet (European Marine Observation and Data Network), supporting the development of this platform to facilitate the internationalization and harmonization of marine science vocabularies.
+                         </p>
+                     </div>
+                 </div>
              </div>
```

- [ ] **Step 2: Verify the compilation build succeeds**

Run:
```bash
npm run build --prefix frontend
```
Expected: The TypeScript compilation and build finishes without errors.

- [ ] **Step 3: Commit the changes**

Run:
```bash
git add frontend/pages/About.tsx
git commit -m "feat: add emodnet card to partners section in about page"
```

---

### Task 3: Integrate EMODnet Acknowledgment to Global Footer

**Files:**
- Modify: `frontend/components/Layout.tsx`

**Interfaces:**
- Consumes: `/emodnet-logo.png`

- [ ] **Step 1: Modify Layout.tsx footer to render EMODnet logo and link**

Replace lines 322-332 in `frontend/components/Layout.tsx`:
```diff
-      {/* Footer - hidden on phone when authenticated */}
-      <footer className={`bg-slate-100 dark:bg-slate-955 border-t border-slate-200 dark:border-slate-800 ${isAuthenticated ? 'hidden md:block' : ''}`}>
-        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
-          <div className="flex items-center gap-2">
-            <img src="/mtt-logo.svg" alt="Marine Term Translations" className="w-5 h-5" />
-            <span className="font-semibold text-slate-700 dark:text-slate-300">Marine Term Translations</span>
-          </div>
-          <p className="text-sm text-slate-500 dark:text-slate-400 text-center md:text-right">
-            &copy; {format(parse(now()), 'YYYY')} Marine Term Translations. Data sourced from NERC Vocabulary Server.
-          </p>
-        </div>
-      </footer>
+      {/* Footer - hidden on phone when authenticated */}
+      <footer className={`bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 ${isAuthenticated ? 'hidden md:block' : ''}`}>
+        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
+          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
+            <div className="flex items-center gap-2">
+              <img src="/mtt-logo.svg" alt="Marine Term Translations" className="w-5 h-5" />
+              <span className="font-semibold text-slate-700 dark:text-slate-300">Marine Term Translations</span>
+            </div>
+            <div className="flex items-center gap-2 border-slate-300 dark:border-slate-800 sm:border-l sm:pl-6 py-1">
+              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sponsored by</span>
+              <a href="https://emodnet.ec.europa.eu/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
+                <img src="/emodnet-logo.png" alt="EMODnet" className="h-6 object-contain bg-white/90 dark:bg-white px-1.5 py-0.5 rounded" />
+              </a>
+            </div>
+          </div>
+          <p className="text-sm text-slate-500 dark:text-slate-400 text-center md:text-right">
+            &copy; {format(parse(now()), 'YYYY')} Marine Term Translations. Data sourced from NERC Vocabulary Server.
+          </p>
+        </div>
+      </footer>
```

- [ ] **Step 2: Verify the compilation build succeeds**

Run:
```bash
npm run build --prefix frontend
```
Expected: Build passes without errors.

- [ ] **Step 3: Commit the changes**

Run:
```bash
git add frontend/components/Layout.tsx
git commit -m "feat: add emodnet sponsorship acknowledgment to global footer"
```

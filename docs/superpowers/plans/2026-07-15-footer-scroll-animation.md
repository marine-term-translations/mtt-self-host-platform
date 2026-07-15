# Footer Scroll Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Animate the global footer to expand padding when scrolling to the end of the page, and retract when scrolling up.
**Architecture:** Use React state and a window scroll event listener in `Layout.tsx` to detect scroll end, and transition Tailwind padding classes.
**Tech Stack:** React, Tailwind CSS, Vitest, React Testing Library, JSDOM.

## Global Constraints
- Do not import Tailwind CSS direct dependencies in Javascript; use class names configured via the index.html CDN.
- All code changes must compile cleanly via `npm run build` or `npx tsc` in the frontend directory.
- All test runs must run cleanly with no unhandled warnings/errors.

---

### Task 1: Test Infrastructure Setup

**Files:**
- Modify: [package.json](file:///data/projects/mtt-self-host-platform/frontend/package.json)
- Modify: [vite.config.ts](file:///data/projects/mtt-self-host-platform/frontend/vite.config.ts)
- Create: [setup.ts](file:///data/projects/mtt-self-host-platform/frontend/src/test/setup.ts)

**Interfaces:**
- Produces: NPM test command `npm run test` using Vitest.

- [ ] **Step 1: Modify package.json to include Vitest dependencies and scripts**
  Add the following scripts and dependencies:
  ```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/react": "^14.2.1",
    "@types/node": "^22.14.0",
    "@vitejs/plugin-react": "^5.0.0",
    "jsdom": "^24.0.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.0",
    "vitest": "^1.3.1"
  }
  ```

- [ ] **Step 2: Create src/test/setup.ts**
  Create the setup file with:
  ```typescript
  import '@testing-library/jest-dom';
  ```

- [ ] **Step 3: Modify vite.config.ts to configure Vitest environment**
  Modify [vite.config.ts](file:///data/projects/mtt-self-host-platform/frontend/vite.config.ts) to define the `test` block.
  ```typescript
  import path from 'path';
  import { defineConfig, loadEnv } from 'vite';
  import react from '@vitejs/plugin-react';

  export default defineConfig(({ mode }) => {
      const env = loadEnv(mode, '.', '');
      return {
        server: {
          port: 3001,
          host: '0.0.0.0',
          proxy: {
            '/api': {
              target: 'http://localhost:5000',
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, '')
            }
          }
        },
        preview: {
          port: 4173,
          host: '0.0.0.0',
          allowedHosts: [
            'localhost',
            '127.0.0.1',
            'emobon-kb.web.vliz.be',
          ],
        },
        plugins: [react()],
        define: {
          'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
          'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
        },
        resolve: {
          alias: {
            '@': path.resolve(__dirname, '.'),
          }
        },
        // @ts-ignore
        test: {
          globals: true,
          environment: 'jsdom',
          setupFiles: './src/test/setup.ts',
        }
      };
  });
  ```

- [ ] **Step 4: Run npm install**
  Run `npm install` in [frontend/](file:///data/projects/mtt-self-host-platform/frontend) to install the dependencies.
  Command:
  ```bash
  npm install
  ```

- [ ] **Step 5: Verify the test script works**
  Run `npm run test` to verify Vitest boots (it should report "No test files found, exiting with code 1").
  Command:
  ```bash
  npm run test
  ```

- [ ] **Step 6: Commit changes**
  Command:
  ```bash
  git add package.json package-lock.json vite.config.ts src/test/setup.ts
  git commit -m "chore: setup Vitest testing framework for frontend"
  ```

---

### Task 2: Create Branch and Write Failing Test

**Files:**
- Create: [Layout.test.tsx](file:///data/projects/mtt-self-host-platform/frontend/components/Layout.test.tsx)

**Interfaces:**
- Consumes: `Layout` component from [Layout.tsx](file:///data/projects/mtt-self-host-platform/frontend/components/Layout.tsx)

- [ ] **Step 1: Create new git branch `fix/footer`**
  Command:
  ```bash
  git checkout -b fix/footer
  ```

- [ ] **Step 2: Create Layout.test.tsx with the failing test**
  Write a test that renders `Layout` and simulates scrolling to the bottom.
  ```tsx
  import React from 'react';
  import { render, fireEvent, screen } from '@testing-library/react';
  import { BrowserRouter } from 'react-router-dom';
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import Layout from './Layout';

  // Mock hooks and auth context
  vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
      user: null,
      isAuthenticated: false,
      logout: vi.fn(),
    }),
  }));

  describe('Layout Footer Scroll Behavior', () => {
    beforeEach(() => {
      // Mock window measurements
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });
      Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: 0 });
      Object.defineProperty(document.documentElement, 'scrollHeight', { writable: true, configurable: true, value: 2000 });
    });

    it('renders with standard py-8 padding initially and expands to py-16 at page end', async () => {
      render(
        <BrowserRouter>
          <Layout>
            <div style={{ height: '2000px' }}>Content</div>
          </Layout>
        </BrowserRouter>
      );

      const footerLogoContainer = screen.getByText('Marine Term Translations').closest('.max-w-7xl');
      expect(footerLogoContainer).toBeInTheDocument();
      
      // Verify initial state is py-8
      expect(footerLogoContainer).toHaveClass('py-8');
      expect(footerLogoContainer).not.toHaveClass('py-16');

      // Scroll to bottom: innerHeight (800) + scrollY (1200) = scrollHeight (2000)
      window.scrollY = 1200;
      fireEvent.scroll(window);

      // Verify state changes to py-16
      expect(footerLogoContainer).toHaveClass('py-16');
      expect(footerLogoContainer).not.toHaveClass('py-8');

      // Scroll back up
      window.scrollY = 500;
      fireEvent.scroll(window);

      // Verify state retracts back to py-8
      expect(footerLogoContainer).toHaveClass('py-8');
      expect(footerLogoContainer).not.toHaveClass('py-16');
    });
  });
  ```

- [ ] **Step 3: Run the test to watch it fail**
  Command:
  ```bash
  npm run test
  ```
  Expected: Fail with `toHaveClass("py-16")` not satisfied because footer padding is static.

- [ ] **Step 4: Commit the failing test**
  Command:
  ```bash
  git add frontend/components/Layout.test.tsx
  git commit -m "test: add failing layout footer scroll test"
  ```

---

### Task 3: Implement Scroll Animation

**Files:**
- Modify: [Layout.tsx](file:///data/projects/mtt-self-host-platform/frontend/components/Layout.tsx)

**Interfaces:**
- Consumes: Scroll position metrics from `window` and `document`
- Produces: Responding layout UI wrapper padding classes.

- [ ] **Step 1: Add isAtBottom state and scroll effect inside Layout.tsx**
  Add the scroll listener and dynamic class logic in [Layout.tsx](file:///data/projects/mtt-self-host-platform/frontend/components/Layout.tsx).
  Replace code around footer wrapper div:
  ```tsx
  // Add state at the top of Layout component:
  const [isAtBottom, setIsAtBottom] = useState(false);

  // Add scroll listener useEffect:
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      setIsAtBottom(windowHeight + scrollTop >= documentHeight - 10);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initialize state

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  ```
  Update footer container:
  ```tsx
  <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 transition-all duration-500 ease-in-out ${isAtBottom ? 'py-16' : 'py-8'}`}>
  ```

- [ ] **Step 2: Run test to watch it pass**
  Command:
  ```bash
  npm run test
  ```
  Expected: PASS

- [ ] **Step 3: Verify build compiles cleanly**
  Command:
  ```bash
  npm run build
  ```
  Expected: Successfully compiles without errors.

- [ ] **Step 4: Commit changes and complete implementation**
  Command:
  ```bash
  git add frontend/components/Layout.tsx
  git commit -m "feat: implement scroll-triggered footer padding transition"
  ```

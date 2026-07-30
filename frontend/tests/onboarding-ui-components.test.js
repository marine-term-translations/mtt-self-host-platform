import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
  console.log("Testing Onboarding UI scroll lock, auto-scroll, element interaction, and component requirements...");

  const tourPath = path.join(__dirname, '../components/onboarding/OnboardingTour.tsx');
  const backdropPath = path.join(__dirname, '../components/onboarding/TourBackdrop.tsx');
  const tooltipPath = path.join(__dirname, '../components/onboarding/TourTooltip.tsx');

  assert.ok(fs.existsSync(tourPath), "OnboardingTour.tsx must exist");
  assert.ok(fs.existsSync(backdropPath), "TourBackdrop.tsx must exist");
  assert.ok(fs.existsSync(tooltipPath), "TourTooltip.tsx must exist");

  const tourContent = fs.readFileSync(tourPath, 'utf8');

  // Verify body scroll locking
  assert.ok(tourContent.includes('overflow = \'hidden\''), "OnboardingTour must lock body scrolling with overflow = 'hidden'");
  // Verify auto-scrolling to element
  assert.ok(tourContent.includes('scrollIntoView'), "OnboardingTour must scroll element into view with scrollIntoView");
  // Verify interactive z-index elevation for target element
  assert.ok(tourContent.includes('zIndex') || tourContent.includes('pointer-events') || tourContent.includes('9992'), "OnboardingTour must elevate target element z-index for user interaction");

  const tooltipContent = fs.readFileSync(tooltipPath, 'utf8');

  // Verify Skip button is present on every step
  assert.ok(tooltipContent.includes('Skip Tutorial'), "Tooltip must render 'Skip Tutorial' button");
  // Verify step indicator (e.g. Step X of Y)
  assert.ok(tooltipContent.includes('Step'), "Tooltip must render step indicator");

  console.log("✓ Onboarding UI scroll lock, interaction, and auto-scroll test passed!");
}

try {
  run();
} catch (err) {
  console.error("Test Failure:", err.message);
  process.exit(1);
}

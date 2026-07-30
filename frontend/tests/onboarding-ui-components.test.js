import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
  console.log("Testing Onboarding UI components existence and requirements...");

  const tourPath = path.join(__dirname, '../components/onboarding/OnboardingTour.tsx');
  const backdropPath = path.join(__dirname, '../components/onboarding/TourBackdrop.tsx');
  const tooltipPath = path.join(__dirname, '../components/onboarding/TourTooltip.tsx');

  assert.ok(fs.existsSync(tourPath), "OnboardingTour.tsx must exist");
  assert.ok(fs.existsSync(backdropPath), "TourBackdrop.tsx must exist");
  assert.ok(fs.existsSync(tooltipPath), "TourTooltip.tsx must exist");

  const tooltipContent = fs.readFileSync(tooltipPath, 'utf8');

  // Verify Skip button is present on every step
  assert.ok(tooltipContent.includes('Skip Tutorial'), "Tooltip must render 'Skip Tutorial' button");
  // Verify step indicator (e.g. Step X of Y)
  assert.ok(tooltipContent.includes('Step'), "Tooltip must render step indicator");

  console.log("✓ Onboarding UI components test passed!");
}

try {
  run();
} catch (err) {
  console.error("Test Failure:", err.message);
  process.exit(1);
}

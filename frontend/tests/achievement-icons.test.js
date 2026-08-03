import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
  console.log("Running Achievement Icons TDD tests...");

  const achievementsDir = path.join(__dirname, '../public/achievements');
  const iconComponentPath = path.join(__dirname, '../components/AchievementIcon.tsx');

  // Test 1: Achievements public directory must exist
  assert.ok(
    fs.existsSync(achievementsDir),
    "frontend/public/achievements directory must exist."
  );

  // Test 2: Cartoon achievement images must exist in public/achievements
  const requiredImages = [
    'puffer_cartoon.jpg',
    'angler.jpg',
    'turtle.jpg',
    'stingray.jpg',
    'seahorse.jpg'
  ];

  for (const imgName of requiredImages) {
    const imgPath = path.join(achievementsDir, imgName);
    assert.ok(
      fs.existsSync(imgPath),
      `Achievement image frontend/public/achievements/${imgName} must exist.`
    );
  }

  // Test 3: AchievementIcon.tsx must reference the new cartoon images for each achievement
  const componentContent = fs.readFileSync(iconComponentPath, 'utf8');

  // Pufferfish Pride must use the new cartoon pufferfish image, not the old realistic /puffer.png
  assert.ok(
    componentContent.includes('/achievements/puffer_cartoon.jpg'),
    "AchievementIcon.tsx must reference /achievements/puffer_cartoon.jpg for streak_puffer achievement."
  );
  assert.strictEqual(
    componentContent.includes('src="/puffer.png"'),
    false,
    "AchievementIcon.tsx must NOT reference the old realistic /puffer.png for streak_puffer achievement."
  );

  // Deep Sea Translator (Anglerfish)
  assert.ok(
    componentContent.includes('/achievements/angler.jpg'),
    "AchievementIcon.tsx must reference /achievements/angler.jpg for translation_angler achievement."
  );

  // Coral Conservator (Turtle)
  assert.ok(
    componentContent.includes('/achievements/turtle.jpg'),
    "AchievementIcon.tsx must reference /achievements/turtle.jpg for review_turtle achievement."
  );

  // Tidal Wave (Stingray)
  assert.ok(
    componentContent.includes('/achievements/stingray.jpg'),
    "AchievementIcon.tsx must reference /achievements/stingray.jpg for reputation_stingray achievement."
  );

  // Goal Getter (Seahorse)
  assert.ok(
    componentContent.includes('/achievements/seahorse.jpg'),
    "AchievementIcon.tsx must reference /achievements/seahorse.jpg for goal_seahorse achievement."
  );

  console.log("All Achievement Icons TDD tests passed successfully!");
}

try {
  run();
} catch (err) {
  console.error("Test failure (Expected in RED phase):", err.message);
  process.exit(1);
}

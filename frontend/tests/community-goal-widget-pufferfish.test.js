import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
  console.log("Running CommunityGoalWidget Pufferfish TDD tests...");

  const widgetPath = path.join(__dirname, '../components/CommunityGoalWidget.tsx');
  const widgetContent = fs.readFileSync(widgetPath, 'utf8');

  // Test 1: Eyes & Body movement on mouse hover must be removed/disabled
  const hasMouseTargetYaw = widgetContent.includes('targetYaw') || widgetContent.includes('targetPitch');
  const hasPupilYawOffset = widgetContent.includes('pupilYawOffset') || widgetContent.includes('pupilPitchOffset');

  assert.strictEqual(
    hasMouseTargetYaw,
    false,
    "CommunityGoalWidget.tsx must NOT calculate targetYaw/targetPitch body rotation on mouse movement/hover."
  );
  assert.strictEqual(
    hasPupilYawOffset,
    false,
    "CommunityGoalWidget.tsx must NOT calculate pupil/eye tracking offsets on mouse movement/hover."
  );

  // Test 2: Must implement 1-second (1000ms) mouse idle detection when goals are not open (isMinimized)
  assert.ok(
    widgetContent.includes('1000') && widgetContent.includes('isMinimized'),
    "CommunityGoalWidget.tsx must set a 1-second (1000ms) timer when goals are not open (isMinimized)."
  );

  // Test 3: Must trigger puff-up event (emitEvent) on Spline object when mouse is idle for 1 second
  assert.ok(
    widgetContent.includes('emitEvent') && (widgetContent.includes('mouseDown') || widgetContent.includes('click')),
    "CommunityGoalWidget.tsx must call splineApp.emitEvent to puff up the fish when idle."
  );

  // Test 4: Must implement growing/puffing scale state (isPuffed) so the pufferfish visibly grows
  assert.ok(
    widgetContent.includes('isPuffed'),
    "CommunityGoalWidget.tsx must implement isPuffed state to grow the pufferfish when idle."
  );

  // Test 5: Must NOT mutate individual sub-mesh scales (fishObject.scale.x = ...) which causes eyes and fins to detach, but scale container as a unified whole
  const hasIndividualMeshScaleMutation = widgetContent.includes('fishObject.scale.x');
  assert.strictEqual(
    hasIndividualMeshScaleMutation,
    false,
    "CommunityGoalWidget.tsx must NOT mutate fishObject.scale.x individually as it detaches eyes and fins. Use root container scaling instead."
  );

  console.log("All CommunityGoalWidget Pufferfish TDD tests passed successfully!");
}

try {
  run();
} catch (err) {
  console.error("Test failure (Expected in RED phase):", err.message);
  process.exit(1);
}

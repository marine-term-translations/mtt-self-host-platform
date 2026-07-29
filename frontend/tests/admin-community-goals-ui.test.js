import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
  console.log("Running Admin Community Goals UI Filter & Pagination Tests (TDD)...");

  const pagePath = path.join(__dirname, '../pages/admin/AdminCommunityGoals.tsx');
  const pageContent = fs.readFileSync(pagePath, 'utf8');

  // Test 1: Page contains Search input state
  assert.ok(pageContent.includes('searchQuery') || pageContent.includes('searchTerm'), "AdminCommunityGoals.tsx must implement search query state.");

  // Test 2: Page contains Filter dropdowns for type, language, status, and collection
  assert.ok(pageContent.includes('selectedType') || pageContent.includes('filterType'), "AdminCommunityGoals.tsx must implement Goal Type filter state.");
  assert.ok(pageContent.includes('selectedLanguage') || pageContent.includes('filterLanguage'), "AdminCommunityGoals.tsx must implement Language filter state.");
  assert.ok(pageContent.includes('selectedStatus') || pageContent.includes('filterStatus'), "AdminCommunityGoals.tsx must implement Status filter state.");
  assert.ok(pageContent.includes('selectedCollection') || pageContent.includes('filterCollection'), "AdminCommunityGoals.tsx must implement Collection filter state.");

  // Test 3: Page contains Pagination controls (currentPage & itemsPerPage)
  assert.ok(pageContent.includes('currentPage'), "AdminCommunityGoals.tsx must implement currentPage pagination state.");
  assert.ok(pageContent.includes('itemsPerPage') || pageContent.includes('PAGE_SIZE'), "AdminCommunityGoals.tsx must define itemsPerPage / PAGE_SIZE.");

  // Test 4: Page contains Modal Dialog for Create / Edit Goal
  assert.ok(pageContent.includes('fixed inset-0') || pageContent.includes('z-50') && pageContent.includes('modal'), "AdminCommunityGoals.tsx must render Create/Edit form inside a modal container.");

  // Test 5: Summary KPI Cards present
  assert.ok(pageContent.includes('Total Goals') || pageContent.includes('Active Goals'), "AdminCommunityGoals.tsx must render top summary metric cards.");

  console.log("All Admin Community Goals UI tests passed successfully!");
}

try {
  run();
} catch (err) {
  console.error("Test failure (Expected in RED phase):", err.message);
  process.exit(1);
}

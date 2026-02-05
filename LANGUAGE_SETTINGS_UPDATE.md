# Language Settings UI Update

## Summary

Updated the user settings page to provide a more intuitive and powerful language management interface. The new design allows users to:
1. Add languages via a searchable modal dialog
2. Reorder languages to set preferences
3. Automatically designate the first language as native

## Changes Made

### UI Components

#### 1. **Plus Button to Add Languages**
- Replaced checkbox grid with a streamlined "+ Add Language" button
- Opens a modal dialog when clicked
- Only shows languages not already selected

#### 2. **Searchable Language Selector**
- Modal dialog with search input at the top
- Real-time filtering as user types
- Searches across:
  - Language name (English)
  - Native name
  - Language code
- Clean, accessible interface with keyboard support

#### 3. **Ordered Language List with Reordering**
- Each selected language displayed as a card with:
  - Up/Down chevron buttons for reordering
  - Language name in both English and native script
  - "Native" badge for the first language
  - "Preference #N" badge for subsequent languages
  - Remove button (X icon) to delete from list
- Visual feedback with hover states
- Disabled states for boundary conditions (can't move first item up, etc.)

### Data Model Changes

#### Before
- `nativeLanguage`: String - separate field for native language
- `translationLanguages`: Array - separate list of translation languages

#### After
- `orderedLanguages`: Array - unified ordered list where:
  - **Index 0** = Native language
  - **Index 1+** = Translation language preferences in priority order
- `preferredLanguages`: Array - sent to backend with full ordered list

### API Integration

#### Request Format (POST /api/user/preferences)
```json
{
  "nativeLanguage": "en",           // First language in ordered list
  "translationLanguages": ["en", "fr", "de", "es"],  // ALL languages (including native)
  "preferredLanguages": ["en", "fr", "de", "es"]  // Complete ordered list
}
```

**Note:** All selected languages are saved as translatable languages, including the native language. This allows users to translate into their native language as well.

#### Backward Compatibility
- Loads from `preferredLanguages` if available (new format)
- Falls back to `nativeLanguage` + `translationLanguages` (legacy format)
- Ensures smooth migration for existing users

## User Flow

### Adding a Language
1. Click "+ Add Language" button
2. Search/browse available languages in modal
3. Click desired language to add
4. Language appears at bottom of list
5. Modal closes automatically

### Reordering Languages
1. Use ↑ (up) and ↓ (down) buttons on each language card
2. First language is always marked as "Native"
3. Subsequent languages show "Preference #1", "Preference #2", etc.
4. Changes trigger "unsaved changes" indicator

### Removing a Language
1. Click X button on language card
2. Language is removed from list
3. Other languages maintain their order

### Saving Changes
1. Save button enables when changes are made
2. Click "Save Preferences" to persist
3. Success toast notification appears
4. Unsaved changes indicator disappears

## Technical Details

### Component State
- `orderedLanguages: string[]` - Array of language codes in priority order
- `showAddLanguageModal: boolean` - Controls modal visibility
- `searchQuery: string` - Filter text for language search
- `availableLanguages: Language[]` - All languages from `/api/languages`
- `isLoadingLanguages: boolean` - Loading state
- `isSaving: boolean` - Save operation state
- `hasUnsavedChanges: boolean` - Dirty state tracking

### Key Functions
- `handleAddLanguage(langCode)` - Adds language to end of list
- `handleRemoveLanguage(langCode)` - Removes language from list
- `handleMoveUp(index)` - Swaps with previous item
- `handleMoveDown(index)` - Swaps with next item
- `handleSave()` - Persists to backend
- `getLanguageName(code)` - Resolves code to display name
- `filteredLanguages` - Computed list for search results

### Styling
- Uses Tailwind CSS with dark mode support
- Marine blue (`marine-600`) as primary color
- Slate grays for neutrals
- Red for destructive actions (remove)
- Smooth transitions on all interactive elements
- Responsive design (works on mobile and desktop)

## Benefits

1. **Better UX**: More intuitive than checkbox grid
2. **Searchable**: Easy to find languages in long list
3. **Clear Priority**: Visual ordering shows preference hierarchy
4. **Flexible**: Easy to reorder as needs change
5. **Accessible**: Keyboard navigation, clear labels, proper ARIA attributes
6. **Performant**: Efficient filtering and updates
7. **Backward Compatible**: Works with existing data

## Files Modified

- `frontend/pages/Settings.tsx` - Complete UI overhaul
  - Added new icons: Plus, X, ChevronUp, ChevronDown, Search
  - New modal component for language selection
  - Reordering controls for language list
  - Updated save handler to send ordered list

## Testing Checklist

- [ ] Add a language via the plus button
- [ ] Search for languages in the modal
- [ ] Reorder languages using up/down buttons
- [ ] Remove a language
- [ ] Save changes and verify persistence
- [ ] Reload page and verify languages load correctly
- [ ] Test with existing user data (legacy format)
- [ ] Test with new user (no preferences set)
- [ ] Dark mode appearance
- [ ] Mobile responsive layout
- [ ] Keyboard navigation in modal
- [ ] Verify API sends correct data structure

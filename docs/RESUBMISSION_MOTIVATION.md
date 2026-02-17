# Resubmission Motivation Feature

## Overview

This feature addresses the issue reported by Marc Portier: when a translation is rejected, users can only resubmit without providing their own motivation or argument. This led to potential disputes where users couldn't negotiate or explain their reasoning.

The resubmission motivation feature allows users to:
1. Provide their own motivation/argument when resubmitting a rejected translation
2. Explain why they disagree with the rejection reason
3. Describe improvements made based on the feedback
4. Engage in constructive dialogue with reviewers

## How It Works

### For Translators (Rework Tasks)

When a translator's submission is rejected, they receive a "rework" task in the Translation Flow. This task displays:

1. **Rejection Notice** - Shows why the translation was rejected
2. **Previous Translation** - Displays the original submitted translation
3. **Translation History** - Shows all previous actions on this translation
4. **Improved Translation** - Textarea to enter the improved translation
5. **Your Response/Motivation (Optional)** - NEW: Textarea to provide motivation/argument

The motivation field is optional but recommended. Users can:
- Explain why they disagree with the rejection
- Describe what improvements were made
- Provide context or reasoning for their translation choices
- Reference sources or terminology standards

### For Reviewers (Review Tasks)

When reviewing a resubmitted translation, reviewers see:

1. **Proposed Translation** - The new translation submission
2. **Translator's Response/Motivation** - If provided, this appears in a highlighted blue box
3. **Translation History** - Shows all previous actions, including:
   - Rejection reasons from reviewers
   - Resubmission motivations from translators

This provides reviewers with:
- Context about the translator's reasoning
- Understanding of what changed and why
- Ability to make more informed decisions
- Reduced back-and-forth disputes

## Database Schema

### Migration: 025_resubmission_motivation.sql

Added a new column to the `translations` table:
```sql
ALTER TABLE translations ADD COLUMN resubmission_motivation TEXT;
```

This field stores the user's optional motivation when resubmitting after rejection.

## Implementation Details

### Backend Changes

1. **database schema** (`schema.sql`):
   - Added `resubmission_motivation TEXT` column to translations table

2. **flow.service.js**:
   - Updated `getRejectedTranslations()` to include `resubmission_motivation` in query

3. **terms.routes.js**:
   - Updated translation update logic to handle `resubmission_motivation`
   - Includes motivation in activity logging for history tracking
   - Dynamic SQL builder for cleaner, more maintainable code

### Frontend Changes

1. **FlowTermCard.tsx**:
   - Added state variable for `resubmissionMotivation`
   - Added textarea input in rework form
   - Pre-fills motivation if previously provided
   - Displays motivation in review tasks (blue highlighted box)
   - Shows motivation in translation history

2. **TranslationFlow.tsx**:
   - Updated `handleSubmitTranslation()` to accept and pass `resubmissionMotivation`
   - Includes motivation in translation payload

## User Experience

### Rework Flow
```
[Rejection Notice: "Incorrect terminology"]
  ↓
[Previous Translation: "zeevoedsel"]
  ↓
[Improved Translation: "zeebiota"]
  ↓
[Your Response/Motivation (Optional):
 "I've changed 'zeevoedsel' to 'zeebiota' because 
  according to the MarBEF glossary, 'biota' is the 
  more scientifically accurate term for marine life."]
  ↓
[Resubmit Translation]
```

### Review Flow
```
[Proposed Translation: "zeebiota"]
  ↓
[Translator's Response/Motivation:
 "I've changed 'zeevoedsel' to 'zeebiota' because..."]
  ↓
[Translation History]
  ↓
[Approve] or [Reject with reason]
```

## Benefits

1. **Reduced Disputes**: Users can explain their reasoning upfront
2. **Better Communication**: Clearer dialogue between translators and reviewers
3. **Learning Opportunity**: Reviewers can understand translator's perspective
4. **Quality Improvement**: More context leads to better decisions
5. **User Satisfaction**: Users feel heard and can negotiate/dispute

## Future Enhancements

Potential improvements:
- Character limits or formatting guidelines for motivations
- Ability to reply to specific motivations (threading)
- Analytics on dispute resolution rates
- Templates or suggestions for common motivations
- Automatic translation of motivations to reviewer's language

## Technical Notes

- The motivation field is optional (not required)
- Motivations are stored with translations, not as separate records
- History tracking includes motivations in the `extra` JSON field
- Motivations are preserved across status changes
- Frontend validation ensures reasonable content

## Testing

To test this feature:

1. As a translator:
   - Submit a translation
   - Have it rejected with a reason
   - Find the rework task in Translation Flow
   - Add a motivation when resubmitting

2. As a reviewer:
   - Review a resubmitted translation
   - Check if the motivation is displayed
   - Review the full history
   - Make a decision based on the context

## Support

For issues or questions about this feature, please refer to the original issue report or contact the development team.

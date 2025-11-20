# Quick Reference: Spacebar-Inspired Improvements

## TL;DR

Spacebar captures conversations and turns them into notes. Master List can learn from this by:
1. **Adding multiple input sources** (voice, email, transcripts)
2. **Distinguishing memories from tasks** (what happened vs. what to do)
3. **Auto-processing conversations** to extract tasks
4. **Preserving context** with rich metadata

## Key Improvements Summary

### 🎤 Input Sources
- **Voice Recording**: Speak tasks instead of typing
- **Email Integration**: Auto-capture from emails
- **Meeting Transcripts**: Extract tasks from conversations
- **URL/Web**: Extract context from web pages

### 💭 Memory Type
- **What it is**: Non-actionable items that preserve context
- **When to use**: "In the meeting, John said...", "Remember that...", "For context..."
- **Benefits**: Cleaner task list, better recall, preserved context

### 🤖 Enhanced AI
- **Conversation Parsing**: Extract multiple tasks from one conversation
- **Auto-Acceptance**: High-confidence tasks added automatically
- **Context Extraction**: Better understanding of "why" tasks exist

### 📎 Rich Content
- **Attachments**: Images, audio, documents
- **Source Tracking**: Know where each task came from
- **Links**: URL preview and context extraction

### 📅 Temporal Context
- **Occurred Date**: When something happened (for memories)
- **Due Date**: When to do it (for tasks)
- **Timeline View**: Visual timeline of life

## Implementation Priority

### Phase 1: Quick Wins (1-2 weeks)
1. ✅ Add Memory type to enum
2. ✅ Add occurredDate field
3. ✅ Enhance AI prompt for memory detection
4. ✅ Update UI to show memories differently

### Phase 2: Medium Impact (1 month)
1. Voice input with transcription
2. Email forwarding integration
3. Reference type for bookmarks/articles
4. Source tracking on tasks

### Phase 3: Advanced (2-3 months)
1. Meeting transcript import
2. Calendar integration
3. Rich attachments
4. Timeline view
5. Auto-acceptance based on confidence

## Code Changes Needed

### Types (`types.ts`)
```typescript
// Add to TaskType enum
Memory = 'Memory',
Reference = 'Reference',

// Add to Task interface
occurredDate?: string;
source?: Source;
participants?: string[];
context?: string;
linkedTasks?: string[];
```

### AI Service (`geminiService.ts`)
- Add memory detection to system prompt
- Extract occurredDate, participants, context
- Handle conversation parsing for multiple tasks

### Components
- **SmartInput**: Show memory-specific fields
- **TaskCard**: Display memories with purple border, no checkbox
- **FilterBar**: Add Memory filter option

## Example Use Cases

### Use Case 1: Meeting Follow-up
**Before**: Manually type each action item
**After**: Paste meeting transcript → AI extracts all tasks + creates memory of discussion

### Use Case 2: Voice Capture
**Before**: Stop what you're doing to type
**After**: Tap mic button, speak "Fix the sink", continue working

### Use Case 3: Email Tasks
**Before**: Copy/paste from email
**After**: Forward email → tasks auto-extracted with email context

### Use Case 4: Context Preservation
**Before**: Task says "Call client" but forget why
**After**: Memory linked to task: "In meeting, client requested callback about proposal"

## Questions to Answer

1. **Storage**: How to handle growing memory database?
2. **Privacy**: Consent for voice/email capture?
3. **UI**: Separate memory view or integrated?
4. **Automation**: How much auto-acceptance is too much?
5. **Search**: How to search memories effectively?

## Next Steps

1. **Review** the detailed analysis in `06-spacebar-analysis-and-improvements.md`
2. **Review** implementation example in `07-implementation-example-memory-type.md`
3. **Decide** which improvements to prioritize
4. **Prototype** one feature (suggest starting with Memory type)
5. **Test** with real users
6. **Iterate** based on feedback

## Related Documents

- `01-concepts.md` - Core philosophy (GTD, metadata structure)
- `05-views-and-filters.md` - Filter system (how views work)
- `06-spacebar-analysis-and-improvements.md` - Full analysis
- `07-implementation-example-memory-type.md` - Code examples

## Key Takeaways

1. **Spacebar's strength**: Effortless capture from conversations
2. **Master List's strength**: Rich metadata and context-aware filtering
3. **Combined power**: Capture from anywhere, organize intelligently, filter by context
4. **Philosophy alignment**: Both help "remember" - Spacebar remembers conversations, Master List remembers what to do

The goal is to make Master List the best of both worlds: effortless capture like Spacebar, with powerful organization and filtering that Master List already has.


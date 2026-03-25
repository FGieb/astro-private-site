# Project checklist

## New page checklist

### Design / style
- Use the same accent blue: `#0a74c9`
- Keep the same general look:
  - dark/glass cards
  - dark nav pill
  - system font stack:
    `system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
- Keep spacing, rounded corners, and soft blur/shadow in the same style as Home / Notes / Calendar

### Navigation
- Add the page to the shared top nav if relevant
- Keep nav styling consistent with the rest of the site

### If the page has text input
Ask:
- Is this a place where `@LM` or `@BM` should work?

If yes:
- In the backend save/update function:
  - import `extractMention` from `src/lib/mentions`
  - import `sendMentionNotification` from `netlify/functions/_shared/pushover.mjs`
  - detect mention in the relevant text field
  - if mention exists, send notification
- In the frontend save function:
  - read the JSON response
  - `console.log(...)` it while testing

### If the page has both create and update
Check both:
- create flow
- update flow

because mentions may need to work in both

### Data / backend
- Keep secrets only in Netlify env vars
- Never hardcode tokens/keys in code
- If using new Netlify env vars, redeploy after adding them

### Archive / daily-type features
- If the page depends on “today” being generated automatically, remember:
  - current archive has gaps because daily generation happens only when opened
  - long-term fix would be scheduled daily generation

### Current mention-enabled pages
- Home thoughts
- Notes
- Calendar event notes
- Bets notes on create
- Bets notes on update

## Possible future improvements
- Scheduled daily generation so archive has no gaps
- Optional author support later
- Highlight `@LM` / `@BM` visually in the UI
- Only notify when a mention is newly added, not when an old one remains in edited text
- Reuse mention support on any future page with meaningful text input

## HourForge Social Roadmap (Non‑Tech Plan)

This file is written for **you as the creator**, not for developers. It explains **what** we should build and **in what order** to turn HourForge into a social, never‑dying app.

---

## 1. Clear Vision

- **Core promise**: “Study with your friends, stay consistent, and actually feel proud of your progress.”
- **Not another noisy social app**: It should feel **calm, focused, and encouraging**, not like TikTok or Instagram.
- **Social but private**: You share **streaks, hours, and habits**, not your deepest personal notes.

If a future feature doesn’t help with these three points, we don’t build it.

---

## 2. Phase 1 – Strong Single‑Player Mode (Now)

Goal: Make the app so good **for one person alone** that they naturally want to show it to friends.

Already have a lot:
- Smart revision (2‑4‑7)
- Time tracking
- AI insights
- Exam countdowns

Polish to finish in this phase:
- **Frustration‑free logging** (we already started: smart times, quick durations, quick chips).
- **Zero data loss feeling**: backup + sync rock solid.
- **Beautiful, calm UI** on all screen sizes.

Only when this feels “smooth and satisfying” do we go heavy on social.

---

## 3. Phase 2 – Light Social Layer (Friends, Not Feed)

Think: **WhatsApp Status + Strava**, not full Facebook.

### 3.1. Profiles (simple first)
- Each user has:
  - Name, avatar, grade, main exam (already partly in profile).
  - Short “Study Goal” line (e.g. “Crack NEB Board with 85%+”).
- **Privacy**: By default, profiles are **friends‑only**, not public to everyone.

### 3.2. Friend System (by invite)
- Users can:
  - Generate a **share link**: `hourforge.app/invite/XYZ`.
  - Send it over WhatsApp, Messenger, etc.
  - When a new user opens the link and signs in, they automatically **become friends**.
- No “search everyone by name” at the start. Keep it **small and personal**.

### 3.3. Social Dashboard (what friends see)
Show **only high‑level stats**, for today / this week:
- Study streak (days in a row).
- Total hours today / this week.
- Top 1–2 subjects studied.
- A short “status” line the user writes manually (optional).

No detailed logs, no personal notes. Just enough to feel:
- “My friends are working, I should too.”
- “Nice, we are all grinding together.”

---

## 4. Phase 3 – Motivating Social Features (No Spam)

Once friend connections exist, we add **gentle** social features.

### 4.1. Study Circles
- Small private groups (2–6 people).
- Each circle has:
  - Name and simple goal (e.g. “Physics board prep circle”).
  - A shared mini dashboard: total hours, average streak, top subject.
- **No global chat at first**. Only:
  - Short messages like “Today’s target: 3 hours” or “I finished Optics”.
  - Maybe a few reaction emojis later.

### 4.2. Weekly Summary Card (Shareable)
- Auto‑generated **image card** once a week:
  - Hours studied.
  - Best streak.
  - Top subject.
- One button to **share this image** to:
  - WhatsApp Status.
  - Instagram Story.
  - Directly with friends.

This is how new users discover the app:
- “What is this HourForge thing you keep posting?”
- They scan a **QR code** or tap a link → install.

---

## 5. Phase 4 – Viral Loops (How It Spreads)

We want the app to grow in a **natural, healthy way** from school to school.

### 5.1. Invite Flow
- Everywhere in the app, small and friendly:
  - “Study with a friend? Invite them.”
- Tap → see:
  - Your invite link.
  - Your QR code.
  - A suggested text like:
    > “I’m using HourForge to track my study hours and revisions. Join my circle?”

### 5.2. Gentle Rewards
No gambling or casino feeling. Just soft rewards:
- “You and **3 friends** hit your goals this week. 🔥”
- “Your circle has been consistent for **4 weeks in a row**.”

No leaderboards of 10,000 people. Only **small groups** and **friends**.

---

## 6. Phase 5 – Deep Community (Later, Optional)

Once the basics are stable and people like the app, we can explore:

- **Mentor accounts**:
  - Teachers/tutors can see a summary of their students’ hours and streaks.
  - No access to personal notes, only aggregates.

- **Public “Study Rooms” (careful)**:
  - Time‑boxed rooms like “2‑hour Night Study Sprint”.
  - People join, start their focus timer together, and see:
    - “12 people studying Physics now”.
  - Must be heavily moderated and minimal to avoid toxicity.

These are **later** features, not for the first social release.

---

## 7. Product Rules (Never Break These)

To keep the app “never dying” and not annoying:

- **Rule 1: Study first, social second.**
  - If a feature makes people scroll more but study less → we don’t build it.

- **Rule 2: No noisy notifications.**
  - Only send:
    - “Your revision is due.”
    - “Your friend just hit a 7‑day streak” (very limited).

- **Rule 3: Users own their data.**
  - Clear export + delete options.
  - No selling data, no creepy tracking.

- **Rule 4: Small groups > Big feeds.**
  - Focus on real friends, classmates, study partners.

---

## 8. Technical Order (High‑Level Only)

This is just a rough tech sequence; details can be designed later:

1. **Reliable auth + profiles**
   - Keep Supabase auth.
   - Extend profile table for name, avatar URL, short bio/goal.

2. **Friends + invites**
   - New `friends` table (user A, user B, status).
   - Invite links → on open, connect accounts as friends.

3. **Social stats API**
   - Aggregate data per user:
     - Today’s hours, streak, top subjects.
   - Return **only safe, anonymized values** to friends.

4. **UI for friends list & social dashboard**
   - Simple list with:
     - Avatar, name.
     - Today’s hours.
     - Streak.

5. **Study circles**
   - `circles` table + `circle_members` table.
   - Basic summary UI inside the app.

6. **Shareable weekly card**
   - Server or client generates an image.
   - Share via native share dialog / download.

We can refine each step when we start building it.

---

## 9. How We’ll Know It’s Working

Simple signals:
- People **open the app daily**, even on light days.
- They **invite at least 1–2 friends** without being forced.
- Screenshots / weekly cards start appearing in:
  - WhatsApp Status.
  - Instagram Stories.
- Students say:
  - “I feel more consistent.”
  - “I study more because my friends are also showing their hours.”

If these are happening, the social direction is correct.


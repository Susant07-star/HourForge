# 🧠 Revision System (Spaced Repetition)

## 1. The 2-4-7 Method
HourForge is built on the scientifically proven **Spaced Repetition** technique. We use the **2-4-7 rule** to combat the "Forgetting Curve":
- **Baseline**: Initial study session (Day 0).
- **Revision 1**: 2 days after study.
- **Revision 2**: 4 days after first revision (6 days total).
- **Revision 3**: 7 days after second revision (13 days total).

## 2. Scheduling Logic
When a `StudySession` is created, the system triggers the `autoScheduleRevisions(sessionId, dateRead)` function:

```javascript
function autoScheduleRevisions(sessionId, dateRead) {
    const baseDate = new Date(dateRead);
    const day2 = new Date(baseDate.getTime() + 2 * 86400000);
    const day4 = new Date(baseDate.getTime() + 6 * 86400000);
    const day7 = new Date(baseDate.getTime() + 13 * 86400000);

    createRevisionTask(sessionId, 2, day2);
    createRevisionTask(sessionId, 4, day4);
    createRevisionTask(sessionId, 7, day7);
}
```

## 3. Revision Task Life Cycle
- **`pending`**: Task exists but the `due_date` has not yet arrived.
- **`due`**: `due_date` equals Today. Task appears in the "Revisions" tab.
- **`overdue`**: `due_date` is in the past and status is still `pending`. Card turns red.
- **`done`**: User taps "Complete Revision." `completed_at` is stamped, and the record is updated.

## 4. UI Implementation (Revisions Tab)
The **Revisions** tab is the "Morning Command Center." It is organized by urgency:

1. **🔥 Overdue (Red)**: Revisions missed on previous days. High priority.
2. **🔔 Due Today (Orange)**: Revisions currently needed for retention.
3. **⏳ Upcoming (Neutral)**: Revisions scheduled for tomorrow and beyond.

### 🎨 Visual Feedback:
- **Status Pills**: Mini status icons (`✅`, `⏳`, `🔴`) for every past session.
- **Progress Gauge**: A daily doughnut chart showing what percentage of due revisions were completed.

## 5. Blocking Logic
To ensure mastery, a student typically cannot complete Revision 2 until Revision 1 is marked `done`. This prevents "skipping" the forgetting curve.

---
*If a student skips a revision, their retention score on the AI Insights dashboard will drop.*

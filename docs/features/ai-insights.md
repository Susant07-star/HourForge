# 🤖 AI Insights (Groq Engine)

## 1. Overview
HourForge captures deep study data. The **Groq AI Engine** is responsible for turning this raw telemetry into a psychological "Performance Score" and a "Brutally Honest" feedback loop.

## 2. Double-Pass Logic
To ensure maximum accuracy, the AI insights flow is split into two distinct calls to the **llama-3.3-70b-versatile** model:

### Pass 1: Categorization (Data Processing)
- **Input**: Raw task strings and notes from `timeLogs` and `studySessions`.
- **Logic**: AI reads the text, ignores user-entered "Subject" tags (which are often wrong), and maps the activity to the closest "Actual Subject" (Physics, Math, Meditation, etc.).
- **Output**: A JSON object: `{"SubjectDist": {"Maths": 2, "Physics": 1.5, "Sleep": 7}}`.
- **Result**: This data is used to render the **Subject Distribution** Chart.

### Pass 2: Coaching (Psychological Feedback)
- **Input**: The categorizations from Pass 1 + user's study streaks + revision completion rates.
- **Logic**: The AI acts as a **Senior Mentor / Growth Coach**. It looks for red flags (sleep deprivation, subject neglect, context switching).
- **Output**: Text feedback and a numerical **Performance Rating** (/10).

## 3. NEW RULE: Short Feedback (v3.0+)
**Strict Guidance**: Users want to see insights at a glance, not read a paragraph.
- **Constraint**: All AI text responses MUST be limited to **1–2 punchy lines**.
- **Tone**: Brutally honest, direct, and authoritative.
- **Example**: 
  - *Bad*: "You have been studying a lot of Math recently, but I noticed your Chemistry revisions are overdue. You should try to balance your schedule better for a higher score on your exams."
  - *Good*: "⚠️ You're neglecting Chemistry. Fix your overdue revisions now or you'll forget everything by Monday. Your streak is at risk."

## 4. AI Performance Score
The AI assigns a **Performance Rating (0–10)** based on:
1. **Academic Consistency**: 4h+ study days.
2. **Revision Discipline**: Completion % of 2-4-7 tasks.
3. **Wellness Balance**: 7h+ Sleep entries.
4. **Focus Quality**: Session lengths/depth.

## 5. Cost-Efficient Design
- **Groq Cloud**: Provides sub-second inference.
- **Token Optimization**: Prompts are designed for minimal output (max 100 tokens).

---
*The AI is a "Real Mentor." It should feel like someone is watching the student's progress and holding them accountable.*

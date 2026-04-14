# 📄 Data Models

## 1. Overview
HourForge relies on a consistent data structure to ensure **Real-time Sync** and **AI Analysis** functions correctly. Every record MUST have a unique `uuid` and an `updated_at` (Unix epoch in ms).

## 2. Core Entities

### ⏱️ StudySession (The New Study Component)
The core record for the "Real-time Study Companion" flow.
```json
{
  "id": "uuid-v4",
  "user_id": "supabase-user-uuid",
  "subject": "Physics",
  "topic": "Newton's Laws",
  "start_time": "2026-03-27T10:00:00Z",
  "end_time": "2026-03-27T11:30:00Z",
  "duration": 1.5,
  "created_at": "ISO-TIMESTAMP",
  "updated_at": 1774635188002
}
```

### 📅 RevisionTask (Spaced Repetition)
Each `StudySession` automatically generates three `RevisionTask` objects (at 2, 4, and 7-day intervals).
```json
{
  "id": "uuid-v4",
  "session_id": "reference-study-session-uuid",
  "revision_day": 2, // 2nd, 4th, or 7th day
  "due_date": "YYYY-MM-DD",
  "status": "pending", // pending, done, missed
  "completed_at": "ISO-TIMESTAMP",
  "updated_at": 1774635188002
}
```

### 📜 TimeLog (Legacy / Manual Logging)
The old data model for manual productivity tracking. Still supported for historical data.
```json
{
  "id": "uuid-v4",
  "subject": "Maths",
  "task": "Integration problems",
  "date": "2026-03-27",
  "startTime": "HH:MM",
  "endTime": "HH:MM",
  "duration": 1.0,
  "notes": "Focused work on exercise 4.2",
  "updated_at": 1774635188002
}
```

## 3. Global Field Explanations

| Field Name | Type | Description |
| :--- | :--- | :--- |
| **`id`** | `String` (UUID) | Unique identifier for each record. Used for `id`-based merge conflict resolution. |
| **`updated_at`** | `Number` (ms) | Unix epic timestamp when the record was last modified. **REQUIRED** for sync. |
| **`duration`** | `Number` (Decimal) | Time in decimal hours (e.g., 1.5 = 1 hour 30 mins). |
| **`status`** | `String` (Enum) | Current state of a revision task: `pending`, `done`, or `missed`. |

## 4. Example Data Structure
This is the complete object shape stored in Supabase `user_data` table or LocalStorage:

```json
{
  "profile": { "name": "...", "grade": "...", "subjects": [] },
  "studySessions": [],
  "revisionTasks": [],
  "timeLogs": [],
  "aiRatingsHistory": []
}
```

---
*If you change the structure of these objects, you MUST update the AI Prompts and Sync Logic immediately.*

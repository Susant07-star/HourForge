# 🔌 Supabase Integration (Realtime Sync)

## 1. Overview
Supabase provides the **Auth**, **PostgreSQL Backend**, and **Realtime Sync** layers for HourForge. It allows for multi-device support through a single Google/Email login.

## 2. Authentication System
- **Provider**: Google OAuth (Primary) / Email (Secondary).
- **Session Duration**: 30 days (JWT-based).
- **Local Cache**: The access token is stored in `localStorage` for offline session persistence.

## 3. Database Schema (Required Tables)

### `users` (Managed by Supabase Auth)
- `id`: `uuid` (Primary Key).
- `email`: `text`.
- `created_at`: `timestamp`.

### `study_sessions` (NEW CORE - v3.0+)
Store real-time study data.
| Column | Type | Purpose |
| :--- | :--- | :--- |
| **`id`** | `uuid` (PK) | Unique session ID. |
| **`user_id`** | `uuid` (FK) | Reference to `auth.users`. |
| **`subject`** | `text` | Subject name (Physics, Maths, etc.). |
| **`topic`** | `text` | The specific topic studied. |
| **`start_time`** | `timestamp` | Start of the focused study session. |
| **`end_time`** | `timestamp` | End of the focused study session. |
| **`duration`** | `float` | Calculated duration in decimal hours. |
| **`created_at`** | `timestamp` | Record creation date. |
| **`updated_at`** | `bigint` | Unix epoch (ms). **CRITICAL for Sync.** |

### `revision_tasks` (v3.0+)
Store spaced repetition scheduling.
| Column | Type | Purpose |
| :--- | :--- | :--- |
| **`id`** | `uuid` (PK) | Unique task ID. |
| **`user_id`** | `uuid` (FK) | Reference to `auth.users`. |
| **`session_id`** | `uuid` (FK) | Reference to the original `study_sessions`. |
| **`revision_day`** | `int` | The day count (e.g., 2, 4, 7). |
| **`due_date`** | `date` | When the revision is expected. |
| **`status`** | `text` | `pending`, `done`, or `missed`. |
| **`updated_at`** | `bigint` | Unix epoch (ms). **CRITICAL for Sync.** |

### `time_logs` (Legacy/Backup)
Store historical manual logs.
| Column | Type | Purpose |
| :--- | :--- | :--- |
| **`id`** | `uuid` (PK) | Unique log ID. |
| **`user_id`** | `uuid` (FK) | Reference to `auth.users`. |
| **`subject`** | `text` | The subject logged. |
| **`task`** | `text` | What was done. |
| **`date`** | `date` | Date of activity. |
| **`duration`** | `float` | Duration in decimal hours. |
| **`updated_at`** | `bigint` | Unix epoch (ms). **CRITICAL for Sync.** |

## 4. Realtime Protocol
HourForge uses the **Postgres Changes** feature to enable "Live Sync."

- **Channel Initialization**: When the app starts, it subscribes to the `user_data` table for the specific `user_id`.
- **Latency Control**: Data is pushed on every local mutation (`upsert`).
- **Conflict Handling**: Handled via the **Deep Merge Strategy** in `script.js`, NOT at the database level.

## 5. Security (RLS Rules)
**Row Level Security (RLS)** is ENABLED on all tables:
- `SELECT`: Only if `auth.uid() = user_id`.
- `INSERT/UPDATE`: Only if `auth.uid() = user_id`.
- `DELETE`: Prohibited (use `is_deleted` soft-delete instead).

---
*The database is just a "Cloud Snapshot" of the local browser state. All critical merge logic happens on the client.*

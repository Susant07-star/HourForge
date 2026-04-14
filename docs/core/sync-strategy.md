# 🔄 Sync Strategy (Deep Merge)

## 1. Overview
HourForge uses a **"Latest Write Wins"** Deep Merge strategy. This is essential for an offline-first PWA where a user may study on a phone (offline) and then later log in on a laptop.

## 2. Core Pillars of Sync
For any piece of data to be synced across devices, it MUST follow these two rules:
1. **Unique Identity**: Every record (`studySession`, `timeLog`, `revisionTask`) must have a globally unique `id`. We use `crypto.randomUUID()` to generate these on the client side.
2. **Temporal Marker**: Every record must have an `updated_at` field (Unix epoch in milliseconds). This is updated on EVERY mutation (create, edit, delete).

## 3. The Deep Merge Algorithm
When local data and incoming cloud data are reconciled, the `deepMergeArrays()` function follows this logic:

```javascript
function deepMergeArrays(localArr, cloudArr) {
    const map = new Map();
    // 1. Add all local items to the map (indexed by id)
    for (const item of localArr) {
        if (item.id) map.set(item.id, item);
    }
    // 2. Iterate through all cloud items
    for (const item of cloudArr) {
        if (!item.id) continue;
        const localItem = map.get(item.id);
        if (!localItem) {
            // 3. New item from cloud (doesn't exist locally) -> Add it
            map.set(item.id, item);
        } else {
            // 4. Item exists in both -> Compare updated_at
            if (item.updated_at > localItem.updated_at) {
                // Cloud is newer -> Overwrite local
                map.set(item.id, item);
            }
            // 5. If they are equal, the first one in the map wins (usually local)
        }
    }
    return Array.from(map.values());
}
```

## 4. Conflict Resolution Examples

### Example A: New Record (No Conflict)
- **Local**: Empty array.
- **Cloud**: 1 record (`id: A`, `updated_at: 1000`).
- **Result**: Record A is added to the local store.

### Example B: Local Edit vs. Cloud Edit
- **Scenario**: User edits a session's topic on their phone at 12:00 PM (`updated_at: 1000`) and the same session on their laptop at 12:05 PM (`updated_at: 1300`).
- **Local (Phone)**: `updated_at: 1000`.
- **Cloud (from Laptop)**: `updated_at: 1300`.
- **Sync Result**: The laptop's version (at 1300) wins because its `updated_at` is higher.

### Example C: Offline Delay
- **Scenario**: User adds a session offline at 1:00 PM. Later, they sync a cloud backup from 12:00 PM.
- **Local**: `updated_at: 5000` (new record).
- **Cloud**: No record with that ID.
- **Sync Result**: The local record remains because it doesn't exist in the cloud yet. It will be pushed to the cloud in the next `uploadDataToCloud()` cycle.

## 5. Deletion Strategy (Tombstones)
Currently, a "True Deletion" (removing the object) can cause a sync-loop if the cloud still holds the record.
- **Rule**: Deletion should ideally be a "Soft Delete" (e.g., `is_deleted: true`) while updating the `updated_at` timestamp. This ensures the deletion propogates during the merge.

---
*Deep merge is the single most critical logic in HourForge. BREAKING THIS BREAKS EVERYTHING.*

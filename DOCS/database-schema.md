# Database Schema

## Overview
Database schemas are organized in `src/Database/` with separate files for each domain.

## Structure
```
src/Database/
├── client.ts          # Turso client & generateId()
├── index.ts           # Main entry point
└── schemas/
    ├── index.ts       # Schema exports
    ├── users.ts       # users & settings tables
    ├── tasks.ts       # tasks table
    ├── finance.ts     # finance table
    ├── notes.ts       # notes table
    ├── habits.ts      # habits table
    ├── inventory.ts   # inventory table
    └── study.ts       # study_chapters table
```

## Usage
```typescript
// Import client and helpers
import { db, generateId, initDatabase } from "@/Database";

// Or from legacy path (backwards compatible)
import { db, generateId, initDatabase } from "@/lib/turso";
```

## Tables

### users
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| name | TEXT | User's name |
| email | TEXT | Unique email |
| password_hash | TEXT | Hashed password |
| preferences | TEXT | JSON preferences |
| created_at | TEXT | Timestamp |

### settings
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| user_id | TEXT | Foreign key to users |
| theme | TEXT | 'light' or 'dark' |
| currency | TEXT | Currency code |
| language | TEXT | Language code |
| notifications_enabled | INTEGER | Boolean |
| monthly_budget | REAL | Budget amount |

### tasks
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| user_id | TEXT | Foreign key |
| title | TEXT | Task title |
| status | TEXT | todo/in-progress/done |
| priority | TEXT | low/medium/high |
| due_date | TEXT | Optional due date |
| created_at | TEXT | Timestamp |

### finance
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| user_id | TEXT | Foreign key |
| type | TEXT | income/expense |
| amount | REAL | Amount |
| category | TEXT | Category name |
| description | TEXT | Optional description |
| date | TEXT | Timestamp |

### notes
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| user_id | TEXT | Foreign key |
| title | TEXT | Note title |
| content | TEXT | Note content |
| tags | TEXT | Comma-separated tags |
| created_at | TEXT | Timestamp |

### habits
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| user_id | TEXT | Foreign key |
| habit_name | TEXT | Habit name |
| streak_count | INTEGER | Current streak |
| last_completed_date | TEXT | Last completion |

### inventory
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| user_id | TEXT | Foreign key |
| item_name | TEXT | Item name |
| cost | REAL | Optional cost |
| purchase_date | TEXT | Optional date |
| store | TEXT | Optional store name |

### study_chapters
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| user_id | TEXT | Foreign key |
| subject | TEXT | Subject name |
| chapter_name | TEXT | Chapter name |
| progress_percentage | INTEGER | 0-100 |
| status | TEXT | not-started/in-progress/completed |

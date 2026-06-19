# MedTrack — DB_INF2003_GRP23

Medical device tracking system built with **Express**, **MySQL**, and **MongoDB**.

---

## Project structure

```
DatabaseProj/
├── backend/
│   ├── config/
│   │   ├── mongodb.js        # MongoDB connection
│   │   └── mysql.js          # MySQL connection pool
│   ├── models/               # MongoDB document models
│   ├── routes/
│   │   ├── dashboard.js      # GET /api/dashboard
│   │   ├── devices.js        # CRUD /api/devices
│   │   ├── failures.js       # CRUD /api/failures
│   │   ├── logs.js           # GET  /api/logs
│   │   └── maintenance.js    # CRUD /api/maintenance
│   ├── utils/
│   │   ├── apiResponse.js    # Standardised response helpers
│   │   └── validation.js     # Input validators
│   ├── server.js             # Express entry point (port 3000)
│   └── package.json
├── database/
│   ├── cleaned/
│   │   └── cleaned_medtrack_dataset.csv   # 4,149 real device records
│   ├── nosql/
│   │   ├── collections.md    # MongoDB collection design
│   │   ├── aggregations.js   # MongoDB aggregation examples
│   │   └── nosql_crud.js     # MongoDB CRUD examples
│   ├── sql/
│   │   ├── schema.sql        # CREATE TABLE statements (run first)
│   │   ├── triggers.sql      # Risk-status trigger
│   │   ├── views.sql         # Reporting views
│   │   ├── indexes.sql       # Performance indexes
│   │   ├── advanced_queries.sql
│   │   └── seed.sql          # Small fictional dataset (dev only)
│   └── loader.js             # Real data loader (reads CSV → MySQL + MongoDB)
├── docs/
│   ├── dataset_summary.md
│   └── dataset_to_database_mapping.md
└── frontend/
    ├── index.html
    ├── dashboard.html
    ├── devices.html
    ├── failures.html
    ├── logs.html
    ├── css/styles.css
    └── js/
        ├── api.js
        ├── dashboard.js
        ├── devices.js
        ├── failures.js
        └── maintenance.js
```

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18+ |
| MySQL | 8.0+ |
| MongoDB | 6.0+ |

---

## Setup

### 1. Create the `.env` file

Create a `.env` file inside the `backend/` folder:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3308
MYSQL_USER=root
MYSQL_PASSWORD=Root123!
MYSQL_DATABASE=medtrack

MONGO_URI=mongodb://localhost:27017
MONGO_DB=medtrack_nosql

PORT=3000
```

> The `MYSQL_PORT` must match the port configured in `backend/config/mysql.js`.

### 2. Install dependencies

```bash
cd backend
npm install
```

### 3. Initialise the MySQL database

Run these SQL files in order against your MySQL instance:

```bash
mysql -u root -p < database/sql/schema.sql
mysql -u root -p < database/sql/triggers.sql
mysql -u root -p < database/sql/views.sql
mysql -u root -p < database/sql/indexes.sql
```

### 4. Load the real dataset

This loads all 4,149 device records from the CSV into MySQL and MongoDB:

```bash
cd backend
node ../database/loader.js
```

The loader inserts:
- 6 manufacturers and 6 device types (derived from the CSV)
- 8 technicians and 10 spare parts (static seed)
- 4,149 devices with deployment country, purchase date, age, and risk status
- One `failure_report` per device (failure count, downtime, severity)
- One `maintenance_record` per device (cost, frequency, assigned technician, parts used)
- `technician_notes` documents in MongoDB (free-text maintenance reports keyed by `device_code`)

> **Note:** Run `schema.sql` before the loader. Run the loader instead of `seed.sql` for real data. `seed.sql` is a small fictional dataset for local development only.

---

## Running the server

```bash
cd backend
npm run dev      # development (nodemon, auto-restart)
npm start        # production
```

Server starts at `http://localhost:3000`.

---

## API endpoints

| Method | Route | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/devices` | List all devices |
| GET | `/api/devices/:id` | Single device |
| GET | `/api/devices/high-risk` | Devices with High or Critical risk |
| GET | `/api/devices/manufacturers` | Manufacturer lookup list |
| GET | `/api/devices/device-types` | Device type lookup list |
| POST | `/api/devices` | Create device |
| PUT | `/api/devices/:id` | Update device |
| DELETE | `/api/devices/:id` | Delete device and its records |
| GET | `/api/failures` | List failure reports |
| POST | `/api/failures` | Create failure report |
| PUT | `/api/failures/:id` | Update failure report |
| DELETE | `/api/failures/:id` | Delete failure report |
| GET | `/api/maintenance` | List maintenance records |
| POST | `/api/maintenance` | Create maintenance record |
| PUT | `/api/maintenance/:id` | Update maintenance record |
| DELETE | `/api/maintenance/:id` | Delete maintenance record |
| GET | `/api/dashboard` | Dashboard summary stats |
| GET | `/api/logs` | MongoDB event logs |

---

## Database design

### MySQL (relational core)

Tables: `users`, `manufacturers`, `device_types`, `devices`, `technicians`, `failure_reports`, `maintenance_records`, `parts`, `maintenance_parts`

- `country` is stored on `devices` (deployment location), not on `manufacturers`
- A trigger on `failure_reports` automatically updates `devices.risk_status` based on `failure_event_count`

### MongoDB (operational data)

Collections: `technician_notes`, `device_event_logs`, `sensor_snapshots`, `alert_history`, `audit_logs`

- Documents reference `device_code` as a soft foreign key back to MySQL
- See `database/nosql/collections.md` for full schema and index design

---

## Team

Group 23 — INF2003 Database Systems

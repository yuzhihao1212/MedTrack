# MedTrack

MedTrack is a hybrid SQL and NoSQL database application developed for the INF2003 Database Systems project. The system supports medical device failure monitoring, maintenance tracking, dashboard analytics, and NoSQL document logging.

The project uses a real-world medical device failure dataset and demonstrates relational database modelling, SQL CRUD operations, NoSQL document storage, backend API integration, and frontend dashboard development.

---

## Project Overview

Healthcare facilities rely on medical devices such as CT scanners, MRI scanners, PET scanners, infusion pumps, defibrillators, and X-Ray machines. When these devices fail, they may cause downtime, increased maintenance cost, and operational disruption.

MedTrack aims to organise medical device records, track failure events, monitor maintenance information, identify high-risk devices, and provide maintenance-related insights through a hybrid database design.

The system uses:

* MySQL for structured relational data
* MongoDB for flexible NoSQL document records
* Node.js and Express.js for the backend API
* HTML, CSS, and JavaScript for the frontend interface

---

## Main Features

### 1. Dashboard Analytics

The dashboard displays key system statistics such as:

* Total medical devices
* Unresolved failures
* High-risk devices
* Completed maintenance records
* Average maintenance cost
* Failure summary by device type
* High-risk device list

The dashboard retrieves live values from the backend API and MySQL database.

---

### 2. Device Management

The Devices page supports MySQL CRUD operations for medical device records.

Users can:

* View medical device records
* Search devices
* Add new device records
* Edit existing device records
* Delete device records

Device information includes:

* Device code
* Device type
* Manufacturer
* Model
* Purchase date
* Device age
* Risk status

---

### 3. Failure Tracking

The Failures page supports CRUD operations for device failure reports.

Users can:

* View failure records
* Add new failure records
* Edit failure details
* Delete failure records
* Track failure event count
* Track downtime hours
* Monitor severity and report status

Failure records are linked to devices through relational database relationships.

---

### 4. Maintenance Tracking

The Maintenance page supports CRUD operations for maintenance records.

Users can:

* View maintenance records
* Add new maintenance records
* Edit maintenance details
* Delete maintenance records
* Track maintenance frequency
* Assign technicians
* Monitor repair status
* Track maintenance cost and priority

Maintenance records are stored in MySQL and linked to devices and technicians.

---

### 5. NoSQL Logs

The NoSQL Logs page demonstrates MongoDB document storage.

Users can:

* Add technician notes
* Add device event logs
* View technician notes
* View event logs
* Verify inserted NoSQL documents in MongoDB

MongoDB is used for flexible records that may not follow a strict relational schema, such as notes, logs, alerts, sensor snapshots, and audit records.

---

### 6. B+ Tree Indexing and OLAP Warehouse

MedTrack includes an additional database optimisation and analytics layer.

* MySQL/InnoDB B+ tree indexes support faster filtering, joins, sorting, and dashboard lookups.
* OLTP tables continue to support CRUD operations for devices, failures, and maintenance.
* OLAP warehouse tables use a star schema with fact and dimension tables for analytical reporting.
* The dashboard includes an OLAP section showing warehouse KPIs, maintenance cost bar charts, failure trend line graphs, a risk-priority matrix, and index coverage.

Main OLAP tables:

* `dw_dim_date`
* `dw_dim_device`
* `dw_dim_technician`
* `dw_fact_failure`
* `dw_fact_maintenance`

This allows B+ tree indexing and OLAP analytics to co-exist meaningfully: indexes speed up operational and warehouse queries, while the warehouse supports aggregated reporting.

**Roll-up (`database/sql/rollup_analysis.sql`, run after `olap_warehouse.sql`)**: `dw_maintenance_cost_rollup_view` and `dw_failure_rollup_view` use `GROUP BY ... WITH ROLLUP` to compute detail, subtotal, and grand-total rows in a single query (manufacturer → device type → grand total; year → quarter → grand total). Exposed via `GET /api/olap/maintenance-cost-rollup` and `GET /api/olap/failure-rollup`, and shown on the dashboard with subtotal/grand-total rows visually highlighted. Note: this MariaDB build doesn't support `GROUPING()`, and a compound `col IS NULL AND col2 IS NOT NULL` expression over rolled-up columns evaluates incorrectly here — so the detail/subtotal/grand-total classification is done in `backend/routes/olap.js`, not in SQL.

**Snowflake variant (`database/sql/snowflake_variant.sql`, run after `olap_warehouse.sql`)**: normalises the star schema's flattened `dw_dim_device` (which embeds `manufacturer_name`/`type_name` as text) into `dw_dim_manufacturer`, `dw_dim_device_type`, and `dw_dim_device_snowflake` (FK references instead of embedded text). `dw_dim_device_snowflake_view` reconstructs the same flattened shape via joins and is verified to return identical data to the star schema (0 mismatches across all rows). Exposed via `GET /api/olap/schema-comparison`, which also returns `EXPLAIN` plans showing the star schema resolves the query against 1 table vs. 3 for the snowflake join — shown side-by-side on the dashboard.

---

### 7. Authentication and Role-Based Access Control (RBAC)

MedTrack enforces access control at two independent layers:

**Application layer (JWT):** `POST /api/auth/login` verifies credentials against
the `users` table (bcrypt-hashed passwords) and issues a signed JWT carrying
the user's role. `backend/middleware/auth.js` provides `authenticate`
(validates the token) and `authorize(...roles)` (checks the role). All app
pages and data API routes require a login; write/delete routes also check
role privileges:

| Role | Read (GET) | Create / Update | Delete |
| --- | --- | --- | --- |
| *(no login)* | ❌ | ❌ | ❌ |
| `bme_analyst` | ✅ | ❌ | ❌ |
| `bme_engineer` | ✅ | ✅ | ❌ |
| `bme_manager` | ✅ | ✅ | ✅ |
| `bme_admin` | ✅ | ✅ | ✅ |

Unauthenticated users are redirected to the login page and cannot access
dashboard, device, failure, maintenance, log, or OLAP API data.

**Database layer (DCL):** `database/sql/roles_grants.sql` creates matching
MySQL/MariaDB roles (`medtrack_bme_analyst`, `medtrack_bme_engineer`,
`medtrack_bme_manager`, `medtrack_bme_admin`) with `GRANT`/`REVOKE`
privileges scoped table-by-table — e.g. `medtrack_bme_engineer` is never
granted any privilege on `users`, and
never granted `DELETE` anywhere. This is a standalone demonstration of DCL
and is not currently wired into the live connection pool (the app still
connects with the single `MYSQL_USER` from `.env`); see the comments at the
bottom of the script for how to point the app at one of these accounts.

Demo accounts (seeded by `database/sql/seed_users.sql`, dev only):

| Username | Password | Role |
| --- | --- | --- |
| `bme_admin01` | `BmeAdmin@123` | bme_admin |
| `bme_manager01` | `BmeManager@123` | bme_manager |
| `bme_engineer01` | `BmeEngineer@123` | bme_engineer |
| `bme_analyst01` | `BmeAnalyst@123` | bme_analyst |

---

## Dataset

The project uses the Medical Device Failure Dataset from Kaggle.

Dataset source:

```text
Medical Device Failure Dataset (Anonymized)
Kaggle
https://www.kaggle.com/datasets/antoinepierreno/medical-device-failure-dataset-anonymized
```

The dataset contains:

* 4,149 medical device records
* 6 device categories
* 6 manufacturers
* No missing values found during profiling

Device categories include:

* CT Scanner
* MRI Scanner
* PET Scanner
* X-Ray Machine
* Infusion Pump
* Defibrillator

Important dataset fields include:

* Device ID
* Device type
* Manufacturer
* Model
* Purchase date
* Maintenance cost
* Downtime
* Maintenance frequency
* Failure event count
* Maintenance class
* Maintenance report

---

## Data Cleaning and Preparation

The dataset was cleaned and prepared before database implementation.

Cleaning and preparation work included:

* Standardising column names
* Checking missing values
* Checking duplicate device IDs
* Reviewing maintenance cost anomalies
* Creating cleaned maintenance cost values
* Deriving risk status
* Deriving maintenance priority
* Creating dataset profile and summary files
* Mapping the flat dataset into relational and NoSQL structures

The cleaned dataset is used by the loader script to populate MySQL and MongoDB.

---

## Database Design

MedTrack uses a hybrid database architecture.

### MySQL Relational Database

MySQL stores structured data with clear relationships, primary keys, foreign keys, and constraints.

Main MySQL tables:

* users
* manufacturers
* device_types
* devices
* technicians
* failure_reports
* maintenance_records
* parts
* maintenance_parts

Main relationships include:

* One manufacturer can produce many devices
* One device type can apply to many devices
* One device can have many failure reports
* One device can have many maintenance records
* One technician can handle many maintenance records
* Maintenance records and parts have a many-to-many relationship through maintenance_parts

### MongoDB NoSQL Database

MongoDB stores flexible and semi-structured data.

Main MongoDB collections:

* technician_notes
* device_event_logs
* sensor_snapshots
* alert_history
* audit_logs

MongoDB is used for data such as technician observations, event messages, sensor-style snapshots, alert records, and system activity logs.

### B+ Tree Indexes

The SQL script `database/sql/indexes.sql` defines indexes used by the dashboard, CRUD pages, joins, and filters. The warehouse script also defines indexes for OLAP fact and dimension tables. In MySQL/InnoDB, normal primary and secondary indexes are implemented using B+ tree structures.

Examples include:

* `devices(risk_status, age_years)` for high-risk device filtering and ordering
* `failure_reports(report_status, severity)` for unresolved failure summaries
* `maintenance_records(repair_status, maintenance_priority, maintenance_cost)` for pending maintenance analytics
* Warehouse indexes on `dw_fact_failure`, `dw_fact_maintenance`, and dimension tables for OLAP joins and aggregations

The script `database/sql/btree_index_demo.sql` can be used to show index metadata and `EXPLAIN` plans.

### OLAP Warehouse

The script `database/sql/olap_warehouse.sql` builds a star-schema warehouse from the operational MySQL tables. It creates dimension tables for device, technician, and date data, plus fact tables for failures and maintenance. It also creates OLAP cube-style views for maintenance cost and failure analysis.

The backend exposes OLAP endpoints under:

```text
GET /api/olap/summary
GET /api/olap/maintenance-cost
GET /api/olap/failure-cube
GET /api/olap/failure-trend
GET /api/olap/risk-matrix
GET /api/olap/btree-indexes
GET /api/olap/maintenance-cost-rollup
GET /api/olap/failure-rollup
GET /api/olap/schema-comparison
```

---

## System Architecture

MedTrack follows a web-based system architecture.

```text
Frontend → Backend API → MySQL / MongoDB
```

The frontend provides user pages for dashboard analytics, device management, failure tracking, maintenance tracking, and NoSQL logs.

The backend is built using Node.js and Express.js. It handles API routing, validation, MySQL queries, MongoDB document operations, and responses to the frontend.

MySQL stores structured relational data, while MongoDB stores flexible document-based data.

---

## Technology Stack

| Layer               | Technology                         |
| ------------------- | ---------------------------------- |
| Frontend            | HTML, CSS, JavaScript              |
| Backend             | Node.js, Express.js                |
| Relational Database | MySQL                              |
| NoSQL Database      | MongoDB                            |
| Data Loading        | Node.js loader script              |
| API Testing         | Browser / Postman / Thunder Client |
| Version Control     | Git and GitHub                     |

---

## Project Folder Structure

```text
DB_INF2003_GRP23/
├── backend/
│   ├── config/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── server.js
│   └── package.json
│
├── database/
│   ├── raw/
│   ├── cleaned/
│   ├── analysis/
│   ├── sql/
│   ├── nosql/
│   └── loader.js
│
├── docs/
│   ├── erd.dbml
│   ├── dataset_summary.md
│   └── dataset_to_database_mapping.md
│
├── frontend/
│   ├── index.html
│   ├── dashboard.html
│   ├── devices.html
│   ├── failures.html
│   ├── maintenance.html
│   ├── logs.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── api.js
│       ├── dashboard.js
│       ├── devices.js
│       ├── failures.js
│       ├── maintenance.js
│       └── logs.js
│
├── README.md
├── package.json
└── .gitignore
```

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/kthgoat/DB_INF2003_GRP23.git
cd DB_INF2003_GRP23
```

---

### 2. Install root dependencies

```bash
npm install
```

These dependencies are used by the data loader.

---

### 3. Install backend dependencies

```bash
cd backend
npm install
cd ..
```

---

### 4. Create the environment file

Create a `.env` file in the project root and also ensure the backend can access its own `.env` file if needed.

Example `.env`:

```env
PORT=3000

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=medtrack

MONGODB_URI=mongodb://127.0.0.1:27017/medtrack_nosql
MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DB=medtrack_nosql

JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=8h
```

Generate a random `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

If your MySQL has a password, update:

```env
MYSQL_PASSWORD=your_password
```

Do not commit `.env` to GitHub.

---

### 5. Start MySQL and MongoDB

For macOS Homebrew users:

```bash
brew services start mysql
brew services start mongodb-community
```

Check services:

```bash
brew services list
```

---

### 6. Initialise the database

Run the initializer from the project root:

```bash
bash init-database.sh
```

The script creates the MySQL schema, applies the BME RBAC migration, seeds
the four default accounts, creates views/indexes/triggers, loads the cleaned
dataset into MySQL and MongoDB, then builds the OLAP warehouse.

If you only want the schema and default accounts without loading the CSV or
MongoDB data:

```bash
SKIP_DATA_LOAD=1 bash init-database.sh
```

Optional: apply the DB-level DCL roles/grants demonstration:

```bash
mysql -u root medtrack < database/sql/roles_grants.sql
```

---

### 7. Optional B+ tree index demonstration

```bash
mysql -u root medtrack < database/sql/btree_index_demo.sql
```

### 7b. Roll-up analysis and snowflake schema variant

```bash
mysql -u root medtrack < database/sql/rollup_analysis.sql
mysql -u root medtrack < database/sql/snowflake_variant.sql
```

Both must run after `olap_warehouse.sql` (they read from `dw_dim_device` / `dw_fact_maintenance` / `dw_fact_failure`). See section 6 above for what each adds.

After loading, verify the records:

```bash
mysql -u root -e "USE medtrack; SELECT COUNT(*) AS total_devices FROM devices;"
mysql -u root -e "USE medtrack; SELECT COUNT(*) AS total_failures FROM failure_reports;"
mysql -u root -e "USE medtrack; SELECT COUNT(*) AS total_maintenance FROM maintenance_records;"
```

Expected result:

```text
devices: 4149
failure_reports: 4149
maintenance_records: 4149
```

---

### 8. Start the backend server

```bash
cd backend
npm run dev
```

If that does not work:

```bash
npm start
```

---

### 9. Open the frontend

Open this in your browser:

```text
http://localhost:3000
```

or:

```text
http://localhost:3000/index.html
```

---

## API Routes

Main backend routes include:

```text
GET /api/health
GET /api/dashboard
GET /api/devices
GET /api/failures
GET /api/maintenance
GET /api/logs
GET /api/olap/summary
GET /api/olap/maintenance-cost
GET /api/olap/failure-cube
GET /api/olap/failure-trend
GET /api/olap/risk-matrix
GET /api/olap/btree-indexes
GET /api/olap/maintenance-cost-rollup
GET /api/olap/failure-rollup
GET /api/olap/schema-comparison
```

The frontend communicates with these API routes to retrieve and update system data. All data routes require an `Authorization: Bearer <token>` header from `/api/auth/login`. `POST`/`PUT`/`PATCH` routes require `bme_engineer`, `bme_manager`, or `bme_admin`; delete routes require `bme_manager` or `bme_admin` — see section 7 above.

---

## Testing Completed

The following tests have been completed successfully:

* MySQL service started successfully
* MongoDB service started successfully
* SQL schema created successfully
* MySQL tables created successfully
* Dataset loaded successfully into MySQL
* 4,149 device records loaded
* 4,149 failure records loaded
* 4,149 maintenance records loaded
* Dashboard displays real database values
* Devices page loads records from MySQL
* Failures page loads records from MySQL
* Maintenance page loads records from MySQL
* CRUD operations tested successfully
* NoSQL Logs page tested successfully
* Technician notes inserted into MongoDB
* Device event logs inserted into MongoDB
* MongoDB document insertion verified

---

## Current Project Status

Completed:

* Dataset selection
* Dataset cleaning and profiling
* SQL schema design
* ERD planning
* MySQL relational database implementation
* MongoDB collection design
* Backend API setup
* Frontend dashboard and CRUD pages
* MySQL CRUD testing
* MongoDB NoSQL insertion testing
* GitHub branch merge into main

Remaining work:

* Final UI polish if required
* Additional screenshots for report and presentation
* Final report writing
* Presentation slides
* Video demonstration
* Final testing on team members’ machines

---

## References

[1] Express.js. (n.d.). Express documentation. https://expressjs.com/

[2] MongoDB Inc. (n.d.). MongoDB documentation. https://www.mongodb.com/docs/

[3] OpenJS Foundation. (n.d.). Node.js documentation. https://nodejs.org/en/docs

[4] Oracle. (n.d.). MySQL documentation. https://dev.mysql.com/doc/

[5] Pierreno, A. (n.d.). Medical device failure dataset (anonymized) [Data set]. Kaggle. https://www.kaggle.com/datasets/antoinepierreno/medical-device-failure-dataset-anonymized

[6] Rahman, N. H. A., Mohamad Zaki, M. H., Hasikin, K., Abd Razak, N. A., Ibrahim, A. K., & Lai, K. W. (2023). Predicting medical device failure: A promise to reduce healthcare facilities cost through smart healthcare management. PeerJ Computer Science, 9, Article e1279. https://doi.org/10.7717/peerj-cs.1279

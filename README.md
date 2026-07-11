# MedTrack

MedTrack is a hybrid SQL and NoSQL database application for managing medical device records, failure reports, maintenance activity, dashboards, and document-based logs.

The project combines MySQL, MongoDB, Express.js, and a browser-based frontend to demonstrate a complete data-driven application workflow from storage to user interface.

## Stack

- Backend: Node.js + Express.js
- Database: MySQL and MongoDB
- Frontend: HTML, CSS, JavaScript
- Authentication: JWT-based login
- Data access: mysql2 and mongodb drivers

## Features

- Dashboard with key operational metrics
- Device management with full CRUD support
- Failure reporting and status tracking
- Maintenance records with technician assignment
- MongoDB-based notes and logs
- B+ tree indexing for faster database lookups
- OLAP warehouse and analytical reporting views

## Prerequisites

Make sure the following are installed locally:

- Node.js and npm
- MySQL
- MongoDB

## Environment Setup

Create a `.env` file in the project root with your local settings.

Example:

```env
PORT=3000

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3308
MYSQL_USER=root
MYSQL_PASSWORD=your_local_mysql_password
MYSQL_DATABASE=medtrack

MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DB=medtrack_nosql

JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=8h
```

Replace `MYSQL_PASSWORD` and the MongoDB values if your local setup is different.

## Database Setup

Run the project setup script from the project root:

```bash
bash init-database.sh
```

This script creates the schema, seeds the default accounts, builds the supporting views and indexes, loads the dataset, and prepares the database for the app.

If you only want the schema and default accounts without the full data load:

```bash
SKIP_DATA_LOAD=1 bash init-database.sh
```

Optional database role setup:

```bash
mysql -u root medtrack < database/sql/roles_grants.sql
```

## Running the App

Start the backend:

```bash
cd backend
npm install
npm run dev
```

If `npm run dev` is not available:

```bash
npm start
```

Then open the frontend in your browser:

```text
http://localhost:3000
```

## Default Accounts

Demo accounts are seeded for local testing:

| Username | Password | Role |
| --- | --- | --- |
| `bme_admin01` | `BmeAdmin@123` | bme_admin |
| `bme_engineer01` | `BmeEngineer@123` | bme_engineer |
| `bme_analyst01` | `BmeAnalyst@123` | bme_analyst |

## Access Control

MedTrack uses role-based access control in both the application and database layers.

| Role | Read | Create / Update | Delete |
| --- | --- | --- | --- |
| `bme_analyst` | Yes | No | No |
| `bme_engineer` | Yes | Yes | No |
| `bme_admin` | Yes | Yes | Yes |

## Project Structure

```text
project/
  backend/
  database/
    sql/
  docs/
  frontend/
  init-database.sh
  README.md
```

## Notes

- The backend reads database credentials from `.env`.
- MongoDB is used for flexible document records such as notes and logs.
- MySQL is used for the structured operational database and analytics views.


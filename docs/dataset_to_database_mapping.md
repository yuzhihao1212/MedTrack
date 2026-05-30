# Dataset to Database Mapping

| Cleaned Dataset Column | SQL Table | SQL Column | Notes |
|---|---|---|---|
| device_code | devices | device_code | Unique identifier for each device |
| device_type | device_types | type_name | Normalised into separate table |
| manufacturer | manufacturers | manufacturer_name | Normalised into separate table |
| country | manufacturers | country | Manufacturer/country information |
| model | devices | model | Device model |
| purchase_date | devices | purchase_date | Purchase/installation reference date |
| age_years | devices | age_years | Device age |
| failure_event_count | failure_reports | failure_event_count | Failure history indicator |
| downtime_hours | failure_reports | downtime_hours | Downtime caused by failures |
| maintenance_frequency | maintenance_records | maintenance_frequency | Maintenance count/frequency |
| maintenance_class | maintenance_records | maintenance_class | Original class value |
| maintenance_priority | maintenance_records | maintenance_priority | Derived readable priority |
| maintenance_cost_clean | maintenance_records | maintenance_cost | Cleaned cost value |
| risk_status | devices | risk_status | Derived risk category |
| maintenance_report | MongoDB | technician_notes / device_event_logs | Flexible text-based report |
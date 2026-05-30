# MedTrack Dataset Summary

## Dataset Overview
- Dataset file: `Medical_Device_Failure_dataset(1).csv`
- Rows: 4149
- Columns: 13
- Date range from `Purchase_Date`: 2013-04-13 to 2024-04-11
- Missing values: 0 detected across all columns
- Unique device IDs: 4149 / 4149
- Main data issue: 105 records have negative `Maintenance_Cost`, so these should be flagged as anomalies.

## Columns
| Column | Meaning / Use in MedTrack |
|---|---|
| Device_ID | Unique device code. Use as `device_code` in the SQL `devices` table. |
| Device_Type | Device category, suitable for `device_types`. |
| Purchase_Date | Device purchase date, useful for age and maintenance analysis. |
| Age | Device age in years. |
| Manufacturer | Manufacturer name, can become a lookup table or attribute. |
| Model | Device model. |
| Country | Country of origin/deployment in dataset. Could be used for analytics. |
| Maintenance_Cost | Maintenance cost. Negative values should be cleaned or flagged. |
| Downtime | Device downtime, likely in hours. Useful for risk and analytics. |
| Maintenance_Frequency | Maintenance frequency category/count. |
| Failure_Event_Count | Number of failure events. Useful for risk status and advanced SQL queries. |
| Maintenance_Class | Maintenance priority/class from 1 to 3. |
| Maintenance_Report | Text report. Best stored as NoSQL technician note/event log. |

## Important Data Quality Findings
| Check | Result | Action |
|---|---:|---|
| Missing values | 0 | No imputation needed. |
| Duplicate Device_ID | 0 | Device_ID is safe as a unique device code. |
| Negative Maintenance_Cost | 105 | Keep raw value, but set clean cost to blank/NULL and flag as anomaly. |
| Purchase date format | Valid YYYY-MM-DD | Can import directly as SQL DATE. |

## Top Distributions

### Device Types
- X-Ray Machine: 729
- Infusion Pump: 705
- Defibrillator: 701
- PET Scanner: 679
- MRI Scanner: 673
- CT Scanner: 662

### Manufacturers
- ScanPro: 729
- ImagingTech: 698
- MedEquip: 691
- RescueTech: 689
- CardioSync: 677
- UltraMed: 665

### Countries
- Canada: 736
- Italy: 704
- Japan: 704
- UK: 694
- France: 669
- USA: 642

## Maintenance Report Keyword Signals
- functionality restored: 998
- sensor misalignment: 562
- abnormal sound: 545
- battery wear: 513
- software crash: 512
- data lag: 507
- moderate delay: 506
- voltage spike: 499
- overheating: 488
- critical failure: 483
- component upgrade: 413
- sensor replaced: 357
- required inspection: 196
- replacement initiated: 182
- low priority fault: 177
- high priority failure: 163
- emergency shutdown: 162

## Recommended SQL Tables
1. `device_types`
2. `manufacturers`
3. `devices`
4. `failure_reports`
5. `maintenance_records`
6. `users`
7. `technicians`

## Recommended NoSQL Collections
1. `technician_notes`
2. `device_event_logs`
3. `sensor_snapshots`
4. `alert_history`
5. `audit_logs`

## Recommended Filtering Rule
Use the cleaned dataset for importing:
- Rename columns to snake_case.
- Round `Maintenance_Cost` and `Downtime` to 2 decimal places.
- Store negative maintenance cost values only in `maintenance_cost_raw`.
- Use blank/NULL in `maintenance_cost_clean` when the cost is negative.
- Use derived `risk_status` and `maintenance_priority` to support dashboard and queries.

## Suggested Project Use
This dataset is strong for MedTrack because it contains structured device information, failure counts, maintenance frequency, downtime, cost, maintenance class, and text-based reports. SQL should handle the structured device and maintenance records, while MongoDB should handle flexible text reports, logs, alerts, and sensor/event-style documents.

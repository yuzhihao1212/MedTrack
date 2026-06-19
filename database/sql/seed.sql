USE medtrack;

INSERT INTO users (username, password_hash, role) VALUES
('admin01', 'hashed_password_1', 'admin'),
('tech01', 'hashed_password_2', 'technician'),
('viewer01', 'hashed_password_3', 'viewer');

INSERT INTO manufacturers (manufacturer_name) VALUES
('Medtronic'),
('Philips Healthcare'),
('GE Healthcare'),
('Siemens Healthineers'),
('Fresenius Medical Care'),
('Omron Healthcare');

INSERT INTO device_types (type_name, risk_category) VALUES
('Infusion Pump', 'High'),
('Ventilator', 'High'),
('Patient Monitor', 'Medium'),
('Defibrillator', 'High'),
('Dialysis Machine', 'High'),
('Blood Pressure Monitor', 'Low');

INSERT INTO technicians (full_name, email, specialisation) VALUES
('Daniel Tan', 'daniel.tan@medtrack.local', 'Ventilator Systems'),
('Aisha Lim', 'aisha.lim@medtrack.local', 'Infusion Devices'),
('Marcus Lee', 'marcus.lee@medtrack.local', 'Patient Monitoring'),
('Priya Nair', 'priya.nair@medtrack.local', 'Dialysis Equipment'),
('Ethan Wong', 'ethan.wong@medtrack.local', 'General Biomedical Maintenance');

INSERT INTO devices (
    device_code,
    device_type_id,
    manufacturer_id,
    model,
    country,
    purchase_date,
    age_years,
    risk_status
) VALUES
('MD-1001', 1, 1, 'PumpX-200', 'USA', '2019-04-12', 5, 'High'),
('MD-1002', 2, 2, 'VentPro-A9', 'UK', '2018-09-20', 6, 'Critical'),
('MD-1003', 3, 3, 'MonitorPlus-7', 'France', '2021-02-15', 3, 'Medium'),
('MD-1004', 4, 4, 'DefibSafe-12', 'Japan', '2020-11-08', 4, 'High'),
('MD-1005', 5, 5, 'DialyCare-500', 'Canada', '2017-06-25', 7, 'Critical'),
('MD-1006', 6, 6, 'BPTrack-Lite', 'Italy', '2023-01-10', 1, 'Low'),
('MD-1007', 1, 2, 'InfuseOne-3', 'USA', '2022-05-19', 2, 'Medium'),
('MD-1008', 3, 1, 'VitalView-8', 'UK', '2020-03-30', 4, 'High'),
('MD-1009', 2, 3, 'AirFlow-Z', 'France', '2016-12-14', 8, 'Critical'),
('MD-1010', 5, 4, 'RenalPro-X', 'Canada', '2019-08-01', 5, 'High');

INSERT INTO failure_reports (
    device_id,
    failure_event_count,
    downtime_hours,
    severity,
    report_status
) VALUES
(1, 3, 12.50, 'High', 'Open'),
(2, 5, 30.75, 'Critical', 'In Progress'),
(3, 1, 3.25, 'Low', 'Resolved'),
(4, 2, 8.00, 'Medium', 'Open'),
(5, 6, 42.00, 'Critical', 'In Progress'),
(6, 0, 0.00, 'Low', 'Resolved'),
(7, 2, 6.50, 'Medium', 'Resolved'),
(8, 4, 15.25, 'High', 'Open'),
(9, 7, 50.00, 'Critical', 'Open'),
(10, 3, 11.75, 'High', 'Resolved');

INSERT INTO maintenance_records (
    device_id,
    technician_id,
    maintenance_frequency,
    maintenance_class,
    maintenance_priority,
    maintenance_cost,
    repair_status
) VALUES
(1, 2, 4, 2, 'High', 850.00, 'In Progress'),
(2, 1, 6, 3, 'Critical', 2200.00, 'Pending'),
(3, 3, 1, 1, 'Low', 180.00, 'Completed'),
(4, 5, 2, 2, 'Medium', 600.00, 'In Progress'),
(5, 4, 7, 3, 'Critical', 3100.00, 'Pending'),
(6, 5, 1, 1, 'Low', 90.00, 'Completed'),
(7, 2, 3, 2, 'Medium', 450.00, 'Completed'),
(8, 3, 4, 2, 'High', 980.00, 'In Progress'),
(9, 1, 8, 3, 'Critical', 4200.00, 'Pending'),
(10, 4, 3, 2, 'High', 1200.00, 'Completed');

INSERT INTO parts (part_name, unit_cost, stock_quantity) VALUES
('Battery Module', 180.00, 25),
('Pressure Sensor', 95.00, 40),
('Control Board', 350.00, 12),
('Tubing Connector', 25.00, 100),
('Display Panel', 220.00, 15),
('Ventilator Valve', 150.00, 20),
('Power Adapter', 75.00, 30),
('Flow Sensor', 130.00, 18),
('Filter Cartridge', 45.00, 60),
('Pump Motor', 280.00, 10);

INSERT INTO maintenance_parts (maintenance_id, part_id, quantity_used) VALUES
(1, 4, 2),
(1, 10, 1),
(2, 6, 2),
(2, 8, 1),
(3, 7, 1),
(4, 5, 1),
(5, 3, 2),
(5, 9, 4),
(6, 1, 1),
(7, 4, 3),
(8, 2, 2),
(8, 5, 1),
(9, 6, 3),
(9, 8, 2),
(10, 9, 2);
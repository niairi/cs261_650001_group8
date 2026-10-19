-- Seed data for ROOM
INSERT INTO room (
    room_id,
    room_name,
    capacity,
    location,
    is_active
) VALUES
    (101, 'Room A', 4, 'ชั้น 2', TRUE),
    (102, 'Room B', 6, 'ชั้น 2', TRUE),
    (103, 'Room C', 8, 'ชั้น 3', TRUE);

SELECT setval('room_room_id_seq', (SELECT MAX(room_id) FROM room));


-- Seed data for BOOKING
INSERT INTO booking (
    booking_id,
    student_id,
    room_id,
    booking_date,
    start_time,
    end_time,
    people,
    purpose,
    status
) VALUES
    (1, '650001', 101, '2026-10-20', '09:00', '11:00', 3, 'Group Study', 'CONFIRMED'),
    (2, '650002', 101, '2026-10-20', '13:00', '15:00', 2, 'Meeting', 'BOOKED'),
    (3, '650003', 102, '2026-10-20', '10:00', '12:00', 4, 'Project Discussion', 'CANCELLED'),
    (4, '650004', 103, '2026-10-20', '14:00', '16:00', 6, 'Group Study', 'EXPIRED');

SELECT setval('booking_booking_id_seq', (SELECT MAX(booking_id) FROM booking));
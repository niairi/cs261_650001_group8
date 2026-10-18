INSERT INTO room (room_id, room_name, capacity, location, is_active) VALUES
  (101, 'Room A', 4, 'ชั้น 2', TRUE),
  (102, 'Room B', 6, 'ชั้น 2', TRUE),
  (103, 'Room C', 8, 'ชั้น 3', TRUE);


SELECT setval('room_room_id_seq', (SELECT MAX(room_id) FROM room));

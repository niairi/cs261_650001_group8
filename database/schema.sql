CREATE TABLE room (
    room_id BIGSERIAL PRIMARY KEY,
    room_name VARCHAR(100) NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    location VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE booking (
    booking_id BIGSERIAL PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    room_id BIGINT NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    people INTEGER NOT NULL CHECK (people > 0),
    purpose VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'BOOKED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,

    FOREIGN KEY (room_id) REFERENCES room(room_id),

    CHECK (end_time > start_time),
    CHECK (end_time - start_time <= INTERVAL '3 hours'),
    CHECK (status IN ('BOOKED', 'CONFIRMED', 'CANCELLED', 'EXPIRED'))
);
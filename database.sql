-- Family Tree Database Schema
CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK(gender IN ('Male', 'Female', 'Other')),
    relation TEXT NOT NULL,
    dob TEXT,
    dod TEXT,
    alive INTEGER DEFAULT 1,
    related_id INTEGER,
    photo_url TEXT,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (related_id) REFERENCES members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_members_related_id ON members(related_id);
CREATE INDEX IF NOT EXISTS idx_members_relation ON members(relation);

-- Sample Data (3 Generations with in-laws)
INSERT INTO members (id, name, gender, relation, dob, alive, related_id, photo_url, bio) VALUES
(1, 'John Doe', 'Male', 'Husband', '1950-05-12', 1, NULL, '', 'Grandfather and head of the family.'),
(2, 'Mary Doe', 'Female', 'Wife', '1953-08-22', 1, 1, '', 'Grandmother and matriarch.'),
(3, 'David Doe', 'Male', 'Son', '1976-03-15', 1, 1, '', 'Eldest son, engineer.'),
(4, 'Emma Doe', 'Female', 'Daughter-in-law', '1979-11-04', 1, 3, '', 'Wife of David, architect.'),
(5, 'Sarah Doe', 'Female', 'Daughter', '1980-07-19', 1, 1, '', 'Daughter, doctor.'),
(6, 'Michael Smith', 'Male', 'Son-in-law', '1978-01-25', 1, 5, '', 'Husband of Sarah, university professor.'),
(7, 'Leo Doe', 'Male', 'Son', '2005-09-10', 1, 3, '', 'Grandson, high school student.'),
(8, 'Lily Smith', 'Female', 'Daughter', '2008-12-03', 1, 5, '', 'Granddaughter, artist and pianist.');

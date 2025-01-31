DROP TABLE IF EXISTS violations_detected;
DROP TABLE IF EXISTS call_to_action_responses;
DROP INDEX IF EXISTS idx_attachment_search;
DROP TABLE IF EXISTS call_to_action_response;
DROP TABLE IF EXISTS call_to_action;
DROP TABLE IF EXISTS email_recipients;
DROP TABLE IF EXISTS key_points;
DROP TABLE IF EXISTS email_attachments;
DROP TABLE IF EXISTS email_reads;
DROP TABLE IF EXISTS email_recipients;
DROP TABLE IF EXISTS  legal_references;
DROP TABLE IF EXISTS  policies_statutes;
DROP TABLE IF EXISTS policy_types;
DROP TABLE IF EXISTS emails;
DROP TABLE IF EXISTS threads;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS email_sentiment_analysis;
DROP TABLE IF EXISTS compliance_scores;

CREATE TABLE contacts (
    contact_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role_dscr VARCHAR(100),  
    is_district_staff BOOLEAN DEFAULT FALSE
);

CREATE TABLE threads (
    thread_id SERIAL PRIMARY KEY,
    subject TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE emails (
    email_id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL REFERENCES contacts(contact_id) ON DELETE CASCADE,
    thread_id INT NULL REFERENCES threads(thread_id) ON DELETE SET NULL,
    parent_email_id INT NULL REFERENCES emails(email_id) ON DELETE SET NULL,  
    subject TEXT NOT NULL,
    email_contents TEXT NOT NULL,
    sent_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE email_recipients (
    email_id INT NOT NULL REFERENCES emails(email_id) ON DELETE CASCADE,
    recipient_id INT NOT NULL REFERENCES contacts(contact_id) ON DELETE CASCADE,
    PRIMARY KEY (email_id, recipient_id)
);

CREATE TABLE policy_types (
    policy_type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) UNIQUE NOT NULL  
);


CREATE TABLE policies_statutes (
    policy_id SERIAL PRIMARY KEY,
    policy_type_id INT NOT NULL REFERENCES policy_types(policy_type_id) ON DELETE CASCADE,
    chapter VARCHAR(50),
    section VARCHAR(50),
    paragraph TEXT,
    description TEXT
);


CREATE TABLE email_attachments (
    attachment_id SERIAL PRIMARY KEY,
    email_id INT NOT NULL REFERENCES emails(email_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,  
    extracted_text TEXT NULL,  
    extracted_text_tsv TSVECTOR,  
    policy_id INT NULL REFERENCES policies_statutes(policy_id) ON DELETE SET NULL,
    summary TEXT NULL  
);

CREATE INDEX idx_attachment_search ON email_attachments USING GIN(extracted_text_tsv);

CREATE TABLE key_points (
    key_point_id SERIAL PRIMARY KEY,
    email_id INT NOT NULL REFERENCES emails(email_id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    policy_id INT NULL REFERENCES policies_statutes(policy_id) ON DELETE SET NULL
);



CREATE TABLE call_to_action (
    action_id SERIAL PRIMARY KEY,
    email_id INT NOT NULL REFERENCES emails(email_id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    opened_date DATE,
    closed_date DATE,
    compliancy_close_date DATE,
    completion_percentage DECIMAL(5,2) DEFAULT 0.0 CHECK (completion_percentage BETWEEN 0 AND 100),
    policy_id INT NULL REFERENCES policies_statutes(policy_id) ON DELETE SET NULL
);

CREATE TABLE call_to_action_responses (
    response_id SERIAL PRIMARY KEY,
    action_id INT NOT NULL REFERENCES call_to_action(action_id) ON DELETE CASCADE,
    email_id INT NOT NULL REFERENCES emails(email_id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    completion_percentage DECIMAL(5,2) DEFAULT 0.0 CHECK (completion_percentage BETWEEN 0 AND 100),
    response_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE violations_detected (
    violation_id SERIAL PRIMARY KEY,
    email_id INT NULL REFERENCES emails(email_id) ON DELETE CASCADE,
    attachment_id INT NULL REFERENCES email_attachments(attachment_id) ON DELETE CASCADE,
    key_point_id INT NULL REFERENCES key_points(key_point_id) ON DELETE CASCADE,
    action_id INT NULL REFERENCES call_to_action(action_id) ON DELETE CASCADE,
    violation_type VARCHAR(255) NOT NULL,
    severity_level INT CHECK (severity_level BETWEEN 1 AND 5),
    detected_by VARCHAR(255) DEFAULT 'AI-System',
    detected_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE TABLE legal_references (
    reference_id SERIAL PRIMARY KEY,
    case_name VARCHAR(255) NOT NULL,
    source VARCHAR(255) NOT NULL,  
    policy_id INT NULL REFERENCES policies_statutes(policy_id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    url TEXT
);


CREATE TABLE email_sentiment_analysis (
    analysis_id SERIAL PRIMARY KEY,
    email_id INT NOT NULL REFERENCES emails(email_id) ON DELETE CASCADE,
    sentiment_score INT CHECK (sentiment_score BETWEEN -5 AND 5),  
    detected_hostility BOOLEAN DEFAULT FALSE,
    flagged_phrases TEXT,
    detected_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE compliance_scores (
    score_id SERIAL PRIMARY KEY,
    email_id INT NULL REFERENCES emails(email_id) ON DELETE CASCADE,
    action_id INT NULL REFERENCES call_to_action(action_id) ON DELETE CASCADE,
    compliance_score INT CHECK (compliance_score BETWEEN 0 AND 100),
    violations_found INT DEFAULT 0,
    response_delay_days INT DEFAULT 0,
    overall_grade VARCHAR(10) CHECK (overall_grade IN ('A', 'B', 'C', 'D', 'F')),
    evaluated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



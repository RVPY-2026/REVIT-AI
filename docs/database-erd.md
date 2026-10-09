# Database relationships — lean v1

This diagram reflects the current 16-table Drizzle schema. It shows selected business columns and the main foreign keys; not every staff attribution or timestamp is displayed. PK = primary key, FK = foreign key, UK = unique key. Nullable foreign keys are optional links.

```mermaid
erDiagram
    users ||--o{ user_roles : has
    users o|--o{ ad_sources : owns
    users o|--o| students : login
    ad_sources ||--o{ source_month_counters : allocates
    ad_sources ||--o{ students : attracts
    students o|--o{ students : refers
    students ||--o{ student_status_events : history
    students ||--o{ call_notes : consultation
    students ||--o| enrollments : study
    students ||--o{ payments : receipts
    students o|--o{ licenses : entitlement
    students o|--o{ feedback : responds
    enrollments o|--o{ payments : reconciles
    enrollments ||--o{ study_plan_lessons : contains
    lessons o|--o{ study_plan_lessons : copied_from
    lessons o|--o{ learning_resources : materials
    users o|--o{ audit_log : performs

    users {
        uuid id PK
        text email UK
        uuid auth_user_id UK
    }
    user_roles {
        uuid user_id PK,FK
        enum role PK
    }
    ad_sources {
        uuid id PK
        text code UK
        uuid owner_user_id FK
    }
    source_month_counters {
        uuid source_id FK
        text code_month
        int next_seq
    }
    students {
        uuid id PK
        text code UK
        uuid source_id FK
        uuid user_id FK,UK
        uuid referred_by_id FK
        text full_name
        enum status
        jsonb legacy_raw
    }
    student_status_events {
        uuid student_id FK
        enum from_status
        enum to_status
    }
    call_notes {
        uuid student_id FK
        uuid author_id FK
        text body
    }
    enrollments {
        uuid id PK
        uuid student_id FK,UK
        enum kind
        enum status
        bigint agreed_fee_vnd
        date start_date
        float duration_multiplier
        jsonb availability
    }
    study_plan_lessons {
        uuid enrollment_id FK
        uuid lesson_id FK
        text title
        int base_days
        int trial_order
        date due_date_override
        text submission_url
        timestamp completed_at
    }
    lessons {
        uuid id PK
        enum phase
        int_array lesson_numbers
        text title
        int base_days
        int trial_order UK
    }
    learning_resources {
        uuid lesson_id FK
        text title
        text object_path
        text external_url
        enum audience
        enum mode
    }
    payments {
        uuid student_id FK
        uuid enrollment_id FK
        enum kind
        bigint amount_vnd
        timestamp paid_at
    }
    licenses {
        uuid student_id FK
        text email
        text product
        enum status
        timestamp expires_at
    }
    feedback {
        uuid student_id FK
        enum kind
        int curriculum_score
        int addin_score
        text body
    }
    message_templates {
        text title
        enum for_status
        text body
    }
    audit_log {
        uuid actor_id FK
        text action
        text entity
        uuid entity_id
    }
```

- Acquisition: a sales owner manages sources; each source/month has a counter. Students retain the source attribution, CRM stage, six checklist timestamps and original import metadata.
- Identity: a lead may exist without a login account. A linked account may have multiple roles. Each account links to at most one student.
- Learning: a student has at most one enrollment in v1. Its plan copies lesson titles, numbers and durations. Changing a template does not change an existing plan. Trial selection uses trial_order 1/2/3 for lessons 2/13/14.
- Finance and tools: the agreed fee belongs to the enrollment; actual payments/refunds belong to payments. Licenses remain independently administered. The optional payment enrollment link is enforced together with student_id by a composite foreign key.
- Operations: message_templates.for_status is an enum value, not a foreign key to a student. audit_log.entity_id is a generic record reference, not a database foreign key. Call notes, status history and payments also have optional staff attribution foreign keys to users, omitted from the diagram for readability.
- Resource origin: exactly one private Storage object or allowed external video URL. Resources may be general or linked to a lesson; audience and mode control intended availability and presentation.
- Dates: commitment dates are calculated from start_date, cumulative copied base_days and duration_multiplier. Only manual per-lesson overrides are persisted.

`||` = exactly one; `o|` = zero or one; `o{` = zero or many. For example, students ||--o| enrollments means each enrollment belongs to one student, while a student may have no enrollment yet.

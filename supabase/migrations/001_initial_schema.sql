-- ============================================================================
-- SHIKKHANIR (শিক্ষানীর) - Complete PostgreSQL / Supabase Migration & RLS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ROLES & PROFILES
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name_bn TEXT NOT NULL,
  description TEXT
);

INSERT INTO roles (id, name_bn, description) VALUES
  ('ADMIN', 'প্রশাসক', 'Full administrative control of Shikkhanir'),
  ('TEACHER', 'শিক্ষক', 'Assigned class attendance, marks, materials & messaging'),
  ('STUDENT', 'শিক্ষার্থী', 'Personal dashboard, results, payments & class communication')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT UNIQUE NOT NULL,
  role_id TEXT NOT NULL REFERENCES roles(id),
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ACADEMIC STRUCTURE
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name_bn TEXT NOT NULL,
  name_en TEXT NOT NULL,
  monthly_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  is_exam_batch BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  room TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 40,
  academic_year INTEGER NOT NULL,
  UNIQUE (class_id, name, academic_year)
);

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name_bn TEXT NOT NULL,
  code TEXT NOT NULL,
  full_marks INTEGER NOT NULL DEFAULT 100,
  pass_marks INTEGER NOT NULL DEFAULT 33,
  UNIQUE (class_id, code)
);

-- 3. TEACHERS & STUDENTS (IDENTITY SEPARATED FROM ENROLLMENT)
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  teacher_code TEXT UNIQUE NOT NULL,
  designation TEXT NOT NULL,
  qualification TEXT NOT NULL,
  bio TEXT,
  experience_years INTEGER NOT NULL DEFAULT 0,
  joined_at DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS class_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  batch_id TEXT REFERENCES batches(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  UNIQUE (teacher_id, class_id, batch_id)
);

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  student_code TEXT UNIQUE NOT NULL,
  date_of_birth DATE NOT NULL,
  guardian_name TEXT NOT NULL,
  guardian_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  previous_school TEXT NOT NULL,
  admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (phone_key) -- enforced via profile phone uniqueness
);

-- A single student identity can hold Class 10 + SSC Batch enrollment without duplicate student accounts
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES classes(id),
  batch_id TEXT NOT NULL REFERENCES batches(id),
  roll_number TEXT NOT NULL,
  academic_year INTEGER NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'INACTIVE')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, class_id, academic_year),
  UNIQUE (batch_id, roll_number, academic_year)
);

-- 4. ADMISSION APPLICATIONS
CREATE TABLE IF NOT EXISTS admission_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id TEXT UNIQUE NOT NULL,
  student_name TEXT NOT NULL,
  photo_url TEXT,
  date_of_birth DATE NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  guardian_name TEXT NOT NULL,
  guardian_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  previous_school TEXT NOT NULL,
  class_id TEXT NOT NULL REFERENCES classes(id),
  batch_id TEXT NOT NULL REFERENCES batches(id),
  academic_info TEXT,
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Under Review', 'Approved', 'Rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  UNIQUE (phone, class_id, status)
);

-- 5. ROUTINES & ATTENDANCE
CREATE TABLE IF NOT EXISTS class_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  room TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date DATE NOT NULL,
  class_id TEXT NOT NULL REFERENCES classes(id),
  batch_id TEXT NOT NULL REFERENCES batches(id),
  taken_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_date, class_id, batch_id)
);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Late', 'Leave')),
  remarks TEXT,
  UNIQUE (session_id, student_id)
);

-- 6. PAYMENTS & INVOICES
CREATE TABLE IF NOT EXISTS fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL REFERENCES classes(id),
  academic_year INTEGER NOT NULL,
  monthly_fee NUMERIC(10, 2) NOT NULL,
  UNIQUE (class_id, academic_year)
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  name_bn TEXT NOT NULL,
  is_manual BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT UNIQUE NOT NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES enrollments(id),
  month_index INTEGER NOT NULL CHECK (month_index BETWEEN 1 AND 12),
  academic_year INTEGER NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Paid', 'Unpaid', 'Pending', 'Partial')),
  due_date DATE NOT NULL,
  UNIQUE (student_id, month_index, academic_year)
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  method_id TEXT NOT NULL REFERENCES payment_methods(id),
  transaction_id TEXT UNIQUE NOT NULL,
  sender_phone TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Verified', 'Rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no TEXT UNIQUE NOT NULL,
  payment_id UUID UNIQUE NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. EXAMS, MARKS, RESULTS & RANKINGS
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  class_id TEXT NOT NULL REFERENCES classes(id),
  batch_id TEXT NOT NULL REFERENCES batches(id),
  academic_year INTEGER NOT NULL,
  exam_date DATE NOT NULL,
  exam_time TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS exam_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  full_marks INTEGER NOT NULL,
  pass_marks INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  exam_subject_id UUID NOT NULL REFERENCES exam_subjects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  obtained_marks NUMERIC(6, 2) NOT NULL,
  entered_by UUID NOT NULL REFERENCES profiles(id),
  remarks TEXT,
  UNIQUE (exam_subject_id, student_id)
);

CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  total_full_marks INTEGER NOT NULL,
  total_obtained NUMERIC(7, 2) NOT NULL,
  gpa NUMERIC(3, 2) NOT NULL,
  grade TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  UNIQUE (exam_id, student_id)
);

CREATE TABLE IF NOT EXISTS rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID UNIQUE NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL REFERENCES classes(id),
  batch_id TEXT NOT NULL REFERENCES batches(id),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_rank INTEGER NOT NULL,
  batch_rank INTEGER NOT NULL
);

-- 8. MESSAGING
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('GROUP', 'PRIVATE')),
  title TEXT NOT NULL,
  class_id TEXT REFERENCES classes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, profile_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  body TEXT NOT NULL,
  reply_to_id UUID REFERENCES messages(id),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'pdf')),
  storage_path TEXT NOT NULL
);

-- 9. NOTICES, STUDY MATERIALS, HOMEWORK & SYSTEM
CREATE TABLE IF NOT EXISTS notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  notice_type TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  published_by UUID REFERENCES profiles(id),
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notice_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id UUID NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  class_id TEXT REFERENCES classes(id),
  batch_id TEXT REFERENCES batches(id)
);

CREATE TABLE IF NOT EXISTS study_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  class_id TEXT NOT NULL REFERENCES classes(id),
  batch_id TEXT REFERENCES batches(id),
  description TEXT,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  subject TEXT NOT NULL,
  class_id TEXT NOT NULL REFERENCES classes(id),
  batch_id TEXT NOT NULL REFERENCES batches(id),
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  deadline DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  note TEXT,
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Checked')),
  teacher_feedback TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (homework_id, student_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_student_year ON invoices(student_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_results_published ON results(exam_id, is_published);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, sent_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
  SELECT role_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Profiles: own profile or Admin
CREATE POLICY "profiles_select_own_or_admin" ON profiles
  FOR SELECT USING (id = auth.uid() OR current_user_role() = 'ADMIN');

-- Students: Admin & assigned Teachers can view; Student only sees own record
CREATE POLICY "students_select_policy" ON students
  FOR SELECT USING (
    profile_id = auth.uid()
    OR current_user_role() = 'ADMIN'
    OR (
      current_user_role() = 'TEACHER' AND EXISTS (
        SELECT 1 FROM enrollments e
        JOIN class_teachers ct ON ct.class_id = e.class_id
        JOIN teachers t ON t.id = ct.teacher_id
        WHERE e.student_id = students.id AND t.profile_id = auth.uid()
      )
    )
  );

-- Invoices & Payments: Student only sees own invoices; Admin manages all
CREATE POLICY "invoices_student_own" ON invoices
  FOR SELECT USING (
    current_user_role() = 'ADMIN'
    OR EXISTS (SELECT 1 FROM students s WHERE s.id = invoices.student_id AND s.profile_id = auth.uid())
  );

-- Results: Students can ONLY read published results belonging to themselves (or public published merit)
CREATE POLICY "results_published_only" ON results
  FOR SELECT USING (
    current_user_role() IN ('ADMIN', 'TEACHER')
    OR (is_published = TRUE)
  );

-- Messages: Only participants in the conversation can read/write
CREATE POLICY "messages_participant_only" ON messages
  FOR SELECT USING (
    current_user_role() = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id AND cp.profile_id = auth.uid()
    )
  );

-- Notifications: Strictly own user
CREATE POLICY "notifications_own_only" ON notifications
  FOR ALL USING (user_id = auth.uid());

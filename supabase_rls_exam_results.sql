-- ============================================================
-- RLS Policies untuk tabel exam_results
-- Jalankan di Supabase Dashboard > SQL Editor
-- ============================================================

-- Pastikan RLS aktif
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada (agar tidak konflik)
DROP POLICY IF EXISTS "Siswa bisa insert jawaban sendiri" ON exam_results;
DROP POLICY IF EXISTS "Siswa bisa lihat jawaban sendiri" ON exam_results;
DROP POLICY IF EXISTS "Siswa bisa update jawaban sendiri yang di-reset" ON exam_results;
DROP POLICY IF EXISTS "Guru bisa lihat semua hasil ujian" ON exam_results;
DROP POLICY IF EXISTS "Guru bisa update koreksi essay" ON exam_results;
DROP POLICY IF EXISTS "Guru bisa delete jawaban siswa" ON exam_results;

-- 1. Siswa: INSERT jawaban sendiri
CREATE POLICY "Siswa bisa insert jawaban sendiri"
ON exam_results FOR INSERT
TO authenticated
WITH CHECK (
  siswa_id = auth.uid()
);

-- 2. Siswa: SELECT jawaban sendiri
CREATE POLICY "Siswa bisa lihat jawaban sendiri"
ON exam_results FOR SELECT
TO authenticated
USING (
  siswa_id = auth.uid()
  OR
  -- Guru bisa lihat semua (cek role dari profiles)
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'guru'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 3. Siswa: UPDATE row sendiri yang di-reset (submitted_at IS NULL)
CREATE POLICY "Siswa bisa update jawaban sendiri yang di-reset"
ON exam_results FOR UPDATE
TO authenticated
USING (
  siswa_id = auth.uid()
  AND submitted_at IS NULL
)
WITH CHECK (
  siswa_id = auth.uid()
);

-- 4. Guru: UPDATE untuk koreksi essay & reset jawaban
CREATE POLICY "Guru bisa update koreksi essay"
ON exam_results FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('guru', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('guru', 'admin')
  )
);

-- 5. Guru: DELETE jawaban siswa (untuk reset)
CREATE POLICY "Guru bisa delete jawaban siswa"
ON exam_results FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('guru', 'admin')
  )
);

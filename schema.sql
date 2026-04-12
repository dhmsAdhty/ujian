-- 1. Tabel Profil (Extension dari Auth.Users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  role TEXT CHECK (role IN ('admin', 'guru', 'siswa')) DEFAULT 'siswa',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger untuk otomatis buat profil saat user daftar/dibuat di Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, COALESCE(NEW.raw_user_meta_data->>'role', 'siswa'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Tabel Mata Pelajaran (Mapel)
CREATE TABLE public.mapel (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Kelas
CREATE TABLE public.kelas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Bank Soal
CREATE TABLE public.bank_soal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guru_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mapel_id UUID REFERENCES public.mapel(id) ON DELETE SET NULL,
  kelas_id UUID REFERENCES public.kelas(id) ON DELETE SET NULL,
  judul TEXT NOT NULL,
  konten TEXT,
  tipe_soal TEXT CHECK (tipe_soal IN ('pilihan_ganda', 'essay')),
  media_url TEXT,
  bobot INTEGER DEFAULT 1,
  options JSONB, -- Simpan array opsi [ {text, is_correct, label} ]
  kunci_jawaban TEXT, -- Untuk Essay
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ -- Sistem Soft Delete
);

-- 5. Tabel Paket Ujian (Exams)
CREATE TABLE public.exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  judul TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabel Hasil Ujian (Exam Results)
CREATE TABLE public.exam_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  answers JSONB,
  violations INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- AKTIFKAN RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_soal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

-- 7. Policy Dasar
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Mapel readable by all" ON public.mapel FOR SELECT USING (true);
CREATE POLICY "Kelas readable by all" ON public.kelas FOR SELECT USING (true);
CREATE POLICY "Guru can manage own bank_soal" ON public.bank_soal FOR ALL USING (auth.uid() = guru_id);
CREATE POLICY "Bank soal readable by all" ON public.bank_soal FOR SELECT USING (true);

-- SEED DATA AWAL
INSERT INTO public.mapel (nama) VALUES ('Matematika'), ('Fisika'), ('Bahasa Indonesia');
INSERT INTO public.kelas (nama) VALUES ('X MIPA 1'), ('XI MIPA 2'), ('XII MIPA 1');

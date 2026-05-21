
-- Add pdf_url to treinamentos
ALTER TABLE public.treinamentos ADD COLUMN IF NOT EXISTS pdf_url text;

-- Storage buckets for videos and PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('treinamentos-videos', 'treinamentos-videos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('treinamentos-pdfs', 'treinamentos-pdfs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read
CREATE POLICY "treinamentos_videos_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'treinamentos-videos');

CREATE POLICY "treinamentos_pdfs_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'treinamentos-pdfs');

-- Admins can write/update/delete
CREATE POLICY "treinamentos_videos_admin_write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'treinamentos-videos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "treinamentos_videos_admin_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'treinamentos-videos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "treinamentos_videos_admin_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'treinamentos-videos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "treinamentos_pdfs_admin_write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'treinamentos-pdfs' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "treinamentos_pdfs_admin_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'treinamentos-pdfs' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "treinamentos_pdfs_admin_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'treinamentos-pdfs' AND has_role(auth.uid(), 'admin'::app_role));

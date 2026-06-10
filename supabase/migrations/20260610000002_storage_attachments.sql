-- Create private storage bucket for spend request attachments
-- Path convention: {entity_id}/{request_id}/{filename}
-- All writes go through the service role (API routes) — no direct client writes.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  FALSE,
  10485760,  -- 10 MB per file
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can read files in this bucket.
-- Actual access control is enforced at the API layer (RLS on spend_requests ensures
-- a user can only fetch signed URLs for requests they are permitted to see).
CREATE POLICY "authenticated_read_attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'attachments');

-- Service role handles INSERT/UPDATE/DELETE (bypasses RLS by default).
-- No additional policies required for write operations.

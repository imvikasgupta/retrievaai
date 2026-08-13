DROP POLICY IF EXISTS chunks_update ON public.document_chunks;
CREATE POLICY chunks_update ON public.document_chunks
FOR UPDATE TO authenticated
USING (owner_id = auth.uid() AND is_demo = false)
WITH CHECK (owner_id = auth.uid() AND is_demo = false);
ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_classes_is_active
ON public.classes (is_active);

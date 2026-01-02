-- Add exported_at column for locking carousels after first download
ALTER TABLE public.carousels
ADD COLUMN IF NOT EXISTS exported_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add cover_image_url column for cover slide background
ALTER TABLE public.carousels
ADD COLUMN IF NOT EXISTS cover_image_url TEXT DEFAULT NULL;

-- Add comment to explain the columns
COMMENT ON COLUMN public.carousels.exported_at IS 'Timestamp of first export. If set, carousel is locked for editing.';
COMMENT ON COLUMN public.carousels.cover_image_url IS 'Background image URL for the cover slide (slide 1 only).';

-- Create index for exported carousels queries
CREATE INDEX IF NOT EXISTS idx_carousels_exported_at ON public.carousels(exported_at) WHERE exported_at IS NOT NULL;

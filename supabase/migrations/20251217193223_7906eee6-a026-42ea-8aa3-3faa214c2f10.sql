-- Create table for category publish rules
CREATE TABLE public.category_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL UNIQUE,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.category_rules ENABLE ROW LEVEL SECURITY;

-- Everyone can read category rules (needed for filtering deals)
CREATE POLICY "Anyone can view category rules" 
ON public.category_rules 
FOR SELECT 
USING (true);

-- Only admins can modify category rules
CREATE POLICY "Admins can insert category rules" 
ON public.category_rules 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update category rules" 
ON public.category_rules 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete category rules" 
ON public.category_rules 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create trigger for updating timestamps
CREATE TRIGGER update_category_rules_updated_at
BEFORE UPDATE ON public.category_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
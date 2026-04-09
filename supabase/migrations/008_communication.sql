-- Migration 008: Communication (Messaging & Notifications)

-- 1. Create Tables

CREATE TABLE IF NOT EXISTS public.conversations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    type text NOT NULL CHECK (type IN ('direct', 'group', 'class')),
    class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    action_url text, -- Optional payload for navigation
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- 2. Realtime configuration
-- Alter publication to include new tables if they aren't already included
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 3. Triggers for Class Group Auto-Creation

-- Trigger 1: Create conversation when class is created
CREATE OR REPLACE FUNCTION public.handle_new_class_conversation() 
RETURNS TRIGGER AS $$
DECLARE
  conv_id uuid;
BEGIN
  INSERT INTO public.conversations (type, class_id)
  VALUES ('class', NEW.id)
  RETURNING id INTO conv_id;

  IF NEW.class_teacher_id IS NOT NULL THEN
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (conv_id, NEW.class_teacher_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_class_created ON public.classes;
CREATE TRIGGER on_class_created
  AFTER INSERT ON public.classes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_class_conversation();

-- Trigger 2: Sync students into class conversation
CREATE OR REPLACE FUNCTION public.sync_student_to_class_conversation()
RETURNS TRIGGER AS $$
DECLARE
  conv_id uuid;
BEGIN
  IF NEW.status = 'active' THEN
     SELECT id INTO conv_id FROM public.conversations WHERE class_id = NEW.class_id AND type = 'class' LIMIT 1;
     IF conv_id IS NOT NULL THEN
       INSERT INTO public.conversation_participants (conversation_id, user_id)
       VALUES (conv_id, NEW.student_id)
       ON CONFLICT (conversation_id, user_id) DO NOTHING;
     END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_enrollment_change ON public.enrollments;
CREATE TRIGGER on_enrollment_change
  AFTER INSERT OR UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE PROCEDURE public.sync_student_to_class_conversation();

-- Trigger 3: Sync teachers into class conversation
CREATE OR REPLACE FUNCTION public.sync_teacher_to_class_conversation()
RETURNS TRIGGER AS $$
DECLARE
  conv_id uuid;
BEGIN
  SELECT id INTO conv_id FROM public.conversations WHERE class_id = NEW.class_id AND type = 'class' LIMIT 1;
  IF conv_id IS NOT NULL AND NEW.teacher_id IS NOT NULL THEN
     INSERT INTO public.conversation_participants (conversation_id, user_id)
     VALUES (conv_id, NEW.teacher_id)
     ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_class_subject_assigned ON public.class_subjects;
CREATE TRIGGER on_class_subject_assigned
  AFTER INSERT OR UPDATE ON public.class_subjects
  FOR EACH ROW EXECUTE PROCEDURE public.sync_teacher_to_class_conversation();


-- 4. Initial Migration for Existing Classes
DO $$ 
DECLARE
  c RECORD;
  conv_id uuid;
BEGIN
  FOR c IN SELECT * FROM public.classes LOOP
    -- Ensure we don't duplicate class conversations
    IF NOT EXISTS (SELECT 1 FROM public.conversations WHERE class_id = c.id AND type = 'class') THEN
        INSERT INTO public.conversations (type, class_id)
        VALUES ('class', c.id)
        RETURNING id INTO conv_id;

        -- Add class teacher
        IF c.class_teacher_id IS NOT NULL THEN
        INSERT INTO public.conversation_participants (conversation_id, user_id)
        VALUES (conv_id, c.class_teacher_id) ON CONFLICT DO NOTHING;
        END IF;

        -- Add enrolled active students
        INSERT INTO public.conversation_participants (conversation_id, user_id)
        SELECT conv_id, student_id FROM public.enrollments 
        WHERE class_id = c.id AND status = 'active'
        ON CONFLICT DO NOTHING;

        -- Add subject teachers
        INSERT INTO public.conversation_participants (conversation_id, user_id)
        SELECT conv_id, teacher_id FROM public.class_subjects 
        WHERE class_id = c.id AND teacher_id IS NOT NULL
        ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;


-- 5. Row Level Security

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Conversations RLS
CREATE POLICY "Users can view their conversations"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp 
      WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Conversation Participants RLS
CREATE POLICY "Users can view participants of their conversations"
  ON public.conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp 
      WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can insert participants"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Messages RLS
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp 
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can send messages to their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp 
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
  );

-- Notifications RLS
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own notifications (e.g., mark as read)"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

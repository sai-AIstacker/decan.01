-- 007_exam_ranks.sql

CREATE OR REPLACE FUNCTION public.get_student_rank(_exam_id uuid, _student_id uuid)
RETURNS TABLE (
  total_marks numeric,
  rank integer
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH student_totals AS (
    SELECT student_id, sum(marks_obtained) as total
    FROM public.marks
    WHERE exam_id = _exam_id
    GROUP BY student_id
  ),
  ranked_students AS (
    SELECT student_id, total, rank() OVER (ORDER BY total DESC) as current_rank
    FROM student_totals
  )
  SELECT total, current_rank::integer
  FROM ranked_students
  WHERE student_id = _student_id;
$$;

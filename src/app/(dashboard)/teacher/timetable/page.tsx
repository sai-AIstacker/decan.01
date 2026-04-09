import { TimetableSkeleton } from "@/components/ui/page-skeleton";
import { Suspense } from "react";
import { getSessionProfile } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import TeacherTimetableView from "./ui/teacher-timetable-view";

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase admin credentials");
  }
  return createAdminClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export default async function TeacherTimetablePage() {
  const { profile } = await getSessionProfile();

  if (!profile || !profile.roles.includes("teacher")) {
    redirect("/dashboard");
  }

  const supabase = createServiceClient();

  const { data: timeSlots } = await supabase.from("time_slots").select("*").order("order_index");
  
  const { data: globalSubjects } = await supabase.from("subjects").select("id, name, code");
  
  const { data: classes } = await supabase.from("classes").select("id, name, section");

  const { data: myTimetables } = await supabase
    .from("timetables")
    .select("*")
    .eq("teacher_id", profile.id);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-zinc-100 dark:to-zinc-500 bg-clip-text text-transparent">
          Personal Schedule
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Your distinct chronological matrix allocating class and subject bounds globally.
        </p>
      </div>

      <Suspense fallback={<TimetableSkeleton />}>
         <TeacherTimetableView 
           timeSlots={timeSlots || []}
           timetables={myTimetables || []}
           classes={classes || []}
           globalSubjects={globalSubjects || []}
         />
      </Suspense>
    </div>
  );
}

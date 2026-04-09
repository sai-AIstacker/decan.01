import { Suspense } from "react";
import { getSessionProfile } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import NotificationsView from "./ui/notifications-view";

export default async function NotificationsPage() {
  const { profile } = await getSessionProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Suspense fallback={<div className="h-96 flex items-center justify-center">Loading notifications...</div>}>
         <NotificationsView userId={profile.id} />
      </Suspense>
    </div>
  );
}

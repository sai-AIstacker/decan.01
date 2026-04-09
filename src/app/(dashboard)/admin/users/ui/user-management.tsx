"use client";

import { createUserAdminAction } from "@/app/actions/users";
import {
  deleteUserAdminAction,
  updateUserAdminAction,
} from "@/app/actions/users";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile, Role, AppRole } from "@/types/database";
import { ROLE_LABELS } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable, ColumnDef } from "@/components/ui/data-table";

type UserWithRoles = Profile & {
  user_roles: Array<{
    roles: {
      name: AppRole;
    };
  }>;
};

interface UserManagementProps {
  initialUsers: UserWithRoles[];
  availableRoles: Role[];
}

export default function UserManagement({
  initialUsers,
  availableRoles,
}: UserManagementProps) {
  const [users, setUsers] = useState(initialUsers);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createSelectedRoles, setCreateSelectedRoles] = useState<string[]>([]);
  const [editSelectedRoles, setEditSelectedRoles] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const handleCreateUser = async (formData: FormData) => {
    setIsSubmitting(true);
    const email = formData.get("email") as string;
    const fullName = formData.get("fullName") as string;
    const phone = formData.get("phone") as string;
    const avatarUrl = formData.get("avatarUrl") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const selectedRoles = createSelectedRoles;

    try {
      if (password !== confirmPassword) {
        throw new Error("Password and confirm password do not match.");
      }

      await createUserAdminAction({
        email,
        fullName,
        phone,
        avatarUrl,
        password,
        roles: selectedRoles,
      });
      router.refresh();
      setIsCreateDialogOpen(false);
      setCreateSelectedRoles([]);
      toast.success("User created successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to originate structural user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (formData: FormData) => {
    if (!editingUser) return;
    setIsSubmitting(true);

    const fullName = formData.get("fullName") as string;
    const phone = formData.get("phone") as string;
    const avatarUrl = formData.get("avatarUrl") as string;
    const selectedRoles = editSelectedRoles;

    try {
      await updateUserAdminAction({
        userId: editingUser.id,
        fullName,
        phone,
        avatarUrl,
        roles: selectedRoles,
      });
      router.refresh();
      setEditingUser(null);
      toast.success("User attributes modified seamlessly.");
    } catch (error: any) {
      toast.error(error.message || "Mutation collapsed unexpectedly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    
    const toastId = toast.loading("Purging entity from registry...");
    try {
      await deleteUserAdminAction(userId);

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      router.refresh();
      toast.success("User deleted safely.", { id: toastId });
    } catch (error: any) {
      toast.error("Deletion locked: " + (error.message || "Unknown constraints"), { id: toastId });
    }
  };

  const columns: ColumnDef<UserWithRoles>[] = [
     {
        header: "Name",
        accessorKey: "full_name",
        cell: (row) => <span className="font-medium text-zinc-900 dark:text-zinc-100">{row.full_name}</span>
     },
     {
        header: "Email",
        accessorKey: "email"
     },
     {
        header: "Phone",
        accessorKey: "phone",
        cell: (row) => <span className="text-zinc-500">{row.phone || "-"}</span>
     },
     {
        header: "Roles",
        cell: (row) => (
           <div className="flex flex-wrap gap-1">
              {row.user_roles && row.user_roles.length > 0 ? row.user_roles.map((ur, index) => (
                <Badge key={index} variant="secondary" className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  {ROLE_LABELS[ur.roles.name]}
                </Badge>
              )) : <span className="text-zinc-400 italic">Unassigned</span>}
           </div>
        )
     },
     {
        header: "Created",
        className: "hidden md:table-cell",
        cell: (row) => <span className="text-zinc-500">{row.created_at.split("T")[0]}</span>
     },
     {
        header: "",
        className: "text-right w-24",
        cell: (row) => (
           <div className="flex items-center justify-end space-x-2">
              <Button variant="ghost" size="sm" onClick={() => {
                  const userRoleIds = (row.user_roles || []).map((ur) => {
                    const matchedRole = availableRoles.find((r) => r.name === ur.roles.name);
                    return matchedRole?.id;
                  }).filter(Boolean) as string[];
                  setEditSelectedRoles(userRoleIds);
                  setEditingUser(row);
               }} className="h-8 w-8 hover:bg-zinc-100 dark:bg-zinc-800 hover:text-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-900 dark:bg-zinc-100/10">
                 <Edit className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(row.id)} className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                 <Trash2 className="w-4 h-4" />
              </Button>
           </div>
        )
     }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/50 dark:bg-zinc-900/50 p-6 apple-card backdrop-blur-xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-zinc-100 dark:to-zinc-500 bg-clip-text text-transparent">User Profiles</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Manage network access and role assignments.</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5 rounded-xl px-5 h-10">
              <Plus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription className="text-sm text-zinc-500">Fill in the details below to create a new user account.</DialogDescription>
            </DialogHeader>
            <form action={handleCreateUser} className="space-y-4">
               {/* Same form mapping but explicit load states */}
               <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required className="mt-1" disabled={isSubmitting} maxLength={320} />
               </div>
               <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" name="fullName" required className="mt-1" disabled={isSubmitting} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" type="tel" className="mt-1" disabled={isSubmitting} />
                  </div>
                  <div>
                    <Label htmlFor="avatarUrl">Avatar URL</Label>
                    <Input id="avatarUrl" name="avatarUrl" type="url" className="mt-1" disabled={isSubmitting} />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" name="password" type="password" minLength={8} required className="mt-1" disabled={isSubmitting} />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required className="mt-1" disabled={isSubmitting} />
                  </div>
               </div>
               <div>
                  <Label>Organizational Roles</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {availableRoles.map((role) => (
                      <div key={role.id} className="flex items-center space-x-2 bg-zinc-50 dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50">
                        <Checkbox
                          id={`create-role-${role.id}`}
                          checked={createSelectedRoles.includes(role.id)}
                          onCheckedChange={(checked) => {
                            setCreateSelectedRoles((prev) =>
                              checked ? [...prev, role.id] : prev.filter((id) => id !== role.id)
                            );
                          }}
                          disabled={isSubmitting}
                        />
                        <Label htmlFor={`create-role-${role.id}`} className="text-sm font-medium cursor-pointer">
                          {ROLE_LABELS[role.name]}
                        </Label>
                      </div>
                    ))}
                  </div>
               </div>
               <div className="pt-2">
                 <Button type="submit" disabled={isSubmitting} className="w-full bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white shadow-md shadow-indigo-600/20">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Assign Profile Logic
                 </Button>
               </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile Bindings</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500">Update user details and role assignments.</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form action={handleUpdateUser} className="space-y-4">
               <div>
                  <Label htmlFor="edit-fullName">Full Name</Label>
                  <Input id="edit-fullName" name="fullName" defaultValue={editingUser.full_name} required className="mt-1" disabled={isSubmitting} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input id="edit-phone" name="phone" defaultValue={editingUser.phone || ""} type="tel" className="mt-1" disabled={isSubmitting} />
                  </div>
                  <div>
                    <Label htmlFor="edit-avatarUrl">Avatar Payload</Label>
                    <Input id="edit-avatarUrl" name="avatarUrl" defaultValue={editingUser.avatar_url || ""} type="url" className="mt-1" disabled={isSubmitting} />
                  </div>
               </div>
               <div>
                  <Label>Organizational Roles</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {availableRoles.map((role) => (
                        <div key={role.id} className="flex items-center space-x-2 bg-zinc-50 dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50">
                          <Checkbox
                            id={`edit-role-${role.id}`}
                            checked={editSelectedRoles.includes(role.id)}
                            onCheckedChange={(checked) => {
                              setEditSelectedRoles((prev) =>
                                checked ? [...prev, role.id] : prev.filter((id) => id !== role.id)
                              );
                            }}
                            disabled={isSubmitting}
                          />
                          <Label htmlFor={`edit-role-${role.id}`} className="text-sm cursor-pointer">
                            {ROLE_LABELS[role.name]}
                          </Label>
                        </div>
                    ))}
                  </div>
               </div>
               <div className="pt-2">
                 <Button type="submit" disabled={isSubmitting} className="w-full bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white shadow-md shadow-indigo-600/20">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Force Mutation Update
                 </Button>
               </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Replaced complex mappings utilizing elegant standardized Pagination/Filter framework natively! */}
      <DataTable 
         data={users} 
         columns={columns} 
         searchKey="full_name" 
         searchPlaceholder="Search profiles explicitly by name..."
         pageSize={8}
      />
    </div>
  );
}
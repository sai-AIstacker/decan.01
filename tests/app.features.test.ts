import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  validateEmail,
  validatePassword,
  validatePhone,
} from "@/lib/validation/form-validators";

const { getSessionProfileMock, createClientMock, revalidatePathMock } =
  vi.hoisted(() => ({
    getSessionProfileMock: vi.fn(),
    createClientMock: vi.fn(),
    revalidatePathMock: vi.fn(),
  }));

vi.mock("@/lib/auth/profile", async () => {
  const actual = await vi.importActual("@/lib/auth/profile");
  return {
    ...(actual as object),
    getSessionProfile: getSessionProfileMock,
  };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import {
  createClassAdminAction,
  deleteClassAdminAction,
} from "@/app/actions/classes";
import {
  activateAcademicYearAdminAction,
  createAcademicYearAdminAction,
} from "@/app/actions/academic-years";
import {
  createUserAdminAction,
  deleteUserAdminAction,
  updateUserAdminAction,
} from "@/app/actions/users";
import {
  canConfigureSchool,
  hasRole,
  isAdmin,
} from "@/lib/auth/profile";

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
});

describe("Role utilities", () => {
  it("supports role checks", () => {
    const roles = ["admin", "teacher"] as const;
    expect(hasRole(roles, "admin")).toBe(true);
    expect(isAdmin(roles)).toBe(true);
    expect(canConfigureSchool(roles)).toBe(true);
    expect(hasRole(roles, "student")).toBe(false);
  });
});

describe("Validation utilities", () => {
  it("validates key auth fields", () => {
    expect(validateEmail("john@school.org")).toBe(true);
    expect(validateEmail("broken-email")).toBe(false);

    const goodPassword = validatePassword("StrongPass123", 8);
    expect(goodPassword.isValid).toBe(true);

    const badPassword = validatePassword("weak", 8);
    expect(badPassword.isValid).toBe(false);

    expect(validatePhone("+1 (555) 111-2222").isValid).toBe(true);
    expect(validatePhone("abc").isValid).toBe(false);
  });
});

describe("Classes actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks unauthorized users from creating class", async () => {
    getSessionProfileMock.mockResolvedValue({
      profile: { roles: ["teacher"] },
    });

    await expect(
      createClassAdminAction({
        name: "Grade 7",
        section: "A",
        academicYearId: "year-1",
        classTeacherId: "teacher-1",
      })
    ).rejects.toThrow("Unauthorized access");
  });

  it("creates class for configurator role", async () => {
    getSessionProfileMock.mockResolvedValue({
      profile: { roles: ["app_config"] },
    });

    const single = vi.fn().mockResolvedValue({
      data: {
        id: "class-1",
        name: "Grade 7",
        section: "A",
        academic_year_id: "year-1",
        class_teacher_id: "teacher-1",
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const eq = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn().mockReturnValue({ eq });
    const from = vi.fn((table: string) => {
      if (table === "classes") return { insert, delete: del };
      return {};
    });
    createClientMock.mockReturnValue({ from });

    const created = await createClassAdminAction({
      name: "Grade 7",
      section: "A",
      academicYearId: "year-1",
      classTeacherId: "teacher-1",
    });

    expect(created.id).toBe("class-1");
    expect(insert).toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/classes");
  });

  it("deletes class for configurator role", async () => {
    getSessionProfileMock.mockResolvedValue({
      profile: { roles: ["admin"] },
    });

    const eq = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn().mockReturnValue({ eq });
    const from = vi.fn(() => ({ delete: del }));
    createClientMock.mockReturnValue({ from });

    await expect(deleteClassAdminAction("class-1")).resolves.toEqual({
      success: true,
    });
  });
});

describe("Academic year actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates academic year for admin", async () => {
    getSessionProfileMock.mockResolvedValue({
      profile: { roles: ["admin"] },
    });

    const single = vi.fn().mockResolvedValue({
      data: {
        id: "year-1",
        name: "2026-2027",
        is_active: false,
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn(() => ({ insert, update }));
    createClientMock.mockReturnValue({ from });

    const created = await createAcademicYearAdminAction({
      name: "2026-2027",
      startDate: "2026-04-01",
      endDate: "2027-03-31",
    });

    expect(created.id).toBe("year-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/academic-years");
  });

  it("activates selected academic year", async () => {
    getSessionProfileMock.mockResolvedValue({
      profile: { roles: ["admin"] },
    });

    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn(() => ({ update }));
    createClientMock.mockReturnValue({ from });

    await expect(activateAcademicYearAdminAction("year-1")).resolves.toEqual({
      success: true,
    });
  });
});

describe("User management actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks unauthorized user creation", async () => {
    getSessionProfileMock.mockResolvedValue({
      profile: { roles: ["teacher"] },
    });

    await expect(
      createUserAdminAction({
        email: "new@school.org",
        fullName: "New User",
        phone: "",
        avatarUrl: "",
        password: "StrongPass123",
        roles: [],
      })
    ).rejects.toThrow("Unauthorized access");
  });

  it("creates, updates and deletes user for admin", async () => {
    getSessionProfileMock.mockResolvedValue({
      profile: { roles: ["admin"] },
    });

    const from = vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          upsert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "user_roles") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    });

    const authAdmin = {
      createUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      }),
      deleteUser: vi.fn().mockResolvedValue({ error: null }),
    };

    createClientMock.mockReturnValue({
      from,
      auth: { admin: authAdmin },
    });

    const created = await createUserAdminAction({
      email: "new@school.org",
      fullName: "New User",
      phone: "5551234567",
      avatarUrl: "https://example.com/avatar.png",
      password: "StrongPass123",
      roles: [],
    });
    expect(created.success).toBe(true);

    await expect(
      updateUserAdminAction({
        userId: "user-1",
        fullName: "Updated User",
        phone: "5551234567",
        avatarUrl: "https://example.com/avatar.png",
        roles: [],
      })
    ).resolves.toEqual({ success: true });

    await expect(deleteUserAdminAction("user-1")).resolves.toEqual({
      success: true,
    });
  });
});

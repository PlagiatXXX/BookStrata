import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../lib/prisma.js", () => {
  const tx = {
    role: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  };
  return { prisma: tx };
});

import { RolesService } from "./roles.service.js";
import { prisma } from "../../lib/prisma.js";
import { setConfig } from "../../config/env.js";

describe("RolesService", () => {
  let rolesService: RolesService;

  beforeEach(() => {
    vi.clearAllMocks();
    rolesService = new RolesService(prisma as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const mockRoles = [
    { id: 1, name: "admin", description: "Administrator" },
    { id: 2, name: "moderator", description: "Moderator" },
    { id: 3, name: "user", description: "Regular user" },
  ];

  describe("getAllRoles", () => {
    it("должен вернуть все роли", async () => {
      (prisma.role.findMany as any).mockResolvedValue(mockRoles);

      const result = await rolesService.getAllRoles();

      expect(prisma.role.findMany).toHaveBeenCalledWith({ orderBy: { id: "asc" } });
      expect(result).toEqual(mockRoles);
    });

    it("должен вернуть пустой массив если ролей нет", async () => {
      (prisma.role.findMany as any).mockResolvedValue([]);

      const result = await rolesService.getAllRoles();

      expect(result).toEqual([]);
    });
  });

  describe("getRoleByName", () => {
    it("должен найти роль по имени", async () => {
      (prisma.role.findUnique as any).mockResolvedValue(mockRoles[0]);

      const result = await rolesService.getRoleByName("admin");

      expect(prisma.role.findUnique).toHaveBeenCalledWith({ where: { name: "admin" } });
      expect(result).toEqual(mockRoles[0]);
    });

    it("должен вернуть null если роль не найдена", async () => {
      (prisma.role.findUnique as any).mockResolvedValue(null);

      const result = await rolesService.getRoleByName("admin");

      expect(result).toBeNull();
    });
  });

  describe("getUserRole", () => {
    it("должен вернуть роль пользователя", async () => {
      const mockUser = {
        createdAt: new Date("2024-01-01"),
        role: { id: 3, name: "user", description: "Regular user" },
      };
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      const result = await rolesService.getUserRole(1);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          createdAt: true,
          role: { select: { id: true, name: true, description: true } },
        },
      });
      expect(result).toEqual({
        id: 3,
        name: "user",
        description: "Regular user",
        grantedAt: mockUser.createdAt,
        grantedBy: null,
      });
    });

    it("должен вернуть null если пользователь не найден", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const result = await rolesService.getUserRole(999);

      expect(result).toBeNull();
    });

    it("должен вернуть null если у пользователя нет роли", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ createdAt: new Date(), role: null });

      const result = await rolesService.getUserRole(1);

      expect(result).toBeNull();
    });
  });

  describe("assignRole", () => {
    const mockUserRole = { id: 3, name: "user", description: "Regular user" };
    const mockAdminRole = { id: 1, name: "admin", description: "Administrator" };
    const mockUpdatedUser = {
      id: 1,
      role: { id: 1, name: "admin", description: "Administrator" },
    };

    beforeEach(() => {
      setConfig({ ADMIN_ROLE_CHANGE_SECRET: undefined });
    });

    it("должен назначить роль пользователю (без проверки пароля)", async () => {
      (prisma.role.findUnique as any).mockResolvedValue(mockAdminRole);
      (prisma.user.update as any).mockResolvedValue(mockUpdatedUser);

      const result = await rolesService.assignRole(1, "admin", 42);

      expect(prisma.role.findUnique).toHaveBeenCalledWith({ where: { name: "admin" } });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { roleId: 1 },
        include: { role: true },
      });
      expect(result).toMatchObject({
        id: 1,
        name: "admin",
        description: "Administrator",
        grantedBy: 42,
      });
    });

    it("должен вернуть null если роль не найдена", async () => {
      (prisma.role.findUnique as any).mockResolvedValue(null);

      const result = await rolesService.assignRole(1, "admin");

      expect(result).toBeNull();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("должен вернуть null если у обновлённого пользователя нет role", async () => {
      (prisma.role.findUnique as any).mockResolvedValue(mockUserRole);
      (prisma.user.update as any).mockResolvedValue({ id: 1, role: null });

      const result = await rolesService.assignRole(1, "user");

      expect(result).toBeNull();
    });

    it("должен требовать пароль если установлен ADMIN_ROLE_CHANGE_SECRET", async () => {
      setConfig({ ADMIN_ROLE_CHANGE_SECRET: "secret123" });
      (prisma.role.findUnique as any).mockResolvedValue(mockAdminRole);

      await expect(rolesService.assignRole(1, "admin", 42, "")).rejects.toThrow(
        "Неверный пароль для смены роли",
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("должен принять правильный пароль", async () => {
      setConfig({ ADMIN_ROLE_CHANGE_SECRET: "secret123" });
      (prisma.role.findUnique as any).mockResolvedValue(mockAdminRole);
      (prisma.user.update as any).mockResolvedValue(mockUpdatedUser);

      const result = await rolesService.assignRole(1, "admin", 42, "secret123");

      expect(result).toBeDefined();
      expect(result!.name).toBe("admin");
    });
  });

  describe("removeRole", () => {
    it("должен снять роль с пользователя", async () => {
      (prisma.user.update as any).mockResolvedValue({ id: 1, roleId: null });

      await rolesService.removeRole(1);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { roleId: null },
      });
    });
  });

  describe("hasRole", () => {
    it("должен вернуть true если роль совпадает", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ role: { name: "admin" } });

      const result = await rolesService.hasRole(1, "admin");

      expect(result).toBe(true);
    });

    it("должен вернуть false если роль не совпадает", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ role: { name: "user" } });

      const result = await rolesService.hasRole(1, "admin");

      expect(result).toBe(false);
    });

    it("должен вернуть false если у пользователя нет роли", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ role: null });

      const result = await rolesService.hasRole(1, "admin");

      expect(result).toBe(false);
    });

    it("должен вернуть false если пользователь не найден", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const result = await rolesService.hasRole(999, "admin");

      expect(result).toBe(false);
    });
  });

  describe("isAdminOrModerator", () => {
    it("должен вернуть true для admin", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ role: { name: "admin" } });

      const result = await rolesService.isAdminOrModerator(1);

      expect(result).toBe(true);
    });

    it("должен вернуть true для moderator", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ role: { name: "moderator" } });

      const result = await rolesService.isAdminOrModerator(1);

      expect(result).toBe(true);
    });

    it("должен вернуть false для user", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ role: { name: "user" } });

      const result = await rolesService.isAdminOrModerator(1);

      expect(result).toBe(false);
    });

    it("должен вернуть false если у пользователя нет роли", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ role: null });

      const result = await rolesService.isAdminOrModerator(1);

      expect(result).toBe(false);
    });
  });

  describe("getUsersByRole", () => {
    it("должен вернуть пользователей с ролью", async () => {
      const mockUsers = [
        { id: 1, email: "admin@test.com", username: "admin", roleId: 1 },
      ];
      (prisma.role.findUnique as any).mockResolvedValue(mockRoles[0]);
      (prisma.user.findMany as any).mockResolvedValue(mockUsers);

      const result = await rolesService.getUsersByRole("admin");

      expect(prisma.role.findUnique).toHaveBeenCalledWith({ where: { name: "admin" } });
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { roleId: 1 },
        select: { id: true, email: true, username: true, roleId: true },
      });
      expect(result).toEqual(mockUsers);
    });

    it("должен вернуть пустой массив если роль не найдена", async () => {
      (prisma.role.findUnique as any).mockResolvedValue(null);

      const result = await rolesService.getUsersByRole("admin");

      expect(result).toEqual([]);
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });
  });
});

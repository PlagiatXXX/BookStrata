export const USERS = {
  admin: {
    username: "e2e_chief",
    email: "e2e_chief@test.com",
    password: "StrongPass1!",
  },
  user: {
    username: "e2e_member",
    email: "e2e_member@test.com",
    password: "StrongPass2!",
  },
} as const;

export const ROUTES = {
  login: "/auth",
  register: "/auth?mode=register",
  dashboard: "/dashboard",
  profile: "/profile",
  newTierList: "/tier-lists/new",
  adminDashboard: "/admin",
  discussions: "/discussions",
  battles: "/battles",
  pricing: "/pricing",
  templates: "/templates",
  forgotPassword: "/forgot-password",
} as const;

export const TIER_NAMES = ["S", "A", "B", "C", "D"] as const;

export const MOCK_BOOK = {
  title: "Тестовая книга",
  author: "Тестовый Автор",
};

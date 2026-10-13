import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";

const ApplicationsListView = () =>
  import("@/views/applications/ApplicationsListView.vue");

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/applications",
  },
  {
    path: "/applications",
    name: "applications",
    component: ApplicationsListView,
    meta: { requiresAuth: true },
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/applications",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    // Demo: auto-seed happens in main.ts; if missing, stay on apps after seed
    return true;
  }
  return true;
});

export default router;

import { createApp } from "vue";
import App from "./App.vue";
import "./styles/main.css";
import { createPinia } from "pinia";
import router from "@/router";
import { useAuthStore } from "@/stores/auth.store";
import { DEMO_ROLE, DEMO_USER } from "@/mock/data";

import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import "@mdi/font/css/materialdesignicons.css";

async function enableMock() {
  const { worker } = await import("@/mock/browser");
  await worker.start({
    onUnhandledRequest: "bypass",
    serviceWorker: { url: "/mockServiceWorker.js" },
  });
}

function seedDemoAuth() {
  const auth = useAuthStore();
  auth.token = "demo-token";
  auth.tokenType = "Bearer";
  auth.email = DEMO_USER.email;
  auth.currentUser = DEMO_USER as typeof auth.currentUser;
  auth.userRole = DEMO_ROLE as typeof auth.userRole;
  localStorage.setItem("token", auth.token);
  localStorage.setItem("tokenType", auth.tokenType);
  localStorage.setItem("email", auth.email);
  localStorage.setItem("currentUser", JSON.stringify(DEMO_USER));
  localStorage.setItem("userRole", JSON.stringify(DEMO_ROLE));
}

async function bootstrap() {
  await enableMock();

  const vuetify = createVuetify({ components, directives });
  const app = createApp(App);
  const pinia = createPinia();

  app.use(pinia);
  app.use(router);
  app.use(vuetify);

  seedDemoAuth();
  useAuthStore().restoreUser();

  app.mount("#app");
}

bootstrap();

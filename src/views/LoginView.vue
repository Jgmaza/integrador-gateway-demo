<template>
  <v-container fluid class="fill-height pa-0" style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%);">
    <v-row no-gutters class="fill-height justify-center align-center">
      <v-col cols="12" sm="10" md="6" lg="5" xl="4">
        <v-card
          elevation="12"
          rounded="lg"
          class="mx-4"
        >
          <!-- Header con logo -->
          <v-card-text class="text-center pa-8 pb-4">
            <div class="mb-4">
              <v-avatar
                size="100"
                color="primary"
                class="mb-4"
              >
                <v-icon size="60" color="white">mdi-factory</v-icon>
              </v-avatar>
            </div>
            <h1 class="text-h5 font-weight-bold text-primary mb-2">
              Ministerio de Minas y Energía
            </h1>
            <p class="text-body-2 text-medium-emphasis">
              República de Colombia
            </p>
            <v-divider class="my-6"></v-divider>
            <h2 class="text-h6 font-weight-medium mb-1">Iniciar sesión</h2>
            <p class="text-body-2 text-medium-emphasis">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </v-card-text>

          <v-card-text class="px-8 pb-8">
            <v-form ref="formRef" v-model="formValid" @submit.prevent="submit">
              <v-text-field
                v-model="email"
                label="Correo electrónico"
                type="email"
                prepend-inner-icon="mdi-email-outline"
                variant="outlined"
                color="primary"
                required
                autocomplete="username"
                :disabled="loading"
                :rules="emailRules"
                class="mb-4"
              ></v-text-field>

              <v-text-field
                v-model="password"
                label="Contraseña"
                :type="showPassword ? 'text' : 'password'"
                prepend-inner-icon="mdi-lock-outline"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showPassword = !showPassword"
                variant="outlined"
                color="primary"
                required
                autocomplete="current-password"
                :disabled="loading"
                :rules="passwordRules"
                class="mb-2"
              ></v-text-field>

              <div class="d-flex justify-space-between align-center mb-6">
                <v-checkbox
                  label="Recordarme"
                  color="primary"
                  hide-details
                  density="compact"
                ></v-checkbox>
                <a
                  href="#"
                  class="text-primary text-decoration-none text-body-2"
                  @click.prevent
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              <v-alert
                v-if="error"
                type="error"
                variant="tonal"
                closable
                class="mb-4"
              >
                {{ error }}
              </v-alert>

              <v-btn
                type="submit"
                color="primary"
                size="large"
                block
                :loading="loading"
                :disabled="loading || !formValid"
                elevation="2"
                class="mb-4"
              >
                {{ loading ? "Entrando..." : "Iniciar sesión" }}
              </v-btn>

              <div class="text-center">
                <p class="text-caption text-medium-emphasis">
                  Sistema de Gestión Interna
                </p>
              </div>
            </v-form>
          </v-card-text>
        </v-card>

        <!-- Footer -->
        <div class="text-center mt-4 px-4">
          <p class="text-caption white--text" style="color: rgba(255,255,255,0.8);">
            © 2025 Ministerio de Minas y Energía - Todos los derechos reservados
          </p>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "@/stores/auth.store";
import api from "@/api/http";

const auth = useAuthStore();
const email = ref("user@example.com");
const password = ref("");
const showPassword = ref(false);
const loading = ref(false);
const error = ref("");
const formRef = ref(null);
const formValid = ref(false);

// Validaciones que coinciden con el backend
const emailRules = [
  (v: string) => !!v || 'El correo electrónico es requerido',
  (v: string) => /.+@.+\..+/.test(v) || 'El correo electrónico debe ser válido',
];

const passwordRules = [
  (v: string) => !!v || 'La contraseña es requerida',
  (v: string) => v.length >= 8 || 'La contraseña debe tener al menos 8 caracteres',
  (v: string) => /[A-Z]/.test(v) || 'La contraseña debe contener al menos una mayúscula',
  (v: string) => /[a-z]/.test(v) || 'La contraseña debe contener al menos una minúscula',
  (v: string) => /\d/.test(v) || 'La contraseña debe contener al menos un número',
];

const submit = async () => {
  if (!formRef.value) return;
  
  const { valid } = await formRef.value.validate();
  if (!valid) return;

  loading.value = true;
  error.value = "";
  
  try {
    await auth.login({ email: email.value, password: password.value });
  } catch (e: any) {
    error.value = e?.response?.data?.message || "No se pudo iniciar sesión";
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.fill-height {
  min-height: 100vh;
}
</style>
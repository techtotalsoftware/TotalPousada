import { TenantPlan, hasPlanAccess } from "./plan-enum";

/**
 * Define quais funcionalidades estão disponíııveiss para cada plano
 */
export enum Feature {
  // Funcionalidades Basic
  RESERVATIONS = "reservations",
  ROOMS = "rooms",
  CALENDAR = "calendar",
  GUESTS = "guests",
  CHECK_IN_OUT = "check_in_out",

  // Funcionalidades Premium
  FINANCE = "finance",
  PROMOTIONS = "promotions",
  ADDONS = "addons",
  GALLERY = "gallery",
  BASIC_REPORTS = "basic_reports",

  // Funcionalidades Enterprise
  TEAM_MANAGEMENT = "team_management",
  ADVANCED_REPORTS = "advanced_reports",
  API_ACCESS = "api_access",
  AUTOMATION = "automation",
}

/**
 * Define o plano mí­nimo necessário para acessar cada feature
 */
export const FEATURE_REQUIREMENTS: Record<Feature, TenantPlan> = {
  // Basic
  [Feature.RESERVATIONS]: TenantPlan.BASIC,
  [Feature.ROOMS]: TenantPlan.BASIC,
  [Feature.CALENDAR]: TenantPlan.BASIC,
  [Feature.GUESTS]: TenantPlan.BASIC,
  [Feature.CHECK_IN_OUT]: TenantPlan.BASIC,

  // Premium
  [Feature.FINANCE]: TenantPlan.PREMIUM,
  [Feature.PROMOTIONS]: TenantPlan.PREMIUM,
  [Feature.ADDONS]: TenantPlan.PREMIUM,
  [Feature.GALLERY]: TenantPlan.PREMIUM,
  [Feature.BASIC_REPORTS]: TenantPlan.PREMIUM,

  // Enterprise
  [Feature.TEAM_MANAGEMENT]: TenantPlan.ENTERPRISE,
  [Feature.ADVANCED_REPORTS]: TenantPlan.ENTERPRISE,
  [Feature.API_ACCESS]: TenantPlan.ENTERPRISE,
  [Feature.AUTOMATION]: TenantPlan.ENTERPRISE,
};

/**
 * Verifica se um tenant tem acesso a uma feature especíııfica
 * @param tenantPlan - O plano do tenant
 * @param feature - A feature que deseja acessar
 * @returns boolean - true se tem acesso
 */
export function hasFeatureAccess(
  tenantPlan: TenantPlan,
  feature: Feature
): boolean {
  const requiredPlan = FEATURE_REQUIREMENTS[feature];
  return hasPlanAccess(tenantPlan, requiredPlan);
}

/**
 * Retorna todas as features disponíııveiss para um plano
 * @param tenantPlan - O plano do tenant
 * @returns Feature[] - Array de features disponíııveiss
 */
export function getAvailableFeatures(tenantPlan: TenantPlan): Feature[] {
  return Object.values(Feature).filter((feature) =>
    hasFeatureAccess(tenantPlan, feature)
  );
}

/**
 * Middleware helper para verificar acesso a features em rotas API
 * Lançªıa erro 403 se o tenant não tiver acesso
 * 
 * @throws Error - Se o tenant não tiver acesso à feature
 */
export function ensureFeatureAccess(
  tenantPlan: TenantPlan,
  feature: Feature
): void {
  if (!hasFeatureAccess(tenantPlan, feature)) {
    throw new Error(
      `Acesso negado: A feature ${feature} requer o plano ${FEATURE_REQUIREMENTS[feature]}. Seu plano atual é ${tenantPlan}`
    );
  }
}

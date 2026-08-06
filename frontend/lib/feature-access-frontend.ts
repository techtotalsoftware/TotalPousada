import { TenantPlan, hasPlanAccess } from "./plan-enum-frontend";

/**
 * Define quais funcionalidades estão disponíııveiss para cada plano
 */
export enum Feature {
  // Basic
  RESERVATIONS = "reservations",
  ROOMS = "rooms",
  CALENDAR = "calendar",
  GUESTS = "guests",
  CHECK_IN_OUT = "check_in_out",

  // Premium
  FINANCE = "finance",
  PROMOTIONS = "promotions",
  ADDONS = "addons",
  GALLERY = "gallery",
  BASIC_REPORTS = "basic_reports",

  // Enterprise
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
 */
export function getAvailableFeatures(tenantPlan: TenantPlan): Feature[] {
  return Object.values(Feature).filter((feature) =>
    hasFeatureAccess(tenantPlan, feature)
  );
}

/**
 * Hook helper para usar em componentes React
 * Retorna um objeto com helpers para verificar acesso a features
 */
export function useFeatureAccess(tenantPlan: TenantPlan | undefined) {
  return {
    canAccess: (feature: Feature): boolean => {
      if (!tenantPlan) return false;
      return hasFeatureAccess(tenantPlan, feature);
    },
    availableFeatures: tenantPlan ? getAvailableFeatures(tenantPlan) : [],
    isBasic: tenantPlan === TenantPlan.BASIC,
    isPremium: tenantPlan === TenantPlan.PREMIUM,
    isEnterprise: tenantPlan === TenantPlan.ENTERPRISE,
  };
}

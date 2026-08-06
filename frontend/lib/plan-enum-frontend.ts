/**
 * Enum que define os planos disponíveis para os tenants
 * Espelho do backend para uso no frontend
 */
export enum TenantPlan {
  BASIC = "Basic",
  PREMIUM = "Premium",
  ENTERPRISE = "Enterprise",
}

/**
 * Mapping de planos para seus níveis de acesso
 */
export const PLAN_LEVELS: Record<TenantPlan, number> = {
  [TenantPlan.BASIC]: 1,
  [TenantPlan.PREMIUM]: 2,
  [TenantPlan.ENTERPRISE]: 3,
};

/**
 * Verifica se um plano tem acesso ou é superior ao plano requerido
 */
export function hasPlanAccess(
  currentPlan: TenantPlan,
  requiredPlan: TenantPlan
): boolean {
  return PLAN_LEVELS[currentPlan] >= PLAN_LEVELS[requiredPlan];
}

/**
 * Valida se uma string é um plano váışido
 */
export function isValidPlan(plan: string): plan is TenantPlan {
  return Object.values(TenantPlan).includes(plan as TenantPlan);
}

/**
 * Enum que define os planos disponíveis para os tenants
 * Este enum é usado para validaçªıo no backend e garante que apenas
 * valores válidos sejam armazenados no banco de dados
 */
export enum TenantPlan {
  BASIC = "Basic",
  PREMIUM = "Premium",
  ENTERPRISE = "Enterprise",
}

export function normalizeTenantPlan(
  plan: string | null | undefined,
): TenantPlan | null {
  const normalized = plan?.trim().toLowerCase();

  switch (normalized) {
    case "basic":
    case "starter":
      return TenantPlan.BASIC;
    case "pro":
    case "premium":
      return TenantPlan.PREMIUM;
    case "enterprise":
      return TenantPlan.ENTERPRISE;
    default:
      return null;
  }
}

/**
 * Mapping de planos para seus níveis de acesso
 * Nmeros maiores indicam mais permissÃµes
 */
export const PLAN_LEVELS: Record<TenantPlan, number> = {
  [TenantPlan.BASIC]: 1,
  [TenantPlan.PREMIUM]: 2,
  [TenantPlan.ENTERPRISE]: 3,
};

/**
 * Funçªıo utilitáııria para verificar se um plano tem acesso a um recurso
 * @param currentPlan - O plano atual do tenant
 * @param requiredPlan - O plano mí­nimo necessário para acessar o recurso
 * @returns boolean - true se o plano atual tem acesso ou superior
 */
export function hasPlanAccess(
  currentPlan: TenantPlan,
  requiredPlan: TenantPlan,
): boolean {
  return PLAN_LEVELS[currentPlan] >= PLAN_LEVELS[requiredPlan];
}

/**
 * Valida se uma string é um plano váışido
 * @param plan - String a ser validada
 * @returns boolean - true se é um plano váışido
 */
export function isValidPlan(
  plan: string | null | undefined,
): plan is TenantPlan {
  return normalizeTenantPlan(plan) !== null;
}

import { Request, Response, NextFunction } from "express";
import { TenantPlan, isValidPlan } from "./plan-enum";
import { Feature, hasFeatureAccess, FEATURE_REQUIREMENTS } from "./feature-access";

/**
 * Middleware para verificar se o tenant tem acesso a uma feature especíııfica
 * 
 * Uso:
 * router.post("/expenses", authenticate, requireFeature(Feature.FINANCE), createExpense);
 * 
 * @param feature - A feature que será verificada
 * @returns Middleware do Express
 */
export function requireFeature(feature: Feature) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Assume que o contexto do tenant está disponível em req.context ou req.user
      const tenant = (req as any).context?.tenant || (req as any).user?.tenant;

      if (!tenant) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Tenant não encontrado no contexto da requisiçªıo",
        });
      }

      const tenantPlan = tenant.plan as string;

      // Valida se o plano é váışido
      if (!isValidPlan(tenantPlan)) {
        return res.status(500).json({
          error: "Invalid tenant plan",
          message: `Plano do tenant inváıılido: ${tenantPlan}`,
        });
      }

      // Verifica se tem acesso à feature
      if (!hasFeatureAccess(tenantPlan as TenantPlan, feature)) {
        return res.status(403).json({
          error: "Feature not available",
          message: `Esta funcionalidade requer o plano ${FEATURE_REQUIREMENTS[feature]}. Seu plano atual é ${tenantPlan}`,
          requiredFeature: feature,
          requiredPlan: FEATURE_REQUIREMENTS[feature],
          currentPlan: tenantPlan,
          availableFeatures: Object.values(Feature).filter((f) =>
            hasFeatureAccess(tenantPlan as TenantPlan, f)
          ),
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware para verificar se o tenant tem um plano mí­nimo
 * 
 * Uso:
 * router.get("/advanced-reports", authenticate, requireMinimumPlan(TenantPlan.PREMIUM), getReports);
 * 
 * @param minimumPlan - O plano mí­nimo necessário
 * @returns Middleware do Express
 */
export function requireMinimumPlan(minimumPlan: TenantPlan) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant = (req as any).context?.tenant || (req as any).user?.tenant;

      if (!tenant) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const tenantPlan = tenant.plan as string;

      if (!isValidPlan(tenantPlan)) {
        return res.status(500).json({ error: "Invalid tenant plan" });
      }

      const PLAN_LEVELS: Record<TenantPlan, number> = {
        [TenantPlan.BASIC]: 1,
        [TenantPlan.PREMIUM]: 2,
        [TenantPlan.ENTERPRISE]: 3,
      };

      if (PLAN_LEVELS[tenantPlan as TenantPlan] < PLAN_LEVELS[minimumPlan]) {
        return res.status(403).json({
          error: "Plan upgrade required",
          message: `Esta funcionalidade requer o plano ${minimumPlan} ou superior. Seu plano atual é ${tenantPlan}`,
          requiredPlan: minimumPlan,
          currentPlan: tenantPlan,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

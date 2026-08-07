import { TenantPlan } from "./plan-enum";
import { Feature, ensureFeatureAccess } from "./feature-access";

type CreateTeamInput = {
  name: string;
  role: string;
  email: string;
  permissions: string[];
};

type Context = {
  tenant: {
    id: string;
    plan: string;
  };
  user: {
    id: string;
  };
};

/**
 * Cria um novo membro de equipe
 * 
 * IMPORTANTE: Esta função só pode ser acessada por tenants com plano Enterprise
 * Team management é uma feature exclusiva do plano Enterprise
 */
export async function createTeamMember(
  data: CreateTeamInput,
  context: Context
) {
  const { tenant } = context;

  // VALIDAÇªÍıO: Team management é Enterprise
  ensureFeatureAccess(tenant.plan as TenantPlan, Feature.TEAM_MANAGEMENT);

  // Validaåııes adicionais
  if (!data.name || data.name.trim().length === 0) {
    throw new Error("Nome é obrigatï¿½rio");
  }

  if (!data.email || !data.email.includes("@")) {
    throw new Error("Email válido é obrigatï¿½rio");
  }

  throw new Error("Este módulo de equipe está desativado no fluxo atual do app. Use as rotas do backend Sequelize.");
}

/**
 * Lista membros da equipe do tenant
 */
export async function listTeamMembers(context: Context) {
  const { tenant } = context;

  // VALIDAÇªÍıO: Team management é Enterprise
  ensureFeatureAccess(tenant.plan as TenantPlan, Feature.TEAM_MANAGEMENT);

  throw new Error("Este módulo de equipe está desativado no fluxo atual do app. Use as rotas do backend Sequelize.");
}

/**
 * Deleta um membro da equipe
 */
export async function deleteTeamMember(
  teamMemberId: string,
  context: Context
) {
  const { tenant } = context;

  // VALIDAÇªÍıO: Team management é Enterprise
  ensureFeatureAccess(tenant.plan as TenantPlan, Feature.TEAM_MANAGEMENT);

  throw new Error("Este módulo de equipe está desativado no fluxo atual do app. Use as rotas do backend Sequelize.");
}

/**
 * Atualiza um membro da equipe
 */
export async function updateTeamMember(
  teamMemberId: string,
  data: Partial<CreateTeamInput>,
  context: Context
) {
  const { tenant } = context;

  // VALIDAÇªÍıO: Team management é Enterprise
  ensureFeatureAccess(tenant.plan as TenantPlan, Feature.TEAM_MANAGEMENT);

  throw new Error("Este módulo de equipe está desativado no fluxo atual do app. Use as rotas do backend Sequelize.");
}

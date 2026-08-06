import { prisma } from "./db";
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

  // Cria o membro da equipe
  const teamMember = await prisma.teamMember.create({
    data: {
      name: data.name,
      role: data.role,
      email: data.email,
      permissions: data.permissions,
      tenantId: tenant.id,
      createdBy: context.user.id,
    },
  });

  return teamMember;
}

/**
 * Lista membros da equipe do tenant
 */
export async function listTeamMembers(context: Context) {
  const { tenant } = context;

  // VALIDAÇªÍıO: Team management é Enterprise
  ensureFeatureAccess(tenant.plan as TenantPlan, Feature.TEAM_MANAGEMENT);

  const teamMembers = await prisma.teamMember.findMany({
    where: {
      tenantId: tenant.id,
    },
    orderBy: { createdAt: "desc" },
  });

  return teamMembers;
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

  // Verifica se o membro pertence ao tenant
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      id: teamMemberId,
      tenantId: tenant.id,
    },
  });

  if (!teamMember) {
    throw new Error("Membro da equipe não encontrado");
  }

  await prisma.teamMember.delete({
    where: { id: teamMemberId },
  });

  return { success: true };
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

  // Verifica se o membro pertence ao tenant
  const existingMember = await prisma.teamMember.findFirst({
    where: {
      id: teamMemberId,
      tenantId: tenant.id,
    },
  });

  if (!existingMember) {
    throw new Error("Membro da equipe não encontrado");
  }

  // Valida email se estiver sendo atualizado
  if (data.email && !data.email.includes("@")) {
    throw new Error("Email válido é obrigatï¿½rio");
  }

  const teamMember = await prisma.teamMember.update({
    where: { id: teamMemberId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.role && { role: data.role }),
      ...(data.email && { email: data.email }),
      ...(data.permissions && { permissions: data.permissions }),
    },
  });

  return teamMember;
}

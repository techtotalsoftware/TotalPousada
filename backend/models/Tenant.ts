import { prisma } from "../lib/db";
import { TenantPlan, isValidPlan } from "../lib/plan-enum";

export type TenantModel = {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  createdAt: Date;
  updatedAt: Date;
};

export class Tenant {
  static async findById(id: string): Promise<TenantModel | null> {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) return null;

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan as TenantPlan,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  static async findBySlug(slug: string): Promise<TenantModel | null> {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) return null;

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan as TenantPlan,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  /**
   * Atualiza o plano de um tenant com validaåııo estrita
   * @param tenantId - ID do tenant
   * @param newPlan - Novo plano (string para validaåııo)
   * @returns Tenant atualizado
   * @throws Error - Se o plano for inváıılido
   */
  static async updatePlan(
    tenantId: string,
    newPlan: string
  ): Promise<TenantModel> {
    // VALIDAÇªÍıO OBRIGATÓıÓıRIA DO PLANO - IMPRESCINDÍıVEL
    if (!isValidPlan(newPlan)) {
      throw new Error(
        `Plano inváıılido: ${newPlan}. Valores aceitos: ${Object.values(
          TenantPlan
        ).join(", ")}`
      );
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan: newPlan as TenantPlan,
      },
    });

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan as TenantPlan,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  /**
   * Cria um novo tenant com validaåııo do plano
   * @param data - Dados do tenant
   * @returns Tenant criado
   * @throws Error - Se o plano for inváıılido
   */
  static async create(data: {
    name: string;
    slug: string;
    plan: string;
  }): Promise<TenantModel> {
    // VALIDAÇªÍıO OBRIGATÓıÓıRIA DO PLANO - IMPRESCINDÍıVEL
    if (!isValidPlan(data.plan)) {
      throw new Error(
        `Plano inváıılido: ${data.plan}. Valores aceitos: ${Object.values(
          TenantPlan
        ).join(", ")}`
      );
    }

    const tenant = await prisma.tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        plan: data.plan as TenantPlan,
      },
    });

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan as TenantPlan,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }
}

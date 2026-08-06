import { prisma } from "../lib/db";
import { TenantPlan } from "../lib/plan-enum";
import { Feature, ensureFeatureAccess } from "../lib/feature-access";

type CreateExpenseInput = {
  description: string;
  amount: number;
  category: string;
  date: Date;
  paymentMethod: string;
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
 * Cria uma nova despesa
 * 
 * IMPORTANTE: Esta função só pode ser acessada por tenants com plano Premium ou Enterprise
 * A validaåııo é feita no backend para garantir que não há como burlar pelo frontend
 */
export async function createExpense(
  data: CreateExpenseInput,
  context: Context
) {
  const { tenant } = context;

  // VALIDAÇªÍıO DE PLANO - Finance é feature Premium
  // Isso impede que tenants Basic acessem esta funcionalidade
  // mesmo que tentem chamar a API diretamente
  try {
    ensureFeatureAccess(tenant.plan as TenantPlan, Feature.FINANCE);
  } catch (error) {
    // Log da tentativa de acesso não autorizado
    console.warn(
      `[SECURITY] Tenant ${tenant.id} tentou acessar feature ${Feature.FINANCE} sem permissåııo. Plano: ${tenant.plan}`
    );
    throw error;
  }

  // Validaåııes adicionais
  if (!data.description || data.description.trim().length === 0) {
    throw new Error("Descriåııo é obrigatï¿½ria");
  }

  if (data.amount <= 0) {
    throw new Error("Valor deve ser maior que zero");
  }

  // Cria a despesa
  const expense = await prisma.expense.create({
    data: {
      description: data.description,
      amount: data.amount,
      category: data.category,
      date: data.date,
      paymentMethod: data.paymentMethod,
      tenantId: tenant.id,
      userId: context.user.id,
    },
  });

  return expense;
}

/**
 * Lista despesas do tenant
 */
export async function listExpenses(
  filters: {
    startDate?: Date;
    endDate?: Date;
    category?: string;
  },
  context: Context
) {
  const { tenant } = context;

  // VALIDAÇªÍıO DE PLANO
  ensureFeatureAccess(tenant.plan as TenantPlan, Feature.FINANCE);

  const where: any = {
    tenantId: tenant.id,
  };

  if (filters.startDate && filters.endDate) {
    where.date = {
      gte: filters.startDate,
      lte: filters.endDate,
    };
  }

  if (filters.category) {
    where.category = filters.category;
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { date: "desc" },
  });

  return expenses;
}

/**
 * Deleta uma despesa
 */
export async function deleteExpense(
  expenseId: string,
  context: Context
) {
  const { tenant } = context;

  // VALIDAÇªÍıO DE PLANO
  ensureFeatureAccess(tenant.plan as TenantPlan, Feature.FINANCE);

  // Verifica se a despesa pertence ao tenant
  const expense = await prisma.expense.findFirst({
    where: {
      id: expenseId,
      tenantId: tenant.id,
    },
  });

  if (!expense) {
    throw new Error("Despesa não encontrada");
  }

  await prisma.expense.delete({
    where: { id: expenseId },
  });

  return { success: true };
}

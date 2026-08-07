import { TenantPlan } from "../lib/plan-enum";
import { Feature, ensureFeatureAccess } from "../lib/feature-access";
import { getDb } from "../lib/db";

type CreateExpenseInput = {
  description: string;
  amount: number;
  category: string;
  date: Date | string;
  paymentMethod?: string;
};

type Context = {
  tenant: {
    id: string | number;
    plan: string;
  };
  user: {
    id: string | number;
  };
};

function normalizeTenantId(value: string | number) {
  return typeof value === "number" ? value : Number(value);
}

/**
 * Cria uma nova despesa via Sequelize.
 */
export async function createExpense(
  data: CreateExpenseInput,
  context: Context,
) {
  const { tenant } = context;

  try {
    ensureFeatureAccess(tenant.plan as TenantPlan, Feature.FINANCE);
  } catch (error) {
    console.warn(
      `[SECURITY] Tenant ${tenant.id} tentou acessar feature ${Feature.FINANCE} sem permissão. Plano: ${tenant.plan}`,
    );
    throw error;
  }

  if (!data.description || data.description.trim().length === 0) {
    throw new Error("Descrição é obrigatória");
  }

  if (data.amount <= 0) {
    throw new Error("Valor deve ser maior que zero");
  }

  const { Expense } = await getDb();
  const expense = await Expense.create({
    createdByUserId: normalizeTenantId(context.user.id),
    description: data.description.trim(),
    amount: Number(data.amount),
    date:
      data.date instanceof Date
        ? data.date.toISOString().slice(0, 10)
        : String(data.date),
    category: data.category as any,
    tenantId: normalizeTenantId(tenant.id),
  });

  return expense;
}

/**
 * Lista despesas do tenant usando Sequelize.
 */
export async function listExpenses(
  filters: {
    startDate?: Date;
    endDate?: Date;
    category?: string;
  },
  context: Context,
) {
  const { tenant } = context;

  ensureFeatureAccess(tenant.plan as TenantPlan, Feature.FINANCE);

  const { Expense } = await getDb();
  const where: Record<string, unknown> = {
    tenantId: normalizeTenantId(tenant.id),
  };

  if (filters.startDate && filters.endDate) {
    where.date = {
      $gte: filters.startDate.toISOString().slice(0, 10),
      $lte: filters.endDate.toISOString().slice(0, 10),
    } as any;
  }

  if (filters.category) {
    where.category = filters.category;
  }

  return Expense.findAll({
    where,
    order: [
      ["date", "DESC"],
      ["id", "DESC"],
    ],
  });
}

/**
 * Deleta uma despesa usando Sequelize.
 */
export async function deleteExpense(expenseId: string, context: Context) {
  const { tenant } = context;

  ensureFeatureAccess(tenant.plan as TenantPlan, Feature.FINANCE);

  const { Expense } = await getDb();
  await Expense.destroy({
    where: {
      id: Number(expenseId),
      tenantId: normalizeTenantId(tenant.id),
    },
  });

  return { success: true };
}

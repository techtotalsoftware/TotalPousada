import { Sequelize, Model, DataTypes } from "sequelize";
import { TenantPlan } from "../lib/plan-enum";

export type TenantStatus = "active" | "inactive" | "suspended";

export type TenantAttributes = {
  id: number;
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TenantCreationAttributes = Omit<
  TenantAttributes,
  "id" | "createdAt" | "updatedAt"
> &
  Partial<Pick<TenantAttributes, "id" | "createdAt" | "updatedAt">>;

export class Tenant extends Model<TenantAttributes, TenantCreationAttributes> {
  declare id: string;
  declare name: string;
  declare slug: string;
  declare plan: TenantPlan;
  declare status: "active" | "inactive" | "suspended";
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initialize(sequelize: Sequelize) {
    Tenant.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        slug: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        plan: {
          type: DataTypes.ENUM(
            TenantPlan.BASIC,
            TenantPlan.PREMIUM,
            TenantPlan.ENTERPRISE,
          ),
          allowNull: false,
          defaultValue: TenantPlan.BASIC,
        },
        status: {
          type: DataTypes.ENUM("active", "inactive", "suspended"),
          allowNull: false,
          defaultValue: "active",
        },
        createdAt: {
          type: DataTypes.DATE,
          field: "createdAt",
        },
        updatedAt: {
          type: DataTypes.DATE,
          field: "updatedAt",
        },
      },
      {
        sequelize,
        modelName: "Tenant",
        tableName: "tenants",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: "updatedAt",
        hooks: {
          beforeValidate: (tenant) => {
            const validPlans = Object.values(TenantPlan);
            if (
              tenant.plan &&
              !validPlans.includes(tenant.plan as TenantPlan)
            ) {
              throw new Error(
                `Plano inválido: ${tenant.plan}. Valores aceitos: ${validPlans.join(", ")}`,
              );
            }
          },
        },
      },
    );
  }

  static async findById(id: string): Promise<Tenant | null> {
    return Tenant.findOne({ where: { id } });
  }

  static async findBySlug(slug: string): Promise<Tenant | null> {
    return Tenant.findOne({ where: { slug } });
  }
}

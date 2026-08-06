import { Sequelize, Model, DataTypes } from 'sequelize';
import { TenantPlan } from '../lib/plan-enum';

export type TenantModel = {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  createdAt: Date;
  updatedAt: Date;
};

export class Tenant extends Model {
  static initialize(sequelize: Sequelize) {
    Tenant.init(
      {
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
          defaultValue: () => Math.random().toString(36).substr(2, 9),
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
          type: DataTypes.ENUM('Basic', 'Premium', 'Enterprise'),
          allowNull: false,
          defaultValue: 'Basic',
        },
        createdAt: {
          type: DataTypes.DATE,
          field: 'createdAt',
        },
        updatedAt: {
          type: DataTypes.DATE,
          field: 'updatedAt',
        },
      },
      {
        sequelize,
        modelName: 'Tenant',
        tableName: 'tenants',
        timestamps: true,
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        hooks: {
          beforeValidate: (tenant) => {
            const validPlans = ['Basic', 'Premium', 'Enterprise'];
            if (tenant.plan && !validPlans.includes(tenant.plan)) {
              throw new Error(
                `Plano inváıılido: ${tenant.plan}. Valores aceitos: ${validPlans.join(', ')}`
              );
            }
          },
        },
      }
    );
  }

  static async findById(id: string): Promise<Tenant | null> {
    return Tenant.findOne({ where: { id } });
  }

  static async findBySlug(slug: string): Promise<Tenant | null> {
    return Tenant.findOne({ where: { slug } });
  }
}

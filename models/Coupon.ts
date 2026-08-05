import { Model, DataTypes, Sequelize, Optional } from "sequelize";

export interface CouponAttributes {
  id: number;
  tenantId: number;
  code: string;
  discountPercentage: number;
  status: "active" | "inactive";
  usageLimit: number | null;
  usedCount: number;
}

export type CouponCreationAttributes = Optional<
  CouponAttributes,
  "id" | "status" | "usedCount" | "usageLimit"
>;

export class Coupon
  extends Model<CouponAttributes, CouponCreationAttributes>
  implements CouponAttributes
{
  public id!: number;
  public tenantId!: number;
  public code!: string;
  public discountPercentage!: number;
  public status!: "active" | "inactive";
  public usageLimit!: number | null;
  public usedCount!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initialize(sequelize: Sequelize) {
    Coupon.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        tenantId: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          field: "tenant_id",
        },
        code: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        discountPercentage: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM("active", "inactive"),
          allowNull: false,
          defaultValue: "active",
        },
        usageLimit: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: true,
          field: "usage_limit",
        },
        usedCount: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 0,
          field: "used_count",
        },
      },
      {
        sequelize,
        tableName: "coupons",
        timestamps: true,
      },
    );
  }
}

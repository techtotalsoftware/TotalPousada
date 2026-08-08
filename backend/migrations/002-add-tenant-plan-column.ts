import { DataTypes } from "sequelize";
import { TenantPlan } from "@/lib/plan-enum";
import type { Migration } from "./types";

const migration: Migration = {
  async up({ queryInterface }) {
    const table = await queryInterface.describeTable("tenants");

    if (!table.plan) {
      await queryInterface.addColumn("tenants", "plan", {
        type: DataTypes.ENUM(
          TenantPlan.BASIC,
          TenantPlan.PREMIUM,
          TenantPlan.ENTERPRISE,
        ),
        allowNull: false,
        defaultValue: TenantPlan.BASIC,
      });
    }
  },

  async down({ queryInterface }) {
    const table = await queryInterface.describeTable("tenants");
    if (table.plan) await queryInterface.removeColumn("tenants", "plan");
  },
};

export default migration;

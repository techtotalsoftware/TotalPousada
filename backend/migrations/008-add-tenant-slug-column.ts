import { DataTypes } from "sequelize";
import { generateUniqueTenantSlug } from "@/lib/tenant-slug";
import type { Migration } from "./types";

const migration: Migration = {
  async up({ queryInterface, models }) {
    const table = await queryInterface.describeTable("tenants");

    if (!table.slug) {
      await queryInterface.addColumn("tenants", "slug", {
        type: DataTypes.STRING(160),
        allowNull: true,
      });
    }

    // Preenche o slug de tenants antigos (criados antes desta coluna existir)
    // a partir do nome, para que as rotas públicas possam identificá-los sem
    // depender do id numérico interno.
    const tenantsWithoutSlug = await models.Tenant.findAll({
      where: { slug: null as unknown as string },
    });

    for (const tenant of tenantsWithoutSlug) {
      const slug = await generateUniqueTenantSlug(
        tenant.name,
        async (candidate) => {
          const existing = await models.Tenant.findOne({
            where: { slug: candidate },
          });
          return Boolean(existing);
        },
      );

      await tenant.update({ slug });
    }
  },

  async down({ queryInterface }) {
    const table = await queryInterface.describeTable("tenants");
    if (table.slug) await queryInterface.removeColumn("tenants", "slug");
  },
};

export default migration;

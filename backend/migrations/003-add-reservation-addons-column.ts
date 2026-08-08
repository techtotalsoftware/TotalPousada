import { DataTypes } from "sequelize";
import type { Migration } from "./types";

const migration: Migration = {
  async up({ queryInterface }) {
    const table = await queryInterface.describeTable("reservations");

    if (!table.addons) {
      await queryInterface.addColumn("reservations", "addons", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: "JSON array de adicionais vinculados: [{ id, name, price }]",
      });
    }
  },

  async down({ queryInterface }) {
    const table = await queryInterface.describeTable("reservations");
    if (table.addons) await queryInterface.removeColumn("reservations", "addons");
  },
};

export default migration;

import { DataTypes } from "sequelize";
import type { Migration } from "./types";

const migration: Migration = {
  async up({ queryInterface }) {
    const table = await queryInterface.describeTable("reservations");

    if (!table.checked_in_at) {
      await queryInterface.addColumn("reservations", "checked_in_at", {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!table.checked_out_at) {
      await queryInterface.addColumn("reservations", "checked_out_at", {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down({ queryInterface }) {
    const table = await queryInterface.describeTable("reservations");
    if (table.checked_in_at) {
      await queryInterface.removeColumn("reservations", "checked_in_at");
    }
    if (table.checked_out_at) {
      await queryInterface.removeColumn("reservations", "checked_out_at");
    }
  },
};

export default migration;

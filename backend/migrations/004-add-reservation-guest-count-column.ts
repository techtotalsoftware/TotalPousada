import { DataTypes } from "sequelize";
import type { Migration } from "./types";

const migration: Migration = {
  async up({ queryInterface }) {
    const table = await queryInterface.describeTable("reservations");

    if (!table.guest_count) {
      await queryInterface.addColumn("reservations", "guest_count", {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      });
    }
  },

  async down({ queryInterface }) {
    const table = await queryInterface.describeTable("reservations");
    if (table.guest_count) {
      await queryInterface.removeColumn("reservations", "guest_count");
    }
  },
};

export default migration;

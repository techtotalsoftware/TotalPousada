import { DataTypes } from "sequelize";
import type { Migration } from "./types";

const migration: Migration = {
  async up({ queryInterface }) {
    const table = await queryInterface.describeTable("reservations");

    if (!table.reminder_sent_at) {
      await queryInterface.addColumn("reservations", "reminder_sent_at", {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down({ queryInterface }) {
    const table = await queryInterface.describeTable("reservations");
    if (table.reminder_sent_at) {
      await queryInterface.removeColumn("reservations", "reminder_sent_at");
    }
  },
};

export default migration;

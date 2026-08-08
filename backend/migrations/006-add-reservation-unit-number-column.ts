import { DataTypes } from "sequelize";
import type { Migration } from "./types";

const migration: Migration = {
  async up({ queryInterface }) {
    const table = await queryInterface.describeTable("reservations");

    if (!table.unit_number) {
      await queryInterface.addColumn("reservations", "unit_number", {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
        comment: "Número da unidade física (1..quantity) ocupada pela reserva",
      });
    }
  },

  async down({ queryInterface }) {
    const table = await queryInterface.describeTable("reservations");
    if (table.unit_number) {
      await queryInterface.removeColumn("reservations", "unit_number");
    }
  },
};

export default migration;

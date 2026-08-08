import { DataTypes } from "sequelize";
import type { Migration } from "./types";

const migration: Migration = {
  async up({ queryInterface }) {
    const table = await queryInterface.describeTable("users");

    if (!table.name) {
      await queryInterface.addColumn("users", "name", {
        type: DataTypes.STRING(120),
        allowNull: false,
        defaultValue: "",
      });
    }

    if (!table.phone) {
      await queryInterface.addColumn("users", "phone", {
        type: DataTypes.STRING(30),
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!table.team_role) {
      await queryInterface.addColumn("users", "team_role", {
        type: DataTypes.ENUM("Recepcao", "Limpeza", "Manutencao", "Gestao"),
        allowNull: false,
        defaultValue: "Recepcao",
      });
    }

    if (!table.employment_status) {
      await queryInterface.addColumn("users", "employment_status", {
        type: DataTypes.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      });
    }

    if (!table.shift_status) {
      await queryInterface.addColumn("users", "shift_status", {
        type: DataTypes.ENUM("off", "on_shift"),
        allowNull: false,
        defaultValue: "off",
      });
    }

    if (!table.shift_label) {
      await queryInterface.addColumn("users", "shift_label", {
        type: DataTypes.ENUM("morning", "afternoon", "night"),
        allowNull: false,
        defaultValue: "morning",
      });
    }

    if (!table.last_punch_at) {
      await queryInterface.addColumn("users", "last_punch_at", {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      });
    }

    if (!table.dashboard_permissions) {
      await queryInterface.addColumn("users", "dashboard_permissions", {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "[]",
      });
    }

    if (!table.weekly_schedule) {
      await queryInterface.addColumn("users", "weekly_schedule", {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "{}",
        comment: "JSON: escala semanal recorrente por dia (mon..sun)",
      });
    }
  },

  async down({ queryInterface }) {
    const table = await queryInterface.describeTable("users");
    const columns = [
      "name",
      "phone",
      "team_role",
      "employment_status",
      "shift_status",
      "shift_label",
      "last_punch_at",
      "dashboard_permissions",
      "weekly_schedule",
    ];

    for (const column of columns) {
      if (table[column]) await queryInterface.removeColumn("users", column);
    }
  },
};

export default migration;

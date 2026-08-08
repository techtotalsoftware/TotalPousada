import { DataTypes } from "sequelize";
import type { Migration } from "./types";

const migration: Migration = {
  async up({ queryInterface }) {
    const table = await queryInterface.describeTable("rooms");

    if (!table.amenities) {
      await queryInterface.addColumn("rooms", "amenities", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: "JSON array de comodidades",
      });
    }

    if (!table.photo_urls) {
      await queryInterface.addColumn("rooms", "photo_urls", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: "JSON array de URLs das fotos",
      });
    }

    if (!table.beds) {
      await queryInterface.addColumn("rooms", "beds", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: "JSON array de camas: [{ type, quantity }]",
      });
    }
  },

  async down({ queryInterface }) {
    const table = await queryInterface.describeTable("rooms");

    if (table.amenities) await queryInterface.removeColumn("rooms", "amenities");
    if (table.photo_urls) await queryInterface.removeColumn("rooms", "photo_urls");
    if (table.beds) await queryInterface.removeColumn("rooms", "beds");
  },
};

export default migration;

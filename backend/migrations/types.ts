import { QueryInterface, Sequelize } from "sequelize";
import type { DbModels } from "@/lib/db";

export type MigrationContext = {
  sequelize: Sequelize;
  queryInterface: QueryInterface;
  models: DbModels;
};

export type Migration = {
  up: (context: MigrationContext) => Promise<void>;
  down: (context: MigrationContext) => Promise<void>;
};

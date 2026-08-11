import { Sequelize } from "sequelize";
import { SequelizeStorage, Umzug } from "umzug";
import type { DbModels } from "@/lib/db";
import type { Migration, MigrationContext } from "./types";

import migration001 from "./001-add-room-amenities-columns";
import migration002 from "./002-add-tenant-plan-column";
import migration003 from "./003-add-reservation-addons-column";
import migration004 from "./004-add-reservation-guest-count-column";
import migration005 from "./005-add-user-team-columns";
import migration006 from "./006-add-reservation-unit-number-column";
import migration007 from "./007-add-reservation-stay-columns";
import migration008 from "./008-add-tenant-slug-column";
import migration009 from "./009-add-unique-indexes";
import migration010 from "./010-add-reservation-reminder-sent-at-column";

// Ordem de execução. Cada migration aplicada fica registrada na tabela
// `SequelizeMeta` e nunca roda de novo — ao contrário do antigo esquema de
// `ensureXColumn()` chamado a cada cold start, que refazia um
// describeTable() por função em toda inicialização.
const migrations: Array<{ name: string; migration: Migration }> = [
  { name: "001-add-room-amenities-columns", migration: migration001 },
  { name: "002-add-tenant-plan-column", migration: migration002 },
  { name: "003-add-reservation-addons-column", migration: migration003 },
  { name: "004-add-reservation-guest-count-column", migration: migration004 },
  { name: "005-add-user-team-columns", migration: migration005 },
  { name: "006-add-reservation-unit-number-column", migration: migration006 },
  { name: "007-add-reservation-stay-columns", migration: migration007 },
  { name: "008-add-tenant-slug-column", migration: migration008 },
  { name: "009-add-unique-indexes", migration: migration009 },
  {
    name: "010-add-reservation-reminder-sent-at-column",
    migration: migration010,
  },
];

export async function runMigrations(sequelize: Sequelize, models: DbModels) {
  const context: MigrationContext = {
    sequelize,
    queryInterface: sequelize.getQueryInterface(),
    models,
  };

  const umzug = new Umzug({
    migrations: migrations.map(({ name, migration }) => ({
      name,
      up: () => migration.up(context),
      down: () => migration.down(context),
    })),
    storage: new SequelizeStorage({ sequelize }),
    logger: undefined,
  });

  await umzug.up();
}

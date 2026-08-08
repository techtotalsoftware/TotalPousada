import { initializeModels, createSequelizeClient } from "@/models";
import { runMigrations } from "@/migrations/runner";

export type DbModels = ReturnType<typeof initializeModels>;

declare global {
  // eslint-disable-next-line no-var
  var __sequelizeModels: DbModels | undefined;
  // eslint-disable-next-line no-var
  var __sequelizeModelsPromise: Promise<DbModels> | undefined;
}

export async function getDb(): Promise<DbModels> {
  if (!global.__sequelizeModelsPromise) {
    global.__sequelizeModelsPromise = (async () => {
      if (!global.__sequelizeModels) {
        const sequelize = createSequelizeClient();
        global.__sequelizeModels = initializeModels(sequelize);

        await sequelize.authenticate();
        // Cria apenas as tabelas que ainda não existem (equivalente a um
        // CREATE TABLE IF NOT EXISTS por model) — nunca altera tabelas já
        // existentes. Isso cobre o bootstrap de um banco novo (dev/CI) sem
        // recriar índices/colunas em bancos que já têm as tabelas, o que
        // era a causa raiz do bug de limite de índices do MySQL quando
        // usávamos sync({ alter: true }) a cada cold start.
        await sequelize.sync();

        // Alterações incrementais em tabelas já existentes (novas colunas,
        // novos índices, backfills) vivem em backend/migrations e rodam
        // exatamente uma vez cada, rastreadas na tabela SequelizeMeta.
        await runMigrations(sequelize, global.__sequelizeModels);
      }

      return global.__sequelizeModels;
    })().catch((error) => {
      global.__sequelizeModels = undefined;
      global.__sequelizeModelsPromise = undefined;
      throw error;
    });
  }

  return global.__sequelizeModelsPromise;
}

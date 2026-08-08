import type { Migration } from "./types";

// Cria os índices únicos "na mão", checando antes se já existem — nunca
// via `unique: true` no atributo do model. Antes desta migration, o
// sync({alter:true}) rodava a cada cold start em dev e recriava índices
// para colunas `unique: true`/`indexes` do model sem remover os antigos
// (bug conhecido do Sequelize com MySQL), o que já estourou o limite de 64
// chaves por tabela do MySQL (tabela `rooms`) depois de dezenas de
// restarts. Como migrations rodam exatamente uma vez (rastreadas em
// SequelizeMeta), esse cenário não se repete mais.
const migration: Migration = {
  async up({ queryInterface }) {
    const targets: Array<{
      table: string;
      column: string | string[];
      indexName: string;
    }> = [
      { table: "rooms", column: "local_room_id", indexName: "local_room_id" },
      {
        table: "rooms",
        column: "channex_room_type_id",
        indexName: "channex_room_type_id",
      },
      {
        table: "users",
        column: ["tenant_id", "email"],
        indexName: "tenant_email",
      },
      {
        table: "reservations",
        column: "channex_reservation_id",
        indexName: "channex_reservation_id",
      },
      { table: "tenants", column: "slug", indexName: "slug" },
    ];

    for (const target of targets) {
      const existingIndexes = (await queryInterface.showIndex(
        target.table,
      )) as Array<{ name: string }>;
      const alreadyExists = existingIndexes.some(
        (index) => index.name === target.indexName,
      );

      if (!alreadyExists) {
        if (target.table === "users" && target.indexName === "tenant_email") {
          const hasEmailIndex = existingIndexes.some(
            (index) => index.name === "email",
          );
          if (hasEmailIndex) {
            await queryInterface.removeIndex(target.table, "email");
          }
        }

        await queryInterface.addIndex(
          target.table,
          Array.isArray(target.column) ? target.column : [target.column],
          {
            name: target.indexName,
            unique: true,
          },
        );
      }
    }
  },

  async down({ queryInterface }) {
    const indexNames = [
      "local_room_id",
      "channex_room_type_id",
      "tenant_email",
      "channex_reservation_id",
      "slug",
    ];
    const tables = ["rooms", "rooms", "users", "reservations", "tenants"];

    for (let i = 0; i < indexNames.length; i += 1) {
      await queryInterface
        .removeIndex(tables[i], indexNames[i])
        .catch(() => undefined);
    }
  },
};

export default migration;

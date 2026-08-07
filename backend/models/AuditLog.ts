import { DataTypes, Model, Optional, Sequelize } from "sequelize";

export type AuditAction =
  | "reservation.created"
  | "reservation.updated"
  | "reservation.cancelled"
  | "reservation.deleted"
  | "reservation.checked_in"
  | "reservation.checked_out"
  | "team.member_created"
  | "team.member_deleted"
  | "team.permissions_updated"
  | "team.employment_toggled"
  | "team.schedule_updated";

export type AuditLogAttributes = {
  id: number;
  tenantId: number;
  // Nulo para ações do fluxo público (sem usuário autenticado, ex.: reserva
  // criada pela landing page).
  userId: number | null;
  // Snapshot do nome do autor no momento da ação — sobrevive mesmo se o
  // colaborador for excluído depois.
  userName: string;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  metadata: string | null;
  createdAt?: Date;
};

export type AuditLogCreationAttributes = Optional<
  AuditLogAttributes,
  "id" | "createdAt" | "userId" | "entityId" | "metadata"
>;

export class AuditLog
  extends Model<AuditLogAttributes, AuditLogCreationAttributes>
  implements AuditLogAttributes
{
  declare id: number;
  declare tenantId: number;
  declare userId: number | null;
  declare userName: string;
  declare action: AuditAction;
  declare entityType: string;
  declare entityId: string | null;
  declare metadata: string | null;
  declare readonly createdAt: Date;

  static initialize(sequelize: Sequelize) {
    AuditLog.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        tenantId: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          field: "tenant_id",
        },
        userId: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: true,
          field: "user_id",
        },
        userName: {
          type: DataTypes.STRING(120),
          allowNull: false,
          field: "user_name",
        },
        action: {
          type: DataTypes.STRING(60),
          allowNull: false,
        },
        entityType: {
          type: DataTypes.STRING(40),
          allowNull: false,
          field: "entity_type",
        },
        entityId: {
          type: DataTypes.STRING(60),
          allowNull: true,
          field: "entity_id",
        },
        metadata: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "audit_logs",
        modelName: "AuditLog",
        timestamps: true,
        createdAt: "createdAt",
        updatedAt: false,
      },
    );
  }
}

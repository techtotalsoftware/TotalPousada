import { NextResponse } from 'next/server';
import { getVerifiedTenantSession, hasFeatureAccess } from '@/lib/tenant-session';
import {
  hasPlanAccessToFeature,
  resolveDashboardPermissionsForRole,
  sanitizeDashboardPermissions,
  type DashboardFeatureKey,
} from '@/lib/dashboard-access';
import { getDb } from '@/lib/db';
import { logAuditEvent } from '@/lib/audit';

const WEEK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const SHIFT_VALUES = ['morning', 'afternoon', 'night'] as const;

type MemberActionPayload =
  | {
      action: 'toggle-employment';
    }
  | {
      action: 'toggle-shift';
    }
  | {
      action: 'set-permissions';
      permissions?: DashboardFeatureKey[];
    }
  | {
      action: 'set-schedule';
      schedule?: Record<string, string | null>;
    };

function sanitizeWeeklySchedule(input: Record<string, string | null> | undefined): Record<string, string | null> {
  const sanitized: Record<string, string | null> = {};

  for (const day of WEEK_DAYS) {
    const value = input?.[day];
    sanitized[day] = value && (SHIFT_VALUES as readonly string[]).includes(value) ? value : null;
  }

  return sanitized;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getVerifiedTenantSession();

  if (!session) {
    return NextResponse.json({ message: 'Nao autenticado.' }, { status: 401 });
  }

  if (session.role !== 'admin') {
    return NextResponse.json({ message: 'Somente gestores podem alterar colaboradores.' }, { status: 403 });
  }

  if (!hasFeatureAccess(session, 'team')) {
    return NextResponse.json({ message: 'Sem permissao para esta acao.' }, { status: 403 });
  }

  const resolvedParams = await params;
  const memberId = Number(resolvedParams.id);

  if (!Number.isInteger(memberId) || memberId <= 0) {
    return NextResponse.json({ message: 'Colaborador invalido.' }, { status: 400 });
  }

  const body = (await request.json()) as MemberActionPayload;

  if (!body?.action) {
    return NextResponse.json({ message: 'Acao obrigatoria.' }, { status: 400 });
  }

  const { User } = await getDb();

  const user = await User.findOne({
    where: {
      id: memberId,
      tenantId: session.tenantId,
    },
  });

  if (!user || user.role === 'customer') {
    return NextResponse.json({ message: 'Colaborador nao encontrado.' }, { status: 404 });
  }

  if (body.action === 'toggle-employment') {
    if (user.id === session.userId && user.employmentStatus === 'active') {
      return NextResponse.json({ message: 'Nao e permitido inativar o proprio usuario logado.' }, { status: 400 });
    }

    const nextStatus = user.employmentStatus === 'active' ? 'inactive' : 'active';

    if (nextStatus === 'inactive') {
      await user.update({
        employmentStatus: 'inactive',
        shiftStatus: 'off',
        lastPunchAt: new Date(),
      });
    } else {
      await user.update({
        employmentStatus: 'active',
      });
    }

    await logAuditEvent({
      tenantId: session.tenantId,
      userId: session.userId,
      userName: session.userName,
      action: 'team.employment_toggled',
      entityType: 'user',
      entityId: String(user.id),
      metadata: { name: user.name, newStatus: nextStatus },
    });

    return NextResponse.json({ ok: true });
  }

  if (body.action === 'toggle-shift') {
    if (user.employmentStatus !== 'active') {
      return NextResponse.json({ message: 'Colaborador inativo nao pode bater turno.' }, { status: 400 });
    }

    const nextShiftStatus = user.shiftStatus === 'off' ? 'on_shift' : 'off';

    await user.update({
      shiftStatus: nextShiftStatus,
      lastPunchAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  }

  if (body.action === 'set-permissions') {
    const permissions = sanitizeDashboardPermissions(body.permissions ?? []).filter(
      (feature) => hasPlanAccessToFeature(session.plan, feature),
    );
    const resolved = resolveDashboardPermissionsForRole('staff', permissions);

    await user.update({
      dashboardPermissions: JSON.stringify(resolved),
    });

    await logAuditEvent({
      tenantId: session.tenantId,
      userId: session.userId,
      userName: session.userName,
      action: 'team.permissions_updated',
      entityType: 'user',
      entityId: String(user.id),
      metadata: { name: user.name, permissions: resolved },
    });

    return NextResponse.json({ ok: true });
  }

  if (body.action === 'set-schedule') {
    const schedule = sanitizeWeeklySchedule(body.schedule);

    await user.update({
      weeklySchedule: JSON.stringify(schedule),
    });

    await logAuditEvent({
      tenantId: session.tenantId,
      userId: session.userId,
      userName: session.userName,
      action: 'team.schedule_updated',
      entityType: 'user',
      entityId: String(user.id),
      metadata: { name: user.name, weeklySchedule: schedule },
    });

    return NextResponse.json({ ok: true, weeklySchedule: schedule });
  }

  return NextResponse.json({ message: 'Acao invalida.' }, { status: 400 });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getVerifiedTenantSession();

  if (!session) {
    return NextResponse.json({ message: 'Nao autenticado.' }, { status: 401 });
  }

  if (session.role !== 'admin') {
    return NextResponse.json({ message: 'Somente gestores podem excluir colaboradores.' }, { status: 403 });
  }

  if (!hasFeatureAccess(session, 'team')) {
    return NextResponse.json({ message: 'Sem permissao para esta acao.' }, { status: 403 });
  }

  const resolvedParams = await params;
  const memberId = Number(resolvedParams.id);

  if (!Number.isInteger(memberId) || memberId <= 0) {
    return NextResponse.json({ message: 'Colaborador invalido.' }, { status: 400 });
  }

  const { User } = await getDb();

  const user = await User.findOne({
    where: {
      id: memberId,
      tenantId: session.tenantId,
    },
  });

  if (!user || user.role === 'customer') {
    return NextResponse.json({ message: 'Colaborador nao encontrado.' }, { status: 404 });
  }

  if (user.id === session.userId) {
    return NextResponse.json({ message: 'Nao e permitido excluir o proprio usuario logado.' }, { status: 400 });
  }

  if (user.role === 'admin') {
    return NextResponse.json({ message: 'Exclusao disponivel apenas para colaboradores.' }, { status: 400 });
  }

  const deletedUserName = user.name;
  await user.destroy();

  await logAuditEvent({
    tenantId: session.tenantId,
    userId: session.userId,
    userName: session.userName,
    action: 'team.member_deleted',
    entityType: 'user',
    entityId: String(memberId),
    metadata: { name: deletedUserName },
  });

  return NextResponse.json({ ok: true });
}

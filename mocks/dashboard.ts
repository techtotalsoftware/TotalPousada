export type StayMock = {
  id: string;
  guestName: string;
  document: string;
  room: string;
  peopleCount: number;
  checkInOffset: number;
  checkOutOffset: number;
  status: 'reserved' | 'checked_in' | 'checked_out';
  notes: string;
  checkedInOffset?: number;
  checkedInTime?: string;
  checkedOutOffset?: number;
  checkedOutTime?: string;
};

export const ROOM_SNAPSHOTS_MOCK = [
  {
    id: 'room-1',
    room: 'Suíte Atlântico',
    category: 'Suíte Luxo',
    status: 'awaiting_guest',
    updatedAt: 'Agora',
    note: 'Enxoval pronto e amenities conferidos.',
  },
  {
    id: 'room-2',
    room: 'Chalé Serra Azul',
    category: 'Chalé Master',
    status: 'occupied',
    updatedAt: '08:40',
    note: 'Checkout previsto para hoje até 11h.',
  },
  {
    id: 'room-3',
    room: 'Bangalô Oceano',
    category: 'Bangalô',
    status: 'cleaning',
    updatedAt: '09:05',
    note: 'Limpeza de saída em andamento.',
  },
  {
    id: 'room-4',
    room: 'Suíte Coral Premium',
    category: 'Suíte Premium',
    status: 'vacant',
    updatedAt: '09:12',
    note: 'Disponível para novas reservas.',
  },
  {
    id: 'room-5',
    room: 'Cabana Mata Nativa',
    category: 'Cabana',
    status: 'maintenance',
    updatedAt: 'Ontem',
    note: 'Troca de bomba da jacuzzi.',
  },
] as const;

export const INITIAL_STAYS_MOCK: StayMock[] = [
  {
    id: 'stay-example-checkin',
    guestName: 'Camila Torres',
    document: '157.444.990-03',
    room: 'Suíte Atlântico',
    peopleCount: 2,
    checkInOffset: 0,
    checkOutOffset: 3,
    status: 'reserved',
    notes: 'Exemplo: chegada prevista para hoje.',
  },
  {
    id: 'stay-example-checkout',
    guestName: 'Diego Lima',
    document: '320.117.880-60',
    room: 'Chalé Serra Azul',
    peopleCount: 2,
    checkInOffset: -2,
    checkOutOffset: 0,
    status: 'checked_in',
    notes: 'Exemplo: saída prevista para hoje.',
    checkedInOffset: -2,
    checkedInTime: '15:10:00',
  },
  {
    id: 'stay-1',
    guestName: 'Mariana Costa',
    document: '112.334.889-10',
    room: 'Bangalô Oceano',
    peopleCount: 2,
    checkInOffset: 1,
    checkOutOffset: 4,
    status: 'reserved',
    notes: 'Lua de mel. Solicita espumante.',
  },
  {
    id: 'stay-2',
    guestName: 'Rafael Nunes',
    document: '904.221.730-55',
    room: 'Suíte Coral Premium',
    peopleCount: 3,
    checkInOffset: -1,
    checkOutOffset: 2,
    status: 'checked_in',
    notes: 'Chegada tardia registrada na madrugada.',
    checkedInOffset: -1,
    checkedInTime: '23:42:00',
  },
  {
    id: 'stay-3',
    guestName: 'Paulo Menezes',
    document: '201.555.221-40',
    room: 'Bangalô Oceano',
    peopleCount: 2,
    checkInOffset: -5,
    checkOutOffset: -1,
    status: 'checked_out',
    notes: 'Checkout finalizado sem pendencias.',
    checkedInOffset: -5,
    checkedInTime: '15:15:00',
    checkedOutOffset: -1,
    checkedOutTime: '11:06:00',
  },
] as const;

export const INITIAL_TEAM_MOCK = [
  {
    id: 'tm-1',
    name: 'Patricia Melo',
    email: 'patricia@vivamar.com',
    phone: '+55 81 98888-1111',
    role: 'Recepção',
    shift: 'Manhã',
    employmentStatus: 'ativo',
    shiftStatus: 'em_turno',
    tasksToday: 8,
    finishedTasks: 3,
    lastPunch: '2026-03-25T07:01:00',
  },
  {
    id: 'tm-2',
    name: 'Robson Vieira',
    email: 'robson@vivamar.com',
    phone: '+55 81 97777-4545',
    role: 'Manutenção',
    shift: 'Tarde',
    employmentStatus: 'ativo',
    shiftStatus: 'fora',
    tasksToday: 5,
    finishedTasks: 1,
  },
  {
    id: 'tm-3',
    name: 'Claudia Ramos',
    email: 'claudia@vivamar.com',
    phone: '+55 81 96666-1212',
    role: 'Limpeza',
    shift: 'Noite',
    employmentStatus: 'ativo',
    shiftStatus: 'fora',
    tasksToday: 10,
    finishedTasks: 0,
  },
] as const;

import type { BookingItem } from './schema.js';

// Catalog from the clean Database.sql included in the academic project.
export const services = [
  { id: 1, name: 'Corte Masculino', duration: 30, price: 3500 },
  { id: 2, name: 'Corte Feminino', duration: 60, price: 8000 },
  { id: 3, name: 'Barba', duration: 30, price: 2500 },
  { id: 4, name: 'Barboterapia', duration: 40, price: 6000 },
  { id: 5, name: 'Hidratação', duration: 45, price: 7000 },
  { id: 6, name: 'Coloração', duration: 120, price: 12000 },
];
export const professionals = [
  { id: 1, name: 'João', specialty: 'Cortes masculinos' },
  { id: 2, name: 'Maria', specialty: 'Colorização' },
  { id: 3, name: 'Carlos', specialty: 'Cortes femininos' },
  { id: 4, name: 'Tiago Melo', specialty: 'Barboterapia' },
  { id: 5, name: 'Estevan Araujo', specialty: 'Cortes' },
  { id: 6, name: 'Alice Azevedo', specialty: 'Hidratação' },
];
export const statuses = ['agendado', 'confirmado', 'aguardando', 'em_atendimento', 'finalizado', 'pago', 'cancelado', 'faltou'];
export const methods = ['dinheiro', 'debito', 'credito', 'pix'];

export class InputError extends Error {
  constructor(message: string, public status = 422) { super(message); }
}
export function text(value: unknown, label: string, max = 100): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new InputError(`${label}: informe entre 1 e ${max} caracteres.`);
  return value.trim();
}
export function id(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new InputError('Registro inválido.');
  return value;
}
export function day(value: unknown): string {
  if (typeof value !== 'string' || !/^20\d\d-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new InputError('Informe uma data válida.');
  return value;
}
export function bookingItems(value: unknown): BookingItem[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) throw new InputError('Adicione de 1 a 8 serviços.');
  const items = value.map(item => {
    if (!item || typeof item !== 'object') throw new InputError('Serviço inválido.');
    const service = services.find(s => s.id === item.serviceId);
    if (!service || !professionals.some(p => p.id === item.professionalId)) throw new InputError('Selecione serviço e profissional válidos.');
    if (typeof item.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)) throw new InputError('Informe o horário inicial.');
    const [h, m] = item.time.split(':').map(Number);
    const start = h * 60 + m;
    const end = start + service.duration;
    if (start < 8 * 60 || end > 20 * 60) throw new InputError('Os atendimentos devem ocorrer entre 08:00 e 20:00.');
    return { serviceId: service.id, professionalId: item.professionalId as number, start, end, price: service.price };
  });
  for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) {
    // One client cannot receive simultaneous services, even with different professionals.
    if (overlap(items[a], items[b])) throw new InputError('Os serviços do cliente precisam ter horários diferentes.');
  }
  return items;
}
export function overlap(a: { start: number; end: number }, b: { start: number; end: number }) {
  return a.start < b.end && b.start < a.end;
}
export function assertAvailable(items: BookingItem[], clientId: string, existing: { clientId: string; items: BookingItem[]; status: string }[]) {
  for (const appointment of existing) {
    if (['cancelado', 'faltou'].includes(appointment.status)) continue;
    for (const a of items) for (const b of appointment.items) {
      if ((a.professionalId === b.professionalId || clientId === appointment.clientId) && overlap(a, b)) throw new InputError('Horário ocupado para este profissional ou cliente. Escolha outro horário.', 409);
    }
  }
}
export function amount(value: unknown) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > 100000000) throw new InputError('Informe um valor entre R$ 0,01 e R$ 1.000.000,00.');
  return value;
}

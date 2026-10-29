import { pgTable, uuid, text, integer, timestamp, date, jsonb, index, check, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const demos = pgTable('barber_demos', {
  id: uuid().primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const clients = pgTable('barber_clients', {
  id: uuid().primaryKey().defaultRandom(),
  demoId: uuid('demo_id').notNull().references(() => demos.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [index('barber_clients_demo_idx').on(t.demoId)]);

export type BookingItem = { serviceId: number; professionalId: number; start: number; end: number; price: number };

export const appointments = pgTable('barber_appointments', {
  id: uuid().primaryKey().defaultRandom(),
  demoId: uuid('demo_id').notNull().references(() => demos.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id),
  day: date().notNull(),
  items: jsonb().$type<BookingItem[]>().notNull(),
  total: integer().notNull(),
  status: text().notNull().default('agendado'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [index('barber_appointments_demo_day_idx').on(t.demoId, t.day),
  check('barber_appointment_total_positive', sql`${t.total} > 0`),
  check('barber_appointment_status_valid', sql`${t.status} IN ('agendado','confirmado','aguardando','em_atendimento','finalizado','pago','cancelado','faltou')`)]);

export const movements = pgTable('barber_movements', {
  id: uuid().primaryKey().defaultRandom(),
  demoId: uuid('demo_id').notNull().references(() => demos.id, { onDelete: 'cascade' }),
  appointmentId: uuid('appointment_id').references(() => appointments.id),
  day: date().notNull(),
  title: text().notNull(),
  amount: integer().notNull(),
  kind: text().notNull(),
  method: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [index('barber_movements_demo_day_idx').on(t.demoId, t.day),
  uniqueIndex('barber_one_payment_per_appointment').on(t.appointmentId),
  check('barber_movement_amount_positive', sql`${t.amount} > 0`),
  check('barber_movement_kind_valid', sql`${t.kind} IN ('entrada','saida')`),
  check('barber_movement_method_valid', sql`${t.method} IN ('dinheiro','debito','credito','pix')`)]);

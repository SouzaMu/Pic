import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingItems, assertAvailable, amount, day, InputError } from '../db/barber.js';
import handler from '../netlify/functions/barber.mts';

test('uses catalog prices and duration instead of submitted values', () => {
  const [item] = bookingItems([{ serviceId: 1, professionalId: 1, time: '09:00', price: 1, end: 999 }]);
  assert.deepEqual(item, { serviceId: 1, professionalId: 1, start: 540, end: 570, price: 3500 });
});
test('allows consecutive services but rejects simultaneous services for the client', () => {
  assert.equal(bookingItems([
    { serviceId: 1, professionalId: 1, time: '09:00' },
    { serviceId: 3, professionalId: 4, time: '09:30' },
  ]).length, 2);
  assert.throws(() => bookingItems([
    { serviceId: 1, professionalId: 1, time: '09:00' },
    { serviceId: 3, professionalId: 4, time: '09:15' },
  ]), InputError);
});
test('validates service, professional, times, and operating hours', () => {
  for (const item of [
    { serviceId: 99, professionalId: 1, time: '09:00' },
    { serviceId: 1, professionalId: 99, time: '09:00' },
    { serviceId: 1, professionalId: 1, time: '07:59' },
    { serviceId: 6, professionalId: 1, time: '18:01' },
    { serviceId: 1, professionalId: 1, time: '24:00' },
    { serviceId: 1, professionalId: 1, time: '09:60' },
  ]) assert.throws(() => bookingItems([item]), InputError);
  assert.equal(bookingItems([{ serviceId: 6, professionalId: 2, time: '18:00' }])[0].end, 1200);
  assert.throws(() => bookingItems([]), InputError);
});
test('rejects professional conflicts and double bookings for a client', () => {
  const items = bookingItems([{ serviceId: 1, professionalId: 1, time: '09:00' }]);
  const existing = [{ clientId: 'client-a', status: 'agendado', items }];
  assert.throws(() => assertAvailable(items, 'client-b', existing), /Horário ocupado/);
  const anotherProfessional = bookingItems([{ serviceId: 1, professionalId: 2, time: '09:00' }]);
  assert.throws(() => assertAvailable(anotherProfessional, 'client-a', existing), /Horário ocupado/);
  assert.doesNotThrow(() => assertAvailable(anotherProfessional, 'client-b', existing));
});
test('frees cancelled slots, keeps paid slots occupied, allows adjacent bookings', () => {
  const items = bookingItems([{ serviceId: 1, professionalId: 1, time: '09:00' }]);
  for (const status of ['cancelado', 'faltou']) assert.doesNotThrow(() => assertAvailable(items, 'client-a', [{ clientId: 'client-b', items, status }]));
  assert.throws(() => assertAvailable(items, 'client-a', [{ clientId: 'client-b', items, status: 'pago' }]), InputError);
  const next = bookingItems([{ serviceId: 1, professionalId: 1, time: '09:30' }]);
  assert.doesNotThrow(() => assertAvailable(next, 'client-a', [{ clientId: 'client-b', items, status: 'confirmado' }]));
});
test('rejects nonexistent dates and invalid cash amounts', () => {
  assert.equal(day('2028-02-29'), '2028-02-29');
  for (const value of ['2026-02-29', '2026-04-31', '2026-13-01', '', null]) assert.throws(() => day(value), InputError);
  assert.equal(amount(3500), 3500);
  for (const value of [0, -1, 35.2, '3500', NaN, Infinity, 100000001]) assert.throws(() => amount(value), InputError);
});
test('API rejects unsupported methods and cross-origin writes before database access', async () => {
  const context = {} as Parameters<typeof handler>[1];
  const unsupported = await handler(new Request('https://example.test/api/barbearia', { method: 'DELETE' }), context);
  assert.equal(unsupported.status, 405);
  const crossOrigin = await handler(new Request('https://example.test/api/barbearia', { method: 'POST', headers: { Origin: 'https://another.test', 'Content-Type': 'application/json' }, body: '{}' }), context);
  assert.equal(crossOrigin.status, 403);
  const wrongType = await handler(new Request('https://example.test/api/barbearia', { method: 'POST', body: 'hello' }), context);
  assert.equal(wrongType.status, 415);
});

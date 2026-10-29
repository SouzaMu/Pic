import type { Config, Context } from '@netlify/functions';
import { and, asc, eq, ne, sql } from 'drizzle-orm';
import { database } from '../../db/index.js';
import { demos, clients, appointments, movements } from '../../db/schema.js';
import { services, professionals, statuses, methods, InputError, text, id, day, bookingItems, assertAvailable, amount } from '../../db/barber.js';

export default async (req: Request, context: Context) => {
  const headers = new Headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
  try {
    if (!['GET', 'POST', 'PATCH'].includes(req.method)) {
      headers.set('Allow', 'GET, POST, PATCH');
      return json({ error: 'Método não permitido.' }, 405);
    }
    const url = new URL(req.url);
    if (req.method !== 'GET') {
      const origin = req.headers.get('origin');
      if (origin && origin !== url.origin) return json({ error: 'Origem não permitida.' }, 403);
      if (!req.headers.get('content-type')?.includes('application/json')) return json({ error: 'Envie dados JSON.' }, 415);
      if (Number(req.headers.get('content-length')) > 12000) return json({ error: 'Solicitação muito grande.' }, 413);
    }
    const db = database();
    // This cookie identifies a fictional public demo, never a real customer account.
    let demoId = context.cookies.get('barber_demo');
    if (!demoId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(demoId) || !(await db.select({ id: demos.id }).from(demos).where(eq(demos.id, demoId)).limit(1)).length) {
      if (req.method !== 'GET') return json({ error: 'Abra a demonstração novamente para iniciar sua sessão.' }, 401);
      const [demo] = await db.insert(demos).values({}).returning();
      demoId = demo.id;
      context.cookies.set({ name: 'barber_demo', value: demoId, path: '/', httpOnly: true, sameSite: 'Strict', secure: url.protocol === 'https:', maxAge: 60 * 60 * 24 * 30 });
    }
    const scope = demoId;
    if (req.method === 'GET') {
      const selectedDay = day(url.searchParams.get('day'));
      const [clientList, bookingList, movementList] = await Promise.all([
        db.select().from(clients).where(eq(clients.demoId, scope)).orderBy(asc(clients.name)).limit(200),
        db.select().from(appointments).where(and(eq(appointments.demoId, scope), eq(appointments.day, selectedDay))).orderBy(asc(appointments.createdAt)),
        db.select().from(movements).where(and(eq(movements.demoId, scope), eq(movements.day, selectedDay))).orderBy(asc(movements.createdAt)),
      ]);
      return json({ clients: clientList.map(c => ({ id: c.id, name: c.name })), appointments: bookingList, movements: movementList, services, professionals });
    }
    let body;
    try {
      const raw = await req.text();
      if (raw.length > 12000) return json({ error: 'Solicitação muito grande.' }, 413);
      body = JSON.parse(raw);
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    } catch { return json({ error: 'Dados inválidos.' }, 400); }

    // A per-demo transaction lock serializes booking conflicts and payments.
    const result = await db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${scope}))`);
      if (body.action === 'client' && req.method === 'POST') {
        const name = text(body.name, 'Nome fictício');
        const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(clients).where(eq(clients.demoId, scope));
        if (count >= 200) throw new InputError('Esta demonstração atingiu o limite de 200 clientes.');
        const [client] = await tx.insert(clients).values({ demoId: scope, name }).returning();
        return { message: 'Cliente cadastrado.', client: { id: client.id, name: client.name } };
      }
      if (body.action === 'appointment' && req.method === 'POST') {
        const clientId = id(body.clientId);
        const selectedDay = day(body.day);
        const items = bookingItems(body.items);
        const [client] = await tx.select().from(clients).where(and(eq(clients.demoId, scope), eq(clients.id, clientId)));
        if (!client) throw new InputError('Selecione um cliente desta demonstração.');
        const existing = await tx.select().from(appointments).where(and(eq(appointments.demoId, scope), eq(appointments.day, selectedDay)));
        if (existing.length >= 100) throw new InputError('Limite de 100 agendamentos por dia nesta demonstração.');
        assertAvailable(items, clientId, existing);
        await tx.insert(appointments).values({ demoId: scope, clientId, day: selectedDay, items, total: items.reduce((s, i) => s + i.price, 0) });
        return { message: 'Agendamento salvo na agenda.' };
      }
      if (body.action === 'status' && req.method === 'PATCH') {
        const appointmentId = id(body.id);
        if (!statuses.includes(body.status) || body.status === 'pago') throw new InputError('Status inválido. Recebimentos são registrados no caixa.');
        const [booking] = await tx.select().from(appointments).where(and(eq(appointments.id, appointmentId), eq(appointments.demoId, scope)));
        if (!booking) throw new InputError('Agendamento não encontrado.', 404);
        if (booking.status === 'pago') throw new InputError('Um agendamento pago não pode ser alterado.', 409);
        if (!['cancelado', 'faltou'].includes(body.status)) {
          const existing = await tx.select().from(appointments).where(and(eq(appointments.demoId, scope), eq(appointments.day, booking.day), ne(appointments.id, booking.id)));
          assertAvailable(booking.items, booking.clientId, existing);
        }
        await tx.update(appointments).set({ status: body.status }).where(eq(appointments.id, booking.id));
        return { message: 'Status atualizado.' };
      }
      if (body.action === 'payment' && req.method === 'POST') {
        const appointmentId = id(body.id);
        if (!methods.includes(body.method)) throw new InputError('Selecione a forma de pagamento.');
        const [booking] = await tx.select().from(appointments).where(and(eq(appointments.id, appointmentId), eq(appointments.demoId, scope)));
        if (!booking) throw new InputError('Agendamento não encontrado.', 404);
        if (['pago', 'cancelado', 'faltou'].includes(booking.status)) throw new InputError('Este agendamento não pode ser recebido.', 409);
        await tx.insert(movements).values({ demoId: scope, appointmentId: booking.id, day: day(body.day), title: 'Recebimento de atendimento', amount: booking.total, kind: 'entrada', method: body.method });
        await tx.update(appointments).set({ status: 'pago' }).where(eq(appointments.id, booking.id));
        return { message: 'Pagamento registrado no caixa. Agendamento marcado como pago.' };
      }
      if (body.action === 'movement' && req.method === 'POST') {
        if (!methods.includes(body.method) || !['entrada', 'saida'].includes(body.kind)) throw new InputError('Selecione tipo e forma de pagamento válidos.');
        const selectedDay = day(body.day);
        const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(movements).where(and(eq(movements.demoId, scope), eq(movements.day, selectedDay)));
        if (count >= 200) throw new InputError('Limite de 200 lançamentos por dia nesta demonstração.');
        await tx.insert(movements).values({ demoId: scope, day: selectedDay, title: text(body.title, 'Descrição'), amount: amount(body.amount), kind: body.kind, method: body.method });
        return { message: 'Movimentação registrada.' };
      }
      if (body.action === 'examples' && req.method === 'POST') {
        const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(clients).where(eq(clients.demoId, scope));
        if (count > 0) throw new InputError('Os exemplos só podem ser carregados em uma demonstração vazia.', 409);
        const selectedDay = day(body.day);
        const names = ['Rafael Nogueira (exemplo)', 'Bruno Reis (exemplo)', 'Lucas Prado (exemplo)'];
        for (const [i, name] of names.entries()) {
          const [client] = await tx.insert(clients).values({ demoId: scope, name }).returning();
          const items = bookingItems([{ serviceId: i === 1 ? 3 : 1, professionalId: i === 1 ? 4 : 1, time: ['09:00', '10:30', '14:00'][i] }]);
          await tx.insert(appointments).values({ demoId: scope, clientId: client.id, day: selectedDay, items, total: items[0].price, status: ['confirmado', 'agendado', 'finalizado'][i] });
        }
        return { message: 'Exemplos carregados. Experimente alterar status e registrar recebimentos.' };
      }
      throw new InputError('Ação inválida.', 400);
    });
    return json(result, req.method === 'POST' ? 201 : 200);
  } catch (error) {
    if (error instanceof InputError) return json({ error: error.message }, error.status);
    // Never expose database errors or environment details to visitors/logs.
    return json({ error: 'Não foi possível acessar os dados agora. Tente novamente em instantes.' }, 503);
  }
};

export const config: Config = { path: '/api/barbearia' };

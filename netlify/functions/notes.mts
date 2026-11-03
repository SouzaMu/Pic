import type { Config, Context } from '@netlify/functions';
import { and, desc, eq, sql } from 'drizzle-orm';
import { database } from '../../db/index.js';
import { notebooks, notes } from '../../db/schema.js';

export default async (req: Request, context: Context) => {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
  const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
  try {
    if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) return reply({ error: 'Método não permitido.' }, 405);
    const url = new URL(req.url);
    if (req.method !== 'GET') {
      if (req.headers.get('origin') && req.headers.get('origin') !== url.origin) return reply({ error: 'Origem não permitida.' }, 403);
      if (!req.headers.get('content-type')?.includes('application/json')) return reply({ error: 'Envie dados JSON.' }, 415);
    }
    const db = database();
    let notebookId = context.cookies.get('notes_demo');
    if (!uuid(notebookId) || !(await db.select().from(notebooks).where(eq(notebooks.id, notebookId)).limit(1)).length) {
      if (req.method !== 'GET') return reply({ error: 'Recarregue a página para iniciar o bloco de notas.' }, 401);
      const [notebook] = await db.insert(notebooks).values({}).returning();
      notebookId = notebook.id;
      context.cookies.set({ name: 'notes_demo', value: notebookId, path: '/', httpOnly: true, secure: url.protocol === 'https:', sameSite: 'Strict', maxAge: 60 * 60 * 24 * 30 });
    }
    const scope = notebookId;
    if (req.method === 'GET') return reply({ notes: await db.select({ id: notes.id, title: notes.title, content: notes.content, updatedAt: notes.updatedAt }).from(notes).where(eq(notes.notebookId, scope)).orderBy(desc(notes.updatedAt)).limit(100) });
    let body;
    try {
      const raw = await req.text();
      if (raw.length > 24000) return reply({ error: 'Nota muito grande.' }, 413);
      body = JSON.parse(raw);
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    } catch { return reply({ error: 'Dados inválidos.' }, 400); }
    if (req.method !== 'POST' && !uuid(body.id)) return reply({ error: 'Nota inválida.' }, 400);
    const filter = and(eq(notes.notebookId, scope), eq(notes.id, body.id ?? '00000000-0000-0000-0000-000000000000'));
    if (req.method === 'DELETE') {
      const deleted = await db.delete(notes).where(filter).returning({ id: notes.id });
      return deleted.length ? reply({ message: 'Nota excluída.' }) : reply({ error: 'Nota não encontrada.' }, 404);
    }
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 100 || typeof body.content !== 'string' || body.content.length > 10000) return reply({ error: 'Informe um título de até 100 caracteres e um texto de até 10.000 caracteres.' }, 400);
    const values = { title: body.title.trim(), content: body.content, updatedAt: new Date() };
    if (req.method === 'POST') {
      const note = await db.transaction(async tx => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${scope}))`);
        const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(notes).where(eq(notes.notebookId, scope));
        if (count >= 100) return null;
        const [created] = await tx.insert(notes).values({ ...values, notebookId: scope }).returning({ id: notes.id });
        return created;
      });
      return note ? reply({ message: 'Nota salva.', id: note.id }, 201) : reply({ error: 'Limite de 100 notas atingido.' }, 409);
    }
    const updated = await db.update(notes).set(values).where(filter).returning({ id: notes.id });
    return updated.length ? reply({ message: 'Nota atualizada.', id: updated[0].id }) : reply({ error: 'Nota não encontrada.' }, 404);
  } catch {
    return reply({ error: 'Não foi possível acessar as notas. Tente novamente.' }, 503);
  }
};
export const config: Config = { path: '/api/notas' };

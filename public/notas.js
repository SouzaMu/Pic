(() => {
  const el = id => document.getElementById(id);
  const form = el('note-form'), fields = el('note-fields'), title = el('note-title'), content = el('note-content');
  const status = el('note-status'), list = el('notes-list'), remove = el('delete-note'), create = el('new-note'), retry = el('notes-retry');
  let notes = [], selected = null, dirty = false, busy = false;
  const message = (text, error = false) => { status.textContent = text; status.dataset.error = String(error); };
  function lock(value) {
    busy = value; fields.disabled = value; create.disabled = value; retry.disabled = value;
    el('notebook').setAttribute('aria-busy', String(value));
    list.querySelectorAll('button').forEach(button => { button.disabled = value; });
  }
  async function request(method = 'GET', body) {
    const response = await fetch('/api/notas', { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível salvar. Tente novamente.');
    return data;
  }
  function render() {
    list.replaceChildren();
    el('notes-empty').textContent = notes.length ? `${notes.length} nota${notes.length === 1 ? '' : 's'} salva${notes.length === 1 ? '' : 's'}` : 'Nenhuma nota ainda. Escreva sua primeira ideia ao lado.';
    for (const note of notes) {
      const li = document.createElement('li'), button = document.createElement('button');
      button.type = 'button'; button.textContent = note.title;
      button.setAttribute('aria-pressed', String(note.id === selected));
      button.addEventListener('click', () => { if (!busy && canLeave()) open(note); });
      li.append(button); list.append(li);
    }
  }
  function canLeave() { return !dirty || window.confirm('Descartar as alterações que ainda não foram salvas?'); }
  function open(note) {
    selected = note?.id || null; title.value = note?.title || ''; content.value = note?.content || '';
    dirty = false; remove.hidden = !selected; remove.textContent = 'Excluir nota'; message(''); render(); title.focus();
  }
  async function load() {
    lock(true); retry.hidden = true; message('Carregando notas…');
    try { notes = (await request()).notes; render(); message('Pronto para escrever.'); lock(false); }
    catch { message('Não foi possível carregar suas notas. Tente novamente.', true); retry.hidden = false; retry.disabled = false; el('notes-empty').textContent = 'Notas indisponíveis no momento.'; el('notebook').setAttribute('aria-busy', 'false'); }
  }
  form.addEventListener('input', () => { dirty = true; remove.textContent = 'Excluir nota'; message('Alterações ainda não salvas.'); });
  create.addEventListener('click', () => { if (canLeave()) open(null); });
  retry.addEventListener('click', load);
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    lock(true); message('Salvando…');
    try {
      const data = await request(selected ? 'PATCH' : 'POST', { id: selected, title: title.value, content: content.value });
      // Keep the editor intact if refreshing the list fails after a successful save.
      selected = data.id; dirty = false; remove.hidden = false; message(data.message);
      notes = notes.filter(note => note.id !== selected);
      notes.unshift({ id: selected, title: title.value.trim(), content: content.value }); render();
    } catch (error) { message(error.message || 'Falha de conexão. Seu texto continua no editor.', true); }
    finally { lock(false); }
  });
  remove.addEventListener('click', async () => {
    if (busy || !selected) return;
    if (remove.textContent !== 'Confirmar exclusão') { remove.textContent = 'Confirmar exclusão'; message('Clique novamente para excluir esta nota.'); return; }
    lock(true); message('Excluindo…');
    try { await request('DELETE', { id: selected }); notes = notes.filter(note => note.id !== selected); open(null); message('Nota excluída.'); }
    catch (error) { message(error.message || 'Não foi possível excluir a nota.', true); }
    finally { lock(false); }
  });
  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  const section = el('bloco-de-notas'), trigger = el('open-notebook');
  let initialized = false;
  trigger.addEventListener('click', event => {
    event.preventDefault();
    section.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    section.scrollIntoView({ block: 'start' });
    el('notes-title').focus({ preventScroll: true });
    if (!initialized) { initialized = true; load(); }
  });
  el('close-notebook').addEventListener('click', () => {
    section.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  });
})();

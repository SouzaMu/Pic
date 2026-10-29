(() => {
  'use strict';
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const money = cents => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const clock = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const initials = name => name.split(/\s+/).slice(0, 2).map(s => s[0] || '').join('').toUpperCase();
  const localDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const statusLabels = { agendado: 'Agendado', confirmado: 'Confirmado', aguardando: 'Aguardando', em_atendimento: 'Em atendimento', finalizado: 'Finalizado', pago: 'Pago', cancelado: 'Cancelado', faltou: 'Faltou' };
  const paymentLabels = { pix: 'Pix', dinheiro: 'Dinheiro', debito: 'Débito', credito: 'Crédito' };
  const titles = {
    agenda: ['AGENDA', 'Cada horário, no seu lugar.', 'Acompanhe os atendimentos e prepare o próximo corte.'],
    clients: ['CLIENTES', 'O atendimento começa aqui.', 'Cadastre nomes fictícios e selecione um cliente ao agendar.'],
    cash: ['CAIXA', 'As contas em dia.', 'Registre recebimentos, entradas e saídas da demonstração.'],
    catalog: ['SERVIÇOS E EQUIPE', 'Quem faz. E o que faz.', 'Conheça os serviços e profissionais do projeto original.'],
  };
  let data = { clients: [], appointments: [], movements: [], services: [], professionals: [] };
  let view = 'agenda';
  let loaded = false;
  let loading = false;
  let professionalFilter = '';
  let search = '';
  const dateInput = $('#selected-day');
  dateInput.value = localDay();

  function notify(message, error = false) {
    const notice = $('#notice');
    notice.textContent = message;
    notice.className = `notice${error ? ' error' : ''}`;
    notice.hidden = false;
  }
  async function request(body, method = 'POST') {
    const response = await fetch('/api/barbearia', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
    });
    let result;
    try { result = await response.json(); } catch { throw new Error('O serviço não respondeu. Tente novamente em instantes.'); }
    if (!response.ok) throw new Error(result.error || 'Não foi possível salvar. Tente novamente.');
    return result;
  }
  async function load() {
    if (loading) return;
    if (!dateInput.value || !dateInput.validity.valid) {
      notify('Selecione uma data válida.', true);
      dateInput.value = localDay();
    }
    loading = true;
    loaded = false;
    $('#content').setAttribute('aria-busy', 'true');
    $('#content').innerHTML = '<div class="skeleton" aria-label="Carregando dados"><div></div><div></div><div></div></div>';
    $$('.toolbar button,.toolbar input,#new-booking,.nav-item').forEach(button => button.disabled = true);
    try {
      const response = await fetch(`/api/barbearia?day=${encodeURIComponent(dateInput.value)}`, { credentials: 'same-origin', cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível carregar a demonstração.');
      data = result;
      loaded = true;
      render();
    } catch (error) {
      $('#content').innerHTML = `<section class="panel"><div class="empty"><div class="empty-mark" aria-hidden="true">↻</div><h3>Vamos tentar novamente?</h3><p>${escape(error.message || 'Não foi possível conectar ao serviço.')}</p><button class="button primary" data-action="retry">Carregar demonstração</button></div></section>`;
      ['#stat-bookings', '#stat-expected', '#stat-cash'].forEach(selector => $(selector).textContent = '—');
      $('#stat-completed').textContent = 'Dados indisponíveis';
    } finally {
      loading = false;
      $('#content').setAttribute('aria-busy', 'false');
      $$('.toolbar button,.toolbar input,.nav-item').forEach(button => button.disabled = false);
      $('#new-booking').disabled = !loaded;
    }
  }
  const clientName = id => data.clients.find(c => c.id === id)?.name || 'Cliente';
  const service = id => data.services.find(s => s.id === id);
  const professional = id => data.professionals.find(p => p.id === id);
  function totals() {
    const active = data.appointments.filter(a => !['cancelado', 'faltou'].includes(a.status));
    $('#stat-bookings').textContent = String(active.length).padStart(2, '0');
    $('#stat-completed').textContent = `${active.filter(a => ['finalizado', 'pago'].includes(a.status)).length} concluído(s)`;
    $('#stat-expected').textContent = money(active.reduce((sum, a) => sum + a.total, 0));
    $('#stat-cash').textContent = money(data.movements.reduce((sum, m) => sum + (m.kind === 'entrada' ? m.amount : -m.amount), 0));
  }
  function empty(mark, title, description, buttons) {
    return `<div class="empty"><div class="empty-mark" aria-hidden="true">${mark}</div><h3>${title}</h3><p>${description}</p>${buttons}</div>`;
  }
  function statusControl(booking) {
    if (booking.status === 'pago') return '<span class="status pago">Pago</span>';
    return `<select class="status ${escape(booking.status)}" data-status="${booking.id}" aria-label="Status de ${escape(clientName(booking.clientId))}">${Object.entries(statusLabels).filter(([key]) => key !== 'pago').map(([key, label]) => `<option value="${key}" ${booking.status === key ? 'selected' : ''}>${label}</option>`).join('')}</select>`;
  }
  function paymentButton(booking) {
    return !['pago', 'cancelado', 'faltou'].includes(booking.status) ? `<button class="row-action" data-pay="${booking.id}">Receber</button>` : '<span class="muted">—</span>';
  }
  function renderAgenda() {
    const appointments = data.appointments.filter(a => !professionalFilter || a.items.some(i => i.professionalId === Number(professionalFilter))).sort((a, b) => Math.min(...a.items.map(i => i.start)) - Math.min(...b.items.map(i => i.start)));
    const header = `<div class="panel-header"><div><h2>Agenda do dia</h2><div class="subheading">${appointments.length} atendimento(s) · horários de Brasília</div></div><div class="panel-controls"><select id="professional-filter" aria-label="Filtrar por profissional"><option value="">Todos os profissionais</option>${data.professionals.map(p => `<option value="${p.id}" ${professionalFilter === String(p.id) ? 'selected' : ''}>${escape(p.name)}</option>`).join('')}</select></div></div>`;
    const rows = appointments.map(a => {
      const start = Math.min(...a.items.map(i => i.start));
      const end = Math.max(...a.items.map(i => i.end));
      return `<tr><td class="time">${clock(start)}<small>até ${clock(end)}</small></td><td><div class="client-cell"><span class="avatar">${escape(initials(clientName(a.clientId)))}</span><strong>${escape(clientName(a.clientId))}</strong></div></td><td>${a.items.map(i => `<strong>${escape(service(i.serviceId)?.name)}</strong><small>${escape(professional(i.professionalId)?.name)} · ${clock(i.start)}–${clock(i.end)}</small>`).join('<br>')}</td><td>${statusControl(a)}</td><td><strong>${money(a.total)}</strong></td><td>${paymentButton(a)}</td></tr>`;
    }).join('');
    let body;
    if (rows) body = `<div class="table-scroll"><table><thead><tr><th>HORÁRIO</th><th>CLIENTE</th><th>SERVIÇO / PROFISSIONAL</th><th>STATUS</th><th>VALOR</th><th>CAIXA</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    else if (professionalFilter) body = empty('—', 'Agenda livre para este profissional.', 'Selecione outra pessoa ou crie um atendimento para a data escolhida.', '<button class="button primary" data-action="booking">+ Novo agendamento</button>');
    else body = empty('08:00', 'Um novo dia começa por aqui.', 'Teste o fluxo completo: cadastre um cliente, agende um serviço e registre o recebimento no caixa.', `${data.clients.length ? '<button class="button primary" data-action="booking">+ Novo agendamento</button>' : '<button class="button primary" data-action="examples">Experimentar com exemplos</button><button class="button outline" data-action="client">Cadastrar primeiro cliente</button>'}`);
    return `<section class="panel">${header}${body}</section>`;
  }
  function renderClients() {
    const clients = data.clients.filter(c => c.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
    return `<section class="panel"><div class="panel-header"><div><h2>Seus clientes de teste</h2><div class="subheading">${data.clients.length} cadastro(s) nesta demonstração</div></div><div class="panel-controls"><input class="search" id="client-search" placeholder="Buscar por nome" aria-label="Buscar cliente por nome" value="${escape(search)}"><button class="button primary" data-action="client">+ Novo cliente</button></div></div>${clients.length ? `<div class="client-grid">${clients.map(c => `<div class="client-card"><span class="avatar">${escape(initials(c.name))}</span><div><strong>${escape(c.name)}</strong><small>Disponível para agendamento</small></div></div>`).join('')}</div>` : empty('01', data.clients.length ? 'Nenhum nome encontrado.' : 'Seu primeiro cliente de teste.', data.clients.length ? 'Experimente buscar por outro nome.' : 'Use apenas nomes fictícios. Este cadastro é usado nos agendamentos da sua demonstração.', '<button class="button primary" data-action="client">+ Cadastrar cliente</button>')}</section>`;
  }
  function renderCash() {
    const incoming = data.movements.filter(m => m.kind === 'entrada').reduce((s, m) => s + m.amount, 0);
    const outgoing = data.movements.filter(m => m.kind === 'saida').reduce((s, m) => s + m.amount, 0);
    const pending = data.appointments.filter(a => !['pago', 'cancelado', 'faltou'].includes(a.status));
    const rows = data.movements.map(m => `<tr><td><strong>${escape(m.title)}</strong><small>${m.appointmentId ? 'Recebimento de atendimento' : 'Lançamento avulso'}</small></td><td>${m.kind === 'entrada' ? 'Entrada' : 'Saída'}</td><td>${escape(paymentLabels[m.method])}</td><td class="${m.kind === 'entrada' ? 'positive' : 'negative'}"><strong>${m.kind === 'entrada' ? '+' : '−'} ${money(m.amount)}</strong></td></tr>`).join('');
    return `<section class="panel"><div class="panel-header"><div><h2>Movimentações do caixa</h2><div class="subheading">Registros da data selecionada</div></div><button class="button primary" data-action="movement">+ Novo lançamento</button></div><div class="cash-totals"><span>Entradas <strong class="positive">${money(incoming)}</strong></span><span>Saídas <strong class="negative">${money(outgoing)}</strong></span><span>Saldo <strong>${money(incoming - outgoing)}</strong></span></div>${rows ? `<div class="table-scroll"><table><thead><tr><th>DESCRIÇÃO</th><th>TIPO</th><th>PAGAMENTO</th><th>VALOR</th></tr></thead><tbody>${rows}</tbody></table></div>` : empty('R$', 'Caixa sem movimentações.', 'Registre um recebimento de atendimento ou crie uma entrada ou saída para testar o controle financeiro.', '<button class="button outline" data-action="movement">Registrar lançamento</button>')}</section>${pending.length ? `<section class="panel" style="margin-top:22px"><div class="panel-header"><div><h2>Atendimentos a receber</h2><div class="subheading">Agendamentos ainda não pagos na data selecionada</div></div></div><div class="table-scroll"><table><thead><tr><th>CLIENTE</th><th>STATUS</th><th>VALOR</th><th>AÇÃO</th></tr></thead><tbody>${pending.map(a => `<tr><td>${escape(clientName(a.clientId))}</td><td>${escape(statusLabels[a.status])}</td><td><strong>${money(a.total)}</strong></td><td>${paymentButton(a)}</td></tr>`).join('')}</tbody></table></div></section>` : ''}`;
  }
  function renderCatalog() {
    return `<div class="catalog-layout"><section class="panel"><div class="panel-header"><h2>Menu de serviços</h2><span class="subheading">${data.services.length} serviços</span></div>${data.services.map((s, i) => `<div class="service-row"><span class="service-number">${String(i + 1).padStart(2, '0')}</span><div><strong>${escape(s.name)}</strong><small>${s.duration} minutos de atendimento</small></div><span class="service-price">${money(s.price)}</span></div>`).join('')}</section><section class="panel"><div class="panel-header"><h2>Profissionais</h2><span class="subheading">${data.professionals.length} pessoas</span></div>${data.professionals.map(p => `<div class="team-row"><span class="avatar">${escape(initials(p.name))}</span><div><strong>${escape(p.name)}</strong><small>${escape(p.specialty)}</small></div></div>`).join('')}</section></div><p class="catalog-note">Catálogo preservado do projeto acadêmico enviado. Valores e profissionais servem à demonstração. O pagamento integral é registrado no caixa; pagamentos parciais e estornos não fazem parte desta versão.</p>`;
  }
  function render() {
    const [caption, title, description] = titles[view];
    $('#view-caption').textContent = caption;
    $('#page-title').textContent = title;
    $('#page-description').textContent = description;
    $$('.nav-item').forEach(button => {
      button.classList.toggle('active', button.dataset.view === view);
      if (button.dataset.view === view) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    totals();
    $('#content').innerHTML = ({ agenda: renderAgenda, clients: renderClients, cash: renderCash, catalog: renderCatalog })[view]();
  }
  function openDialog(selector) {
    const dialog = $(selector);
    $('.form-error', dialog).textContent = '';
    dialog.showModal();
  }
  function openClient() {
    $('#client-form').reset();
    openDialog('#client-dialog');
  }
  function openBooking() {
    if (!loaded) return;
    if (!data.clients.length) {
      notify('Cadastre um nome fictício para começar o agendamento.');
      openClient();
      return;
    }
    const form = $('#booking-form');
    form.reset();
    $('#booking-client').innerHTML = data.clients.map(c => `<option value="${c.id}">${escape(c.name)}</option>`).join('');
    form.elements.day.value = dateInput.value;
    $('#booking-items').innerHTML = '';
    addItem();
    openDialog('#booking-dialog');
  }
  function addItem() {
    const count = $$('.booking-item').length;
    if (count >= 8) return;
    const row = document.createElement('div');
    row.className = 'booking-item';
    row.innerHTML = `<div class="item-fields"><label>Serviço <select class="item-service" required>${data.services.map(s => `<option value="${s.id}">${escape(s.name)}</option>`).join('')}</select></label><label>Profissional <select class="item-professional" required>${data.professionals.map(p => `<option value="${p.id}">${escape(p.name)}</option>`).join('')}</select></label><label>Início <input class="item-time" type="time" min="08:00" max="19:30" required></label></div><div class="item-bottom"><span class="item-summary"></span><button type="button" class="remove-item" aria-label="Remover serviço">Remover</button></div>`;
    const previous = $$('.booking-item').at(-1);
    if (previous) {
      const previousTime = $('.item-time', previous).value;
      const previousService = service(Number($('.item-service', previous).value));
      if (previousTime) {
        const [h, m] = previousTime.split(':').map(Number);
        const end = h * 60 + m + previousService.duration;
        if (end + data.services[0].duration <= 1200) $('.item-time', row).value = clock(end);
      }
    }
    $('#booking-items').append(row);
    updateItems();
  }
  function updateItems() {
    const rows = $$('.booking-item');
    let total = 0;
    for (const row of rows) {
      const selected = service(Number($('.item-service', row).value));
      const time = $('.item-time', row).value;
      let end = '';
      if (time) {
        const [h, m] = time.split(':').map(Number);
        const finish = h * 60 + m + selected.duration;
        end = finish <= 1200 ? ` · término às ${clock(finish)}` : ' · ultrapassa as 20h';
      }
      $('.item-time', row).max = clock(1200 - selected.duration);
      $('.item-summary', row).textContent = `${selected.duration} min · ${money(selected.price)}${end}`;
      $('.remove-item', row).hidden = rows.length === 1;
      total += selected.price;
    }
    $('#booking-total').textContent = money(total);
    $('#add-service').disabled = rows.length >= 8;
  }
  function openPayment(id) {
    const booking = data.appointments.find(a => a.id === id);
    if (!booking) return;
    const form = $('#payment-form');
    form.reset();
    form.elements.id.value = id;
    form.elements.day.value = dateInput.value;
    $('#payment-summary').innerHTML = `${escape(clientName(booking.clientId))}<strong>${money(booking.total)}</strong>`;
    openDialog('#payment-dialog');
  }
  function openMovement() {
    const form = $('#movement-form');
    form.reset();
    form.elements.day.value = dateInput.value;
    openDialog('#movement-dialog');
  }
  function bindForm(selector, payload) {
    const form = $(selector);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = $('button[type="submit"]', form);
      const originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = 'Salvando…';
      $('.form-error', form).textContent = '';
      try {
        const body = payload(form);
        const result = await request(body);
        // Keep the new record visible even when its date differs from the toolbar date.
        if (body.day) dateInput.value = body.day;
        form.closest('dialog').close();
        if (body.action === 'client') view = 'clients';
        if (body.action === 'appointment') view = 'agenda';
        if (['payment', 'movement'].includes(body.action)) view = 'cash';
        notify(result.message);
        await load();
      } catch (error) {
        $('.form-error', form).textContent = error.message || 'Não foi possível salvar. Tente novamente.';
      } finally {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    });
  }
  bindForm('#client-form', form => ({ action: 'client', name: form.elements.name.value.trim() }));
  bindForm('#booking-form', form => ({ action: 'appointment', clientId: form.elements.clientId.value, day: form.elements.day.value, items: $$('.booking-item').map(row => ({ serviceId: Number($('.item-service', row).value), professionalId: Number($('.item-professional', row).value), time: $('.item-time', row).value })) }));
  bindForm('#movement-form', form => ({ action: 'movement', title: form.elements.title.value.trim(), kind: form.elements.kind.value, amount: Math.round(Number(form.elements.amount.value) * 100), method: form.elements.method.value, day: form.elements.day.value }));
  bindForm('#payment-form', form => ({ action: 'payment', id: form.elements.id.value, method: form.elements.method.value, day: form.elements.day.value }));

  $$('.nav-item').forEach(button => button.addEventListener('click', () => {
    if (!loaded) { load(); return; }
    view = button.dataset.view;
    render();
  }));
  $$('[data-close]').forEach(button => button.addEventListener('click', () => {
    if (!$('button[type="submit"]', button.closest('dialog')).disabled) button.closest('dialog').close();
  }));
  $$('dialog').forEach(dialog => dialog.addEventListener('cancel', event => {
    if ($('button[type="submit"]', dialog).disabled) event.preventDefault();
  }));
  $('#new-booking').addEventListener('click', openBooking);
  $('#add-service').addEventListener('click', addItem);
  $('#booking-items').addEventListener('input', updateItems);
  $('#booking-items').addEventListener('change', updateItems);
  $('#booking-items').addEventListener('click', event => {
    if (event.target.closest('.remove-item') && $$('.booking-item').length > 1) {
      event.target.closest('.booking-item').remove();
      updateItems();
    }
  });
  $('#refresh').addEventListener('click', load);
  dateInput.addEventListener('change', load);
  $('#today').addEventListener('click', () => { dateInput.value = localDay(); load(); });
  function changeDay(offset) {
    const date = new Date(`${dateInput.value}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    dateInput.value = date.toISOString().slice(0, 10);
    load();
  }
  $('#prev-day').addEventListener('click', () => changeDay(-1));
  $('#next-day').addEventListener('click', () => changeDay(1));
  $('#content').addEventListener('click', async event => {
    const pay = event.target.closest('[data-pay]');
    if (pay) { openPayment(pay.dataset.pay); return; }
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'retry') { load(); return; }
    if (!loaded) return;
    if (action === 'booking') openBooking();
    if (action === 'client') openClient();
    if (action === 'movement') openMovement();
    if (action === 'examples') {
      button.disabled = true;
      button.textContent = 'Preparando exemplos…';
      try {
        const result = await request({ action: 'examples', day: dateInput.value });
        notify(result.message);
        await load();
      } catch (error) {
        notify(error.message || 'Não foi possível carregar os exemplos.', true);
        button.disabled = false;
        button.textContent = 'Experimentar com exemplos';
      }
    }
  });
  $('#content').addEventListener('change', async event => {
    if (event.target.id === 'professional-filter') {
      professionalFilter = event.target.value;
      render();
    }
    if (event.target.matches('[data-status]')) {
      const select = event.target;
      const booking = data.appointments.find(a => a.id === select.dataset.status);
      const previous = booking?.status;
      select.disabled = true;
      try {
        const result = await request({ action: 'status', id: select.dataset.status, status: select.value }, 'PATCH');
        notify(result.message);
        await load();
      } catch (error) {
        if (previous) select.value = previous;
        select.disabled = false;
        notify(error.message || 'Não foi possível atualizar o status.', true);
      }
    }
  });
  $('#content').addEventListener('input', event => {
    if (event.target.id === 'client-search') {
      search = event.target.value;
      const cursor = event.target.selectionStart;
      render();
      const field = $('#client-search');
      field.focus();
      field.setSelectionRange(cursor, cursor);
    }
  });
  load();
})();

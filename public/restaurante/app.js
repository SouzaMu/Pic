// Status de funcionamento no horário de São Paulo: terça a domingo, 12h às 23h.
(function () {
  const status = document.getElementById('status');
  const text = document.getElementById('status-text');
  if (!status || !text) return;

  const OPEN = 12, CLOSE = 23;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  const hour = Number(get('hour'));
  if (day < 0 || Number.isNaN(hour)) return;

  const closedDay = day === 1;
  if (!closedDay && hour >= OPEN && hour < CLOSE) {
    text.textContent = 'Aberto agora · até as 23h';
    status.classList.add('open');
  } else {
    let next;
    if (!closedDay && hour < OPEN) next = 'hoje às 12h';
    else if (day === 0) next = 'terça às 12h'; // domingo à noite: segunda é fechado
    else next = 'amanhã às 12h';
    text.textContent = (closedDay ? 'Fechado às segundas' : 'Fechado agora') + ' · abre ' + next;
    status.classList.add('closed');
  }
})();

// Abas do cardápio completo, com navegação por teclado.
(function () {
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  if (!tabs.length) return;

  function select(tab) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); select(next); next.focus(); }
    });
  });
})();

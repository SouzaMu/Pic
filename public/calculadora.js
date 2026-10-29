(() => {
  const calculator = document.querySelector('.calculator');
  const display = document.getElementById('calculator-display');
  let entry = '0';
  let stored = null;
  let operation = null;
  let fresh = true;
  let failed = false;

  function render() {
    display.textContent = failed ? 'Não é possível dividir por zero ou exibir este resultado.' : entry.replace('.', ',');
  }

  function reset() {
    entry = '0'; stored = null; operation = null; fresh = true; failed = false;
  }

  function calculate() {
    const right = Number(entry);
    const result = operation === '+' ? stored + right
      : operation === '-' ? stored - right
      : operation === '*' ? stored * right
      : right === 0 ? NaN : stored / right;
    if (!Number.isFinite(result)) {
      reset(); failed = true;
      return false;
    }
    entry = String(Number(result.toPrecision(12)));
    return true;
  }

  function input({digit, action, operation: nextOperation}) {
    if (failed) reset();
    if (digit !== undefined) {
      if (fresh) { entry = digit; fresh = false; }
      else if (entry === '0') entry = digit;
      else if (entry.replace(/[-.]/g, '').length < 12) entry += digit;
    } else if (action === 'clear') reset();
    else if (action === 'decimal') {
      if (fresh) { entry = '0'; fresh = false; }
      if (!entry.includes('.') && !entry.includes('e')) entry += '.';
    } else if (action === 'sign') {
      if (Number(entry) !== 0) entry = entry.startsWith('-') ? entry.slice(1) : '-' + entry;
    } else if (action === 'backspace' && !fresh) {
      entry = entry.includes('e') ? '0' : entry.slice(0, -1);
      if (entry === '' || entry === '-') entry = '0';
    } else if (nextOperation) {
      if (operation && !fresh && !calculate()) { render(); return; }
      stored = Number(entry); operation = nextOperation; fresh = true;
    } else if (action === 'equals' && operation && !fresh) {
      calculate(); stored = null; operation = null; fresh = true;
    }
    render();
  }

  calculator.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button) input(button.dataset);
  });
  calculator.addEventListener('keydown', event => {
    let command;
    if (/^[0-9]$/.test(event.key)) command = {digit: event.key};
    else if (['+', '-', '*', '/'].includes(event.key)) command = {operation: event.key};
    else if (event.key === ',' || event.key === '.') command = {action: 'decimal'};
    else if (event.key === '=' || event.key === 'Enter') command = {action: 'equals'};
    else if (event.key === 'Escape' || event.key.toLowerCase() === 'c') command = {action: 'clear'};
    else if (event.key === 'Backspace') command = {action: 'backspace'};
    if (command) { event.preventDefault(); input(command); }
  });
})();

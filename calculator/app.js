/**
 * Simple, keyboard-friendly calculator.
 * Handles basic operations: add, subtract, multiply, divide, percent, sign toggle, clear, backspace.
 */

(function () {
  'use strict';

  /**
   * Formats a numeric string for display while preserving user-entered trailing dot/zeros where appropriate.
   * @param {string} rawValue
   * @returns {string}
   */
  function formatForDisplay(rawValue) {
    if (rawValue === 'Infinity' || rawValue === '-Infinity' || rawValue === 'NaN') {
      return 'Error';
    }

    if (rawValue.includes('e') || rawValue.includes('E')) {
      return rawValue;
    }

    if (rawValue.endsWith('.')) {
      const withoutDot = rawValue.slice(0, -1);
      const [intPart] = withoutDot.split('.');
      const intFormatted = Number(intPart || '0').toLocaleString(undefined, {
        maximumFractionDigits: 0,
      });
      return `${intFormatted}.`;
    }

    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) {
      return 'Error';
    }

    // Limit precision to avoid floating point noise while keeping useful digits
    const rounded = Math.round(numericValue * 1e12) / 1e12;
    const [intPart, fracPart = ''] = String(rounded).split('.');
    const intFormatted = Number(intPart).toLocaleString(undefined, {
      maximumFractionDigits: 0,
    });
    return fracPart ? `${intFormatted}.${fracPart}` : intFormatted;
  }

  /**
   * Core calculator engine
   */
  class Calculator {
    /**
     * @param {HTMLElement} historyEl
     * @param {HTMLElement} resultEl
     */
    constructor(historyEl, resultEl) {
      this.historyEl = historyEl;
      this.resultEl = resultEl;

      this.currentInput = '0';
      this.previousValue = null; // number or null
      this.operator = null; // '+', '-', '*', '/' or null
      this.overwrite = false; // start new number on next digit
      this.lastEvaluation = null; // { a, b, op } or null

      this.updateDisplay();
    }

    /** Sets and highlights the active operator button */
    setActiveOperator(operatorSymbol) {
      const operatorButtons = document.querySelectorAll('button[data-operator]');
      operatorButtons.forEach((btn) => {
        btn.setAttribute('aria-pressed', 'false');
      });

      const opMap = { '+': 'add', '-': 'subtract', '*': 'multiply', '/': 'divide' };
      const key = operatorSymbol ? opMap[operatorSymbol] : null;
      if (key) {
        const active = document.querySelector(`button[data-operator="${key}"]`);
        if (active) active.setAttribute('aria-pressed', 'true');
      }
    }

    updateDisplay() {
      this.resultEl.textContent = formatForDisplay(this.currentInput);
      const opToSymbol = { '+': '+', '-': '−', '*': '×', '/': '÷' };
      if (this.operator && this.previousValue != null) {
        const symbol = opToSymbol[this.operator] || this.operator;
        this.historyEl.textContent = `${formatForDisplay(String(this.previousValue))} ${symbol}`;
      } else if (this.lastEvaluation) {
        const { a, b, op } = this.lastEvaluation;
        const symbol = opToSymbol[op] || op;
        this.historyEl.textContent = `${formatForDisplay(String(a))} ${symbol} ${formatForDisplay(String(b))} =`;
      } else {
        this.historyEl.textContent = '';
      }
      this.setActiveOperator(this.operator);
    }

    clearAll() {
      this.currentInput = '0';
      this.previousValue = null;
      this.operator = null;
      this.overwrite = false;
      this.lastEvaluation = null;
      this.updateDisplay();
    }

    backspace() {
      if (this.overwrite) {
        this.currentInput = '0';
        this.overwrite = false;
        this.updateDisplay();
        return;
      }
      if (this.currentInput.length > 1) {
        this.currentInput = this.currentInput.slice(0, -1);
      } else {
        this.currentInput = '0';
      }
      this.updateDisplay();
    }

    toggleSign() {
      if (this.currentInput === '0') return;
      if (this.currentInput.startsWith('-')) {
        this.currentInput = this.currentInput.slice(1);
      } else {
        this.currentInput = '-' + this.currentInput;
      }
      this.updateDisplay();
    }

    percent() {
      const value = Number(this.currentInput);
      if (!Number.isFinite(value)) return;
      this.currentInput = String(value / 100);
      this.updateDisplay();
    }

    inputDigit(d) {
      if (this.overwrite) {
        this.currentInput = d;
        this.overwrite = false;
      } else if (this.currentInput === '0') {
        this.currentInput = d;
      } else if (this.currentInput === '-0') {
        this.currentInput = '-' + d;
      } else {
        this.currentInput += d;
      }
      this.updateDisplay();
    }

    inputDot() {
      if (this.overwrite) {
        this.currentInput = '0.';
        this.overwrite = false;
        this.updateDisplay();
        return;
      }
      if (!this.currentInput.includes('.')) {
        this.currentInput += '.';
        this.updateDisplay();
      }
    }

    /**
     * Chooses or chains an operator
     * @param {'+'|'-'|'*'|'/'} op
     */
    chooseOperator(op) {
      const currentValue = Number(this.currentInput);
      if (!Number.isFinite(currentValue)) return;

      if (this.operator && this.previousValue != null && !this.overwrite) {
        const computed = this.compute(this.previousValue, currentValue, this.operator);
        this.previousValue = computed;
        this.currentInput = String(computed);
      } else if (this.previousValue == null) {
        this.previousValue = currentValue;
      }

      this.operator = op;
      this.overwrite = true;
      this.lastEvaluation = null;
      this.updateDisplay();
    }

    equals() {
      if (this.operator == null || this.previousValue == null) return;
      const a = this.previousValue;
      const b = Number(this.currentInput);
      const computed = this.compute(a, b, this.operator);
      this.currentInput = String(computed);
      this.lastEvaluation = { a, b, op: this.operator };
      this.previousValue = null;
      this.operator = null;
      this.overwrite = true;
      this.updateDisplay();
    }

    /**
     * @param {number} a
     * @param {number} b
     * @param {'+'|'-'|'*'|'/'} op
     */
    compute(a, b, op) {
      let result;
      switch (op) {
        case '+':
          result = a + b;
          break;
        case '-':
          result = a - b;
          break;
        case '*':
          result = a * b;
          break;
        case '/':
          if (b === 0) return NaN;
          result = a / b;
          break;
        default:
          return NaN;
      }
      // Normalize rounding noise like 0.30000000000004
      return Math.round(result * 1e12) / 1e12;
    }
  }

  // Bootstrapping UI bindings
  const historyEl = document.getElementById('history');
  const resultEl = document.getElementById('result');
  const calculator = new Calculator(historyEl, resultEl);

  const opMapToSymbol = {
    add: '+',
    subtract: '-',
    multiply: '*',
    divide: '/',
  };

  const keys = document.getElementById('keys');
  keys.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    const digit = target.getAttribute('data-digit');
    const operatorKey = target.getAttribute('data-operator');
    const isDot = target.hasAttribute('data-dot');
    const action = target.getAttribute('data-action');

    if (digit) {
      calculator.inputDigit(digit);
      return;
    }
    if (isDot) {
      calculator.inputDot();
      return;
    }
    if (operatorKey) {
      const op = opMapToSymbol[operatorKey];
      calculator.chooseOperator(op);
      return;
    }
    if (action === 'clear-all') {
      calculator.clearAll();
      return;
    }
    if (action === 'backspace') {
      calculator.backspace();
      return;
    }
    if (action === 'percent') {
      calculator.percent();
      return;
    }
    if (action === 'equals') {
      calculator.equals();
    }
  });

  // Keyboard support
  window.addEventListener('keydown', (e) => {
    const { key } = e;
    if (key >= '0' && key <= '9') {
      calculator.inputDigit(key);
      return;
    }
    if (key === '.' || key === ',') {
      e.preventDefault();
      calculator.inputDot();
      return;
    }
    if (key === '+' || key === '-' || key === '*' || key === '/') {
      calculator.chooseOperator(key);
      return;
    }
    if (key === 'Enter' || key === '=') {
      e.preventDefault();
      calculator.equals();
      return;
    }
    if (key === 'Backspace') {
      calculator.backspace();
      return;
    }
    if (key === 'Escape' || key.toLowerCase() === 'c') {
      calculator.clearAll();
      return;
    }
    if (key === '%') {
      calculator.percent();
      return;
    }
  });
})();


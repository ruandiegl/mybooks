// @vitest-environment jsdom
import React, { useEffect, useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('react-native', async () => import('react-native-web'));
import { WebViewportGate } from '../components/WebViewportGate/index.web';

let allowed = false;
let notify: () => void;
const boot = vi.fn();
function Runtime() {
  const [value, setValue] = useState('');
  useEffect(() => { boot(); }, []);
  return <input aria-label="Rascunho" value={value} onChange={e => setValue(e.target.value)} />;
}
beforeEach(() => {
  allowed = false; boot.mockClear();
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ get matches() { return allowed; }, addEventListener: (_: string, fn: () => void) => { notify = fn; }, removeEventListener() {} }) });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(cleanup);
function mount() { render(<WebViewportGate notice={<h1>Continue no celular ou tablet</h1>}><Runtime /></WebViewportGate>); }
it('does not mount the account runtime on an initially wide viewport', () => {
  const original = location.href; mount();
  expect(screen.getByRole('heading', { name: 'Continue no celular ou tablet' })).toBeTruthy();
  expect(screen.queryByLabelText('Rascunho')).toBeNull(); expect(boot).not.toHaveBeenCalled();
  expect(location.href).toBe(original);
});
it('keeps drafts and the same runtime mounted across narrow-wide-narrow transitions', () => {
  allowed = true; mount(); const input = screen.getByLabelText('Rascunho');
  fireEvent.change(input, { target: { value: 'Um livro para trocar' } });
  act(() => { allowed = false; notify(); });
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(input.closest('[hidden]')).not.toBeNull();
  act(() => { allowed = true; notify(); });
  expect(screen.getByLabelText('Rascunho')).toBe(input);
  expect((input as HTMLInputElement).value).toBe('Um livro para trocar'); expect(boot).toHaveBeenCalledTimes(1);
});
it('does not expose the wide app when Escape cancels the policy notice', () => {
  mount(); const gate = screen.getByRole('dialog'); const cancel = new Event('cancel', { cancelable: true });
  gate.dispatchEvent(cancel); expect(cancel.defaultPrevented).toBe(true); expect(gate.hasAttribute('open')).toBe(true);
});
it('gives useful browser guidance rather than booting a session when required APIs are missing', () => {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: undefined }); mount();
  expect(screen.getByRole('heading', { name: 'Atualize seu navegador' })).toBeTruthy(); expect(boot).not.toHaveBeenCalled();
});
it.each(['removed', 'disabled'])('focuses the screen heading when the previous field becomes %s while blocked', kind => {
  let removeField!: () => void;
  function ChangingRuntime() {
    const [show, setShow] = useState(true); removeField = () => setShow(false);
    return <><h1>Minha biblioteca</h1>{show || kind === 'disabled' ? <input disabled={!show} aria-label="Campo temporário" /> : null}</>;
  }
  allowed = true;
  render(<WebViewportGate notice={<h1>Continue no celular ou tablet</h1>}><ChangingRuntime /></WebViewportGate>);
  screen.getByLabelText('Campo temporário').focus();
  act(() => { allowed = false; notify(); }); act(removeField);
  act(() => { allowed = true; notify(); });
  expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Minha biblioteca' }));
});

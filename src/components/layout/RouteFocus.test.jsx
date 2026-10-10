import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useEffect } from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { RouteFocus } from './RouteFocus.jsx';

const nav = { go: null };
function Nav() {
  const navigate = useNavigate();
  useEffect(() => {
    nav.go = navigate;
  });
  return null;
}
function Page({ title }) {
  return (
    <main>
      <h1>{title}</h1>
    </main>
  );
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RouteFocus />
      <Nav />
      <Routes>
        <Route path="/" element={<Page title="Home" />} />
        <Route path="/a" element={<Page title="Page A" />} />
        <Route path="/crisis" element={<Page title="Crisis" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RouteFocus (ui-students item 4)', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
  });

  it('does nothing on the first page load', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'Home' })).not.toHaveFocus();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls to the top and focuses the new page h1 when the path changes', () => {
    renderAt('/');
    act(() => nav.go('/a'));
    const h1 = screen.getByRole('heading', { name: 'Page A' });
    expect(h1).toHaveFocus();
    expect(h1).toHaveAttribute('tabindex', '-1');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('leaves /crisis alone (it focuses its own heading)', () => {
    renderAt('/');
    act(() => nav.go('/crisis'));
    expect(screen.getByRole('heading', { name: 'Crisis' })).not.toHaveFocus();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('ignores hash links', () => {
    renderAt('/');
    act(() => nav.go('/#how'));
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});

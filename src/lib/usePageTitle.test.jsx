import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { usePageTitle } from './usePageTitle.js';

function Page({ heading }) {
  usePageTitle(heading);
  return null;
}

describe('usePageTitle (ui-students item 5)', () => {
  it('uses the page heading, then goes back to the app name when the page closes', () => {
    const { rerender, unmount } = render(<Page heading="Where to get help" />);
    expect(document.title).toBe('Where to get help · HingaWeb');
    rerender(<Page heading="" />);
    expect(document.title).toBe('HingaWeb');
    rerender(<Page heading="Log in" />);
    unmount();
    expect(document.title).toBe('HingaWeb');
  });
});

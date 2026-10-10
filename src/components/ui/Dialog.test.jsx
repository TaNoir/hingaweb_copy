// Phase 09 · regression test for the Dialog focus fix (typing inside a dialog keeps focus).
import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from './Dialog.jsx';

function Form() {
  const [value, setValue] = useState('');
  return (
    // onClose is a new function on every render, as in most callers.
    <Dialog open title="Edit" onClose={() => {}}>
      <label htmlFor="f">Name</label>
      <input id="f" value={value} onChange={(e) => setValue(e.target.value)} />
    </Dialog>
  );
}

describe('Dialog', () => {
  it('keeps focus in the field while the parent re-renders on each keystroke', async () => {
    const user = userEvent.setup();
    render(<Form />);
    const input = screen.getByLabelText('Name');
    await user.click(input);
    await user.keyboard('Ana Reyes');
    expect(input).toHaveValue('Ana Reyes');
    expect(input).toHaveFocus();
  });
});

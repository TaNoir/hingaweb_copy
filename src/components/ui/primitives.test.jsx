import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  Button,
  LinkButton,
  Card,
  Chip,
  Field,
  TextInput,
  PasswordInput,
  Textarea,
  Select,
  Checkbox,
  ScaleButtons,
  SegmentedControl,
  Dialog,
  Banner,
  PageHeader,
  EmptyState,
  ErrorState,
  Skeleton,
  OfflineBanner,
  Table,
} from './index.js';

describe('Button', () => {
  it('runs onClick and is disabled while loading', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(
      <Button onClick={onClick} loading>
        Save
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-busy', 'true');
  });
});

describe('LinkButton', () => {
  it('renders a link', () => {
    render(
      <MemoryRouter>
        <LinkButton to="/help">Help</LinkButton>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Help' })).toHaveAttribute('href', '/help');
  });
});

describe('Card, Chip, PageHeader, EmptyState, Banner', () => {
  it('render their content', () => {
    render(
      <>
        <Card>card body</Card>
        <Chip>chip</Chip>
        <PageHeader eyebrow="eyebrow" title="Title" lead="Lead" />
        <EmptyState title="Nothing yet" body="Body" />
        <Banner tone="attention" title="Heads up">
          Text
        </Banner>
      </>,
    );
    expect(screen.getByText('card body')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Title' })).toBeInTheDocument();
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
    expect(screen.getByText('Heads up')).toBeInTheDocument();
  });
});

describe('Field + TextInput', () => {
  it('links label, hint, and error to the control', () => {
    render(
      <Field id="email" label="Email" hint="Your school email" error="Enter a valid email address.">
        <TextInput />
      </Field>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Your school email Enter a valid email address.');
  });
});

describe('PasswordInput', () => {
  it('toggles visibility', async () => {
    render(
      <Field id="pw" label="Password">
        <PasswordInput />
      </Field>,
    );
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
  });
});

describe('Textarea and Select', () => {
  it('render with limits and options', () => {
    render(
      <>
        <Field id="note" label="Note">
          <Textarea />
        </Field>
        <Field id="grade" label="Grade">
          <Select
            placeholder="Pick"
            options={[{ value: '11', label: 'Grade 11' }]}
            defaultValue=""
          />
        </Field>
      </>,
    );
    expect(screen.getByLabelText('Note')).toHaveAttribute('maxLength', '2000');
    expect(screen.getByRole('option', { name: 'Grade 11' })).toBeInTheDocument();
  });
});

describe('Checkbox', () => {
  it('reports changes', async () => {
    const onChange = vi.fn();
    render(<Checkbox id="ack" label="I understand" checked={false} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('I understand'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('ScaleButtons', () => {
  it('is a radio group with arrow-key movement', async () => {
    const onChange = vi.fn();
    const opts = [
      { value: 1, label: 'Not at all' },
      { value: 2, label: 'A little' },
    ];
    render(
      <ScaleButtons name="c1" legend="School work" options={opts} value={1} onChange={onChange} />,
    );
    expect(screen.getByRole('radiogroup', { name: 'School work' })).toBeInTheDocument();
    const first = screen.getByRole('radio', { name: 'Not at all' });
    expect(first).toHaveAttribute('aria-checked', 'true');
    first.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith(2);
  });
});

describe('SegmentedControl', () => {
  it('selects an option', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Range"
        value="a"
        onChange={onChange}
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('radio', { name: 'B' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  const three = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
    { value: 'c', label: 'C' },
  ];

  it('is one Tab stop: the selected option, or the first when none is selected', () => {
    const { rerender } = render(
      <SegmentedControl label="Range" value="b" onChange={() => {}} options={three} />,
    );
    const tabIndexes = () => screen.getAllByRole('radio').map((r) => r.tabIndex);
    expect(tabIndexes()).toEqual([-1, 0, -1]);
    rerender(<SegmentedControl label="Range" value={null} onChange={() => {}} options={three} />);
    expect(tabIndexes()).toEqual([0, -1, -1]);
  });

  it('moves focus with the arrow keys, wrapping, without selecting', async () => {
    const onChange = vi.fn();
    render(<SegmentedControl label="Range" value="a" onChange={onChange} options={three} />);
    await userEvent.tab();
    expect(screen.getByRole('radio', { name: 'A' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'B' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'C' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'A' })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'C' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('radio', { name: 'B' })).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: 'A' })).toHaveAttribute('aria-checked', 'true');
  });

  it('Home and End move focus to the first and last option without selecting', async () => {
    const onChange = vi.fn();
    render(<SegmentedControl label="Range" value="b" onChange={onChange} options={three} />);
    await userEvent.tab();
    expect(screen.getByRole('radio', { name: 'B' })).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('radio', { name: 'C' })).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('radio', { name: 'A' })).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Enter and Space select the focused option', async () => {
    const onChange = vi.fn();
    render(<SegmentedControl label="Range" value="a" onChange={onChange} options={three} />);
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('b');
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenLastCalledWith('c');
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

describe('Dialog', () => {
  it('opens as a modal, closes on Escape when dismissible', async () => {
    const onClose = vi.fn();
    render(
      <Dialog open title="Title" onClose={onClose}>
        <button>Inside</button>
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Title' })).toHaveAttribute('aria-modal', 'true');
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
  it('ignores Escape and hides the close button when not dismissible', async () => {
    const onClose = vi.fn();
    render(
      <Dialog open dismissible={false} title="Locked" onClose={onClose}>
        <button>Inside</button>
      </Dialog>,
    );
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('ErrorState and Skeleton', () => {
  it('show default copy and retry', async () => {
    const onRetry = vi.fn();
    render(
      <>
        <ErrorState onRetry={onRetry} />
        <Skeleton />
      </>,
    );
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });
});

describe('OfflineBanner', () => {
  it('appears when the browser goes offline', () => {
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).toBeNull();
    act(() => window.dispatchEvent(new Event('offline')));
    expect(screen.getByRole('status')).toHaveTextContent("You're offline.");
  });
});

describe('Table', () => {
  it('renders a captioned table', () => {
    render(
      <Table
        caption="Requests"
        columns={[{ key: 'name', header: 'Student' }]}
        rows={[{ id: 1, name: 'Ana' }]}
        getRowKey={(r) => r.id}
      />,
    );
    expect(screen.getByRole('table', { name: 'Requests' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Ana' })).toBeInTheDocument();
  });
});

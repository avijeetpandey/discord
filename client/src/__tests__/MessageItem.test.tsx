import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MessageItem from '@/components/chat/MessageItem';
import type { Message } from '@/types';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const baseMessage: Message = {
  id: 'msg-1',
  channelId: 'ch-1',
  content: 'Hello world',
  edited: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  author: {
    id: 'user-1',
    username: 'alice',
    email: 'alice@test.com',
    avatarUrl: null,
    createdAt: '',
  },
};

const defaultProps = {
  message: baseMessage,
  isOwn: true,
  showHeader: true,
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

/**
 * Find the outermost container div (div.group) and fire mouseEnter on it.
 * DOM structure: div.group > div.flex-1 > p (message text)
 */
function getMessageContainer() {
  const p = screen.getByText('Hello world');
  // p.parentElement = div.flex-1, .parentElement = div.group (has onMouseEnter)
  return p.parentElement!.parentElement!;
}

async function hoverMessage() {
  fireEvent.mouseEnter(getMessageContainer());
  await waitFor(() => {
    const hasActionBtn = screen
      .getAllByRole('button')
      .some((b) => b.querySelector('svg.lucide-pencil, svg.lucide-trash2'));
    expect(hasActionBtn).toBe(true);
  });
}

async function clickActionButton(svgClass: 'lucide-pencil' | 'lucide-trash2') {
  await hoverMessage();
  const btn = screen.getAllByRole('button').find((b) => b.querySelector(`svg.${svgClass}`))!;
  fireEvent.click(btn);
}

describe('MessageItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders message content', () => {
    render(<MessageItem {...defaultProps} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders author username when showHeader=true', () => {
    render(<MessageItem {...defaultProps} />);
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('does not render author username when showHeader=false', () => {
    render(<MessageItem {...defaultProps} showHeader={false} />);
    expect(screen.queryByText('alice')).not.toBeInTheDocument();
  });

  it('shows (edited) badge when message is edited', () => {
    render(<MessageItem {...defaultProps} message={{ ...baseMessage, edited: true }} />);
    expect(screen.getByText('(edited)')).toBeInTheDocument();
  });

  it('shows edit and delete buttons on hover for own messages', async () => {
    render(<MessageItem {...defaultProps} />);
    await hoverMessage();

    const pencilBtn = screen.getAllByRole('button').find((b) => b.querySelector('svg.lucide-pencil'));
    const trashBtn = screen.getAllByRole('button').find((b) => b.querySelector('svg.lucide-trash2'));
    expect(pencilBtn).toBeTruthy();
    expect(trashBtn).toBeTruthy();
  });

  it('does not show action buttons for other users messages', async () => {
    render(<MessageItem {...defaultProps} isOwn={false} />);
    fireEvent.mouseEnter(getMessageContainer());

    const allBtns = screen.queryAllByRole('button');
    const hasActionBtn = allBtns.some(
      (b) => b.querySelector('svg.lucide-pencil, svg.lucide-trash2'),
    );
    expect(hasActionBtn).toBe(false);
  });

  it('enters edit mode when pencil button clicked', async () => {
    render(<MessageItem {...defaultProps} />);
    await clickActionButton('lucide-pencil');

    await waitFor(() => {
      expect(screen.getByDisplayValue('Hello world')).toBeInTheDocument();
    });
  });

  it('saves edit on Enter key', async () => {
    defaultProps.onEdit.mockResolvedValueOnce(undefined);
    render(<MessageItem {...defaultProps} />);
    await clickActionButton('lucide-pencil');

    await waitFor(() => screen.getByDisplayValue('Hello world'));
    const textarea = screen.getByDisplayValue('Hello world') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Updated message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    await waitFor(() =>
      expect(defaultProps.onEdit).toHaveBeenCalledWith('msg-1', 'Updated message'),
    );
  });

  it('cancels edit on Escape key', async () => {
    render(<MessageItem {...defaultProps} />);
    await clickActionButton('lucide-pencil');

    await waitFor(() => screen.getByDisplayValue('Hello world'));
    const textarea = screen.getByDisplayValue('Hello world');
    fireEvent.change(textarea, { target: { value: 'Something else' } });
    fireEvent.keyDown(textarea, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByDisplayValue('Something else')).not.toBeInTheDocument();
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });
  });

  it('calls onDelete when delete button clicked', async () => {
    defaultProps.onDelete.mockResolvedValueOnce(undefined);
    render(<MessageItem {...defaultProps} />);
    await clickActionButton('lucide-trash2');

    await waitFor(() => expect(defaultProps.onDelete).toHaveBeenCalledWith('msg-1'));
  });

  it('shows error toast when edit fails', async () => {
    const { toast } = await import('sonner');
    defaultProps.onEdit.mockRejectedValueOnce(new Error('Network error'));

    render(<MessageItem {...defaultProps} />);
    await clickActionButton('lucide-pencil');

    await waitFor(() => screen.getByDisplayValue('Hello world'));
    const textarea = screen.getByDisplayValue('Hello world') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Updated' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Failed to edit message.'),
    );
  });

  it('shows error toast when delete fails', async () => {
    const { toast } = await import('sonner');
    defaultProps.onDelete.mockRejectedValueOnce(new Error('Network error'));

    render(<MessageItem {...defaultProps} />);
    await clickActionButton('lucide-trash2');

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Failed to delete message.'),
    );
  });

  it('does not call onEdit when content unchanged', async () => {
    render(<MessageItem {...defaultProps} />);
    await clickActionButton('lucide-pencil');

    await waitFor(() => screen.getByDisplayValue('Hello world'));
    fireEvent.keyDown(screen.getByDisplayValue('Hello world'), { key: 'Enter', shiftKey: false });

    expect(defaultProps.onEdit).not.toHaveBeenCalled();
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MessageInput from '@/components/chat/MessageInput';

describe('MessageInput', () => {
  it('renders placeholder with channel name', () => {
    render(<MessageInput channelName="general" onSend={vi.fn()} />);
    expect(screen.getByPlaceholderText('Message #general')).toBeInTheDocument();
  });

  it('calls onSend with trimmed value on Enter', () => {
    const onSend = vi.fn();
    render(<MessageInput channelName="general" onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('Message #general');
    fireEvent.change(textarea, { target: { value: '  hello world  ' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSend).toHaveBeenCalledWith('hello world');
  });

  it('does not send on Shift+Enter', () => {
    const onSend = vi.fn();
    render(<MessageInput channelName="general" onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('Message #general');
    fireEvent.change(textarea, { target: { value: 'hello' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not send empty / whitespace-only messages', () => {
    const onSend = vi.fn();
    render(<MessageInput channelName="general" onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('Message #general');
    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('clears the textarea after sending', () => {
    const onSend = vi.fn();
    render(<MessageInput channelName="general" onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('Message #general') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(textarea.value).toBe('');
  });

  it('shows "Connecting…" placeholder and disables input when disabled', () => {
    render(<MessageInput channelName="general" onSend={vi.fn()} disabled />);
    const textarea = screen.getByPlaceholderText('Connecting…') as HTMLTextAreaElement;
    expect(textarea).toBeDisabled();
  });

  it('send button is disabled when value is empty', () => {
    render(<MessageInput channelName="general" onSend={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('send button triggers onSend on click', () => {
    const onSend = vi.fn();
    render(<MessageInput channelName="general" onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('Message #general');
    fireEvent.change(textarea, { target: { value: 'click send' } });
    fireEvent.click(screen.getByRole('button'));
    expect(onSend).toHaveBeenCalledWith('click send');
  });
});

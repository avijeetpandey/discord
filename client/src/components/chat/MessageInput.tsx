import { useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  channelName: string;
  disabled?: boolean;
  onSend: (content: string) => void;
}

export default function MessageInput({ channelName, disabled, onSend }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const content = value.trim();
    if (!content || disabled) return;
    onSend(content);
    setValue('');
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="px-4 pb-6 pt-0">
      <div className="flex items-end gap-2 rounded-lg bg-discord-600 px-4 py-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? 'Connecting…' : `Message #${channelName}`}
          className="flex-1 resize-none bg-transparent text-sm text-discord-text-primary placeholder:text-discord-text-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          style={{ maxHeight: '200px' }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
          }}
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="h-8 w-8 shrink-0 text-discord-text-muted hover:text-white disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

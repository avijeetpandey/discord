import { useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { format, isToday, isYesterday } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Message } from '@/types';

interface Props {
  message: Message;
  isOwn: boolean;
  showHeader: boolean;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function formatTs(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return `Today at ${format(d, 'h:mm a')}`;
  if (isYesterday(d)) return `Yesterday at ${format(d, 'h:mm a')}`;
  return format(d, 'MM/dd/yyyy h:mm a');
}

export default function MessageItem({ message, isOwn, showHeader, onEdit, onDelete }: Props) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const [saving, setSaving] = useState(false);

  async function saveEdit() {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === message.content) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onEdit(message.id, trimmed);
    } catch {
      toast.error('Failed to edit message.');
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  async function handleDelete() {
    try {
      await onDelete(message.id);
    } catch {
      toast.error('Failed to delete message.');
    }
  }

  function cancelEdit() {
    setEditValue(message.content);
    setEditing(false);
  }

  const initials = message.author.username.slice(0, 2).toUpperCase();

  return (
    <div
      className="group relative flex items-start gap-3 px-4 py-0.5 hover:bg-discord-750/50"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar column — only shown for first message in a group */}
      <div className="w-10 shrink-0 pt-0.5">
        {showHeader ? (
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-discord-brand text-[11px] font-bold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span className="invisible block text-[11px] text-discord-text-muted group-hover:visible">
            {format(new Date(message.createdAt), 'h:mm a')}
          </span>
        )}
      </div>

      {/* Content column */}
      <div className="flex-1 overflow-hidden">
        {showHeader && (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-white">{message.author.username}</span>
            <span className="text-[11px] text-discord-text-muted">
              {formatTs(message.createdAt)}
            </span>
          </div>
        )}

        {editing ? (
          <div className="mt-1">
            <textarea
              autoFocus
              rows={1}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                }
                if (e.key === 'Escape') cancelEdit();
              }}
              className="w-full resize-none rounded bg-discord-600 p-2 text-sm text-discord-text-primary focus:outline-none"
              style={{ maxHeight: '200px' }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${el.scrollHeight}px`;
              }}
            />
            <div className="mt-1 flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={saveEdit}
                disabled={saving}
                className="h-6 px-2 text-xs text-green-400 hover:text-green-300"
              >
                <Check className="mr-1 h-3 w-3" /> Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelEdit}
                className="h-6 px-2 text-xs text-discord-text-muted hover:text-white"
              >
                <X className="mr-1 h-3 w-3" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="break-words text-sm text-discord-text-primary">
            {message.content}
            {message.edited && (
              <span className="ml-1 text-[11px] text-discord-text-muted">(edited)</span>
            )}
          </p>
        )}
      </div>

      {/* Hover action buttons */}
      {hovered && !editing && isOwn && (
        <div className="absolute right-4 top-0 -translate-y-1/2 flex gap-1 rounded bg-discord-600 p-1 shadow-md">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-discord-text-muted hover:text-yellow-400"
            onClick={() => {
              setEditValue(message.content);
              setEditing(true);
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-discord-text-muted hover:text-red-400"
            onClick={handleDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

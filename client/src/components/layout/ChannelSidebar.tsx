import { useState } from 'react';
import { Hash, Plus, LogOut, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import api from '@/lib/api';
import type { Channel, ServerDetail, User } from '@/types';

interface Props {
  serverDetail: ServerDetail | null;
  activeChannelId: string | undefined;
  currentUser: User | null;
  connected: boolean;
  onChannelCreated: (channel: Channel) => void;
  onLogout: () => void;
}

export default function ChannelSidebar({
  serverDetail,
  activeChannelId,
  currentUser,
  connected,
  onChannelCreated,
  onLogout,
}: Props) {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isOwnerOrAdmin =
    serverDetail?.members.some(
      (m) => m.userId === currentUser?.id && (m.role === 'OWNER' || m.role === 'ADMIN'),
    ) ?? false;

  function closeDialog() {
    setShowCreate(false);
    setChannelName('');
    setError('');
  }

  async function handleCreateChannel() {
    if (!serverDetail || !channelName.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post<Channel>(`/servers/${serverDetail.id}/channels`, {
        name: channelName.trim(),
        type: 'TEXT',
      });
      toast.success(`Channel #${data.name} created!`);
      onChannelCreated(data);
      closeDialog();
      navigate(`/app/${serverDetail.id}/${data.id}`);
    } catch {
      setError('Failed to create channel.');
    } finally {
      setSubmitting(false);
    }
  }

  const initials = currentUser?.username.slice(0, 2).toUpperCase() ?? '??';

  return (
    <>
      <aside className="flex w-60 shrink-0 flex-col bg-discord-800">
        {/* Header */}
        <div className="flex h-12 items-center justify-between border-b border-discord-900 px-4 shadow-sm">
          <span className="truncate text-sm font-semibold text-white">
            {serverDetail?.name ?? 'Discord Clone'}
          </span>
          {serverDetail && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-discord-text-muted hover:text-white">
                  <Settings className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Server Settings</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {serverDetail ? (
            <>
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-discord-text-muted">
                  Text Channels
                </span>
                {isOwnerOrAdmin && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        aria-label="Create Channel"
                        onClick={() => setShowCreate(true)}
                        className="text-discord-text-muted hover:text-white"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Create Channel</TooltipContent>
                  </Tooltip>
                )}
              </div>
              {serverDetail.channels
                .filter((c) => c.type === 'TEXT')
                .sort((a, b) => a.position - b.position)
                .map((ch) => {
                  const active = ch.id === activeChannelId;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => navigate(`/app/${serverDetail.id}/${ch.id}`)}
                      className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-sm transition-colors ${
                        active
                          ? 'bg-discord-600 text-white'
                          : 'text-discord-text-muted hover:bg-discord-750 hover:text-discord-text-primary'
                      }`}
                    >
                      <Hash className="h-4 w-4 shrink-0" />
                      <span className="truncate">{ch.name}</span>
                    </button>
                  );
                })}
            </>
          ) : (
            <p className="px-2 py-2 text-xs italic text-discord-text-muted">
              Select a server to see channels
            </p>
          )}
        </div>

        {/* User panel */}
        <div className="flex h-[52px] items-center gap-2 bg-discord-900 px-2">
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-discord-brand text-[11px] font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-discord-900 ${
                connected ? 'bg-discord-online' : 'bg-discord-offline'
              }`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{currentUser?.username}</p>
            <p className="text-[11px] text-discord-text-muted">
              {connected ? 'Online' : 'Connecting…'}
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Log Out"
                onClick={onLogout}
                className="h-8 w-8 text-discord-text-muted hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Log Out</TooltipContent>
          </Tooltip>
        </div>
      </aside>

      {/* Create channel dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="bg-discord-800 text-white border-discord-600">
          <DialogHeader>
            <DialogTitle>Create Channel</DialogTitle>
            <DialogDescription className="text-discord-text-muted">
              Add a new text channel to this server.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="channel-name">Channel Name</Label>
            <Input
              id="channel-name"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateChannel()}
              placeholder="new-channel"
              className="bg-discord-900 border-discord-600 text-white"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog} className="text-discord-text-muted">
              Cancel
            </Button>
            <Button onClick={handleCreateChannel} disabled={submitting || !channelName.trim()}>
              {submitting ? 'Creating…' : 'Create Channel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

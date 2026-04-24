import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Plus } from 'lucide-react';
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
import type { Server, ServerDetail } from '@/types';

interface Props {
  servers: Server[];
  activeServerId: string | undefined;
  onCreateServer: (name: string) => Promise<ServerDetail>;
  onJoinServer: (code: string) => Promise<ServerDetail>;
}

export default function ServerSidebar({
  servers,
  activeServerId,
  onCreateServer,
  onJoinServer,
}: Props) {
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<'none' | 'create' | 'join'>('none');
  const [nameValue, setNameValue] = useState('');
  const [codeValue, setCodeValue] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function close() {
    setDialog('none');
    setNameValue('');
    setCodeValue('');
    setError('');
  }

  async function handleCreate() {
    const name = nameValue.trim();
    if (!name) return;
    setSubmitting(true);
    setError('');
    try {
      const detail = await onCreateServer(name);
      toast.success(`Server "${detail.name}" created!`);
      close();
      navigate(`/app/${detail.id}`);
    } catch {
      setError('Failed to create server.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoin() {
    const code = codeValue.trim();
    if (!code) return;
    setSubmitting(true);
    setError('');
    try {
      const detail = await onJoinServer(code);
      toast.success(`Joined "${detail.name}"!`);
      close();
      navigate(`/app/${detail.id}`);
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setError('You are already a member of this server.');
      } else {
        setError('Invalid invite code.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <nav className="flex w-[72px] shrink-0 flex-col items-center gap-2 bg-discord-900 py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate('/app')}
              className="flex h-12 w-12 items-center justify-center rounded-[24px] bg-discord-brand transition-all duration-200 hover:rounded-[16px]"
            >
              <span className="text-lg font-bold text-white">D</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Direct Messages</TooltipContent>
        </Tooltip>

        <div className="mx-auto h-[2px] w-8 rounded-full bg-discord-800" />

        {servers.map((s) => {
          const active = s.id === activeServerId;
          const initials = s.name.slice(0, 2).toUpperCase();
          return (
            <Tooltip key={s.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate(`/app/${s.id}`)}
                  className={`relative flex h-12 w-12 items-center justify-center overflow-hidden transition-all duration-200 ${
                    active
                      ? 'rounded-[16px] bg-discord-brand'
                      : 'rounded-[24px] bg-discord-600 hover:rounded-[16px] hover:bg-discord-brand'
                  }`}
                >
                  {s.iconUrl ? (
                    <img src={s.iconUrl} alt={s.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-white">{initials}</span>
                  )}
                  {active && (
                    <span className="absolute left-0 top-1/2 h-10 w-1 -translate-y-1/2 rounded-r-full bg-white" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{s.name}</TooltipContent>
            </Tooltip>
          );
        })}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              aria-label="Add a Server"
              onClick={() => setDialog('create')}
              className="flex h-12 w-12 items-center justify-center rounded-[24px] bg-discord-600 text-green-400 transition-all duration-200 hover:rounded-[16px] hover:bg-green-500 hover:text-white"
            >
              <Plus className="h-6 w-6" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Add a Server</TooltipContent>
        </Tooltip>
      </nav>

      {/* Create server dialog */}
      <Dialog open={dialog === 'create'} onOpenChange={(o) => !o && close()}>
        <DialogContent className="bg-discord-800 text-white border-discord-600">
          <DialogHeader>
            <DialogTitle>Create a Server</DialogTitle>
            <DialogDescription className="text-discord-text-muted">
              Give your server a name. You can always change it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="server-name">Server Name</Label>
            <Input
              id="server-name"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="My Awesome Server"
              className="bg-discord-900 border-discord-600 text-white"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setDialog('join')}
              className="text-discord-text-muted"
            >
              Join instead
            </Button>
            <Button onClick={handleCreate} disabled={submitting || !nameValue.trim()}>
              {submitting ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join server dialog */}
      <Dialog open={dialog === 'join'} onOpenChange={(o) => !o && close()}>
        <DialogContent className="bg-discord-800 text-white border-discord-600">
          <DialogHeader>
            <DialogTitle>Join a Server</DialogTitle>
            <DialogDescription className="text-discord-text-muted">
              Enter an invite code to join an existing server.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="invite-code">Invite Code</Label>
            <Input
              id="invite-code"
              value={codeValue}
              onChange={(e) => setCodeValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="hTKzmak"
              className="bg-discord-900 border-discord-600 text-white"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setDialog('create')}
              className="text-discord-text-muted"
            >
              Create instead
            </Button>
            <Button onClick={handleJoin} disabled={submitting || !codeValue.trim()}>
              {submitting ? 'Joining…' : 'Join'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

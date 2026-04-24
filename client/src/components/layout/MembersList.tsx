import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Member } from '@/types';

interface Props {
  members: Member[];
  onlineUsers: Set<string>;
}

function MemberRow({ member, online }: { member: Member; online: boolean }) {
  const initials = member.username.slice(0, 2).toUpperCase();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`flex items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-discord-750 ${
            online ? 'opacity-100' : 'opacity-50'
          }`}
        >
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-discord-brand text-[11px] font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-discord-800 ${
                online ? 'bg-discord-online' : 'bg-discord-offline'
              }`}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-discord-text-primary">
              {member.username}
            </p>
            {member.role !== 'MEMBER' && (
              <p className="text-[10px] uppercase tracking-wide text-discord-text-muted">
                {member.role.toLowerCase()}
              </p>
            )}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="left">{member.username}</TooltipContent>
    </Tooltip>
  );
}

export default function MembersList({ members, onlineUsers }: Props) {
  const online = members.filter((m) => onlineUsers.has(m.userId));
  const offline = members.filter((m) => !onlineUsers.has(m.userId));

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-discord-800 lg:flex">
      <div className="flex-1 overflow-y-auto p-3">
        {online.length > 0 && (
          <>
            <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-discord-text-muted">
              Online — {online.length}
            </p>
            {online.map((m) => (
              <MemberRow key={m.id} member={m} online />
            ))}
          </>
        )}
        {offline.length > 0 && (
          <>
            <p className="px-2 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-discord-text-muted">
              Offline — {offline.length}
            </p>
            {offline.map((m) => (
              <MemberRow key={m.id} member={m} online={false} />
            ))}
          </>
        )}
      </div>
    </aside>
  );
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Server {
  id: string;
  name: string;
  iconUrl: string | null;
  inviteCode: string;
  ownerId: string;
  createdAt: string;
}

export interface Channel {
  id: string;
  serverId: string;
  name: string;
  type: 'TEXT' | 'VOICE';
  position: number;
  createdAt: string;
}

export interface Member {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
}

export interface ServerDetail {
  id: string;
  name: string;
  iconUrl: string | null;
  inviteCode: string;
  owner: User;
  channels: Channel[];
  members: Member[];
  createdAt: string;
}

export interface Message {
  id: string;
  channelId: string;
  content: string;
  edited: boolean;
  createdAt: string;
  updatedAt: string;
  author: User;
}

export interface ChatMessageEvent {
  type: 'MESSAGE_CREATE' | 'MESSAGE_UPDATE' | 'MESSAGE_DELETE';
  message: Message;
}

export interface PresenceEvent {
  type: 'PRESENCE_UPDATE';
  userId: string;
  status: 'ONLINE' | 'OFFLINE';
}

export interface ApiError {
  error: string;
  fields?: Record<string, string>;
}

CREATE TABLE users (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    username    VARCHAR(32)  NOT NULL UNIQUE,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE servers (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    icon_url    TEXT,
    owner_id    UUID         NOT NULL REFERENCES users(id),
    invite_code VARCHAR(12)  NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE server_members (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id  UUID        NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    role       VARCHAR(10) NOT NULL DEFAULT 'MEMBER',
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (server_id, user_id)
);

CREATE TABLE channels (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id  UUID         NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    type       VARCHAR(10)  NOT NULL DEFAULT 'TEXT',
    position   INT          NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE messages (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID        NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    author_id  UUID        NOT NULL REFERENCES users(id),
    content    TEXT        NOT NULL,
    edited     BOOLEAN     NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_channel_created  ON messages(channel_id, created_at DESC);
CREATE INDEX idx_server_members_user_id    ON server_members(user_id);
CREATE INDEX idx_channels_server_position  ON channels(server_id, position);

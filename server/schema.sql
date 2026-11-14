-- 세이버 노트 · 선수 응원방 테이블
-- 서버(server/db.ts)가 처음 DB를 쓸 때 이 파일을 그대로 한 번 실행한다. 모든 문장은 여러 번 실행해도 안전하다.
-- Supabase SQL 편집기에 붙여 넣어 직접 실행해도 된다.

-- 응원 메시지
CREATE TABLE IF NOT EXISTS cheer_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   TEXT        NOT NULL CHECK (char_length(player_id) BETWEEN 1 AND 64),
  author_id   TEXT        NOT NULL CHECK (char_length(author_id) BETWEEN 1 AND 128),
  author_name TEXT        CHECK (author_name IS NULL OR char_length(author_name) <= 40),
  text        TEXT        NOT NULL CHECK (char_length(text) <= 200 AND btrim(text) <> ''),
  caution     BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cheer_messages_created_at_idx ON cheer_messages (created_at DESC);

-- 신고: 한 사람이 한 메시지에 한 번만. 메시지를 지우면 함께 지운다
CREATE TABLE IF NOT EXISTS cheer_reports (
  message_id UUID        NOT NULL REFERENCES cheer_messages (id) ON DELETE CASCADE,
  user_id    TEXT        NOT NULL CHECK (char_length(user_id) BETWEEN 1 AND 128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);
CREATE INDEX IF NOT EXISTS cheer_reports_user_id_idx ON cheer_reports (user_id);

-- 「응원하기」: 한 사람이 선수 한 명에게 하루(한국 시간) 1번
CREATE TABLE IF NOT EXISTS cheer_events (
  id         BIGSERIAL   PRIMARY KEY,
  player_id  TEXT        NOT NULL CHECK (char_length(player_id) BETWEEN 1 AND 64),
  user_id    TEXT        NOT NULL CHECK (char_length(user_id) BETWEEN 1 AND 128),
  cheer_date DATE        NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_id, user_id, cheer_date)
);
CREATE INDEX IF NOT EXISTS cheer_events_created_at_idx ON cheer_events (created_at DESC);

-- Row Level Security를 켜고 정책은 두지 않는다.
-- Supabase 공개 API(anon·authenticated 키)로는 읽고 쓸 수 없고, DATABASE_URL로 접속하는 서버(테이블 소유자)는 영향을 받지 않는다.
ALTER TABLE cheer_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cheer_reports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cheer_events   ENABLE ROW LEVEL SECURITY;

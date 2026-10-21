CREATE TABLE public.rooms (
  id text PRIMARY KEY,
  title text NOT NULL,
  date text NOT NULL DEFAULT '',
  members jsonb NOT NULL DEFAULT '[]',
  votes jsonb NOT NULL DEFAULT '{}',
  decided text,
  voting_started_at timestamptz,
  voting_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.rooms TO anon;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone with the link can read rooms" ON public.rooms FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can create rooms" ON public.rooms FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone with the link can update rooms" ON public.rooms FOR UPDATE TO anon USING (true);

CREATE TABLE public.room_owners (
  room_id text PRIMARY KEY REFERENCES public.rooms(id) ON DELETE CASCADE,
  owner_token text NOT NULL
);
GRANT ALL ON public.room_owners TO service_role;
ALTER TABLE public.room_owners ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  room text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.events TO anon;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read events" ON public.events FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can log events" ON public.events FOR INSERT TO anon WITH CHECK (true);

-- Owner-gated fields (decided, voting window) can only change via the RPCs below.
CREATE OR REPLACE FUNCTION public.guard_room_owner_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('app.owner_action', true) = 'on' THEN RETURN NEW; END IF;
  IF NEW.decided IS DISTINCT FROM OLD.decided
     OR NEW.voting_started_at IS DISTINCT FROM OLD.voting_started_at
     OR NEW.voting_ends_at IS DISTINCT FROM OLD.voting_ends_at THEN
    RAISE EXCEPTION 'Hanya pembuat rencana yang bisa mengubah status voting';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER rooms_guard BEFORE UPDATE ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.guard_room_owner_fields();

CREATE OR REPLACE FUNCTION public.create_room(_id text, _title text, _date text, _owner_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO rooms (id, title, date) VALUES (_id, _title, _date);
  INSERT INTO room_owners (room_id, owner_token) VALUES (_id, _owner_token);
END $$;

CREATE OR REPLACE FUNCTION public.is_room_owner(_room_id text, _owner_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM room_owners WHERE room_id = _room_id AND owner_token = _owner_token);
$$;

CREATE OR REPLACE FUNCTION public.start_voting(_room_id text, _owner_token text, _ends_at timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_room_owner(_room_id, _owner_token) THEN RAISE EXCEPTION 'Bukan pemilik rencana'; END IF;
  PERFORM set_config('app.owner_action', 'on', true);
  UPDATE rooms SET voting_started_at = now(), voting_ends_at = _ends_at WHERE id = _room_id;
END $$;

CREATE OR REPLACE FUNCTION public.lock_decision(_room_id text, _owner_token text, _place_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_room_owner(_room_id, _owner_token) THEN RAISE EXCEPTION 'Bukan pemilik rencana'; END IF;
  PERFORM set_config('app.owner_action', 'on', true);
  UPDATE rooms SET decided = _place_id WHERE id = _room_id;
END $$;

CREATE OR REPLACE FUNCTION public.reopen_decision(_room_id text, _owner_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_room_owner(_room_id, _owner_token) THEN RAISE EXCEPTION 'Bukan pemilik rencana'; END IF;
  PERFORM set_config('app.owner_action', 'on', true);
  UPDATE rooms SET decided = NULL, voting_started_at = NULL, voting_ends_at = NULL WHERE id = _room_id;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
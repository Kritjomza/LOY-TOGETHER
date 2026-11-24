-- Run once in the SQL Editor of the Supabase project dedicated to Loy Together.
-- Room links are bearer secrets: anyone holding one can read wishes and float the room.
create table public.loy_rooms (
  id text primary key check (id ~ '^[A-Za-z0-9_-]{24}$'),
  style text not null check (style in ('lotus', 'gold', 'orchid', 'jasmine')),
  wishes jsonb not null default '[]'::jsonb check (jsonb_typeof(wishes) = 'array' and jsonb_array_length(wishes) <= 50),
  floated boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.loy_rooms enable row level security;
revoke all on public.loy_rooms from public, anon, authenticated;
grant select, insert, update on public.loy_rooms to service_role;

create function public.loy_create(p_id text, p_style text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare r public.loy_rooms;
begin
  insert into public.loy_rooms (id, style) values (p_id, p_style) returning * into r;
  return jsonb_build_object('id', r.id, 'style', r.style, 'wishes', r.wishes, 'floated', r.floated);
end $$;

create function public.loy_get(p_id text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare r public.loy_rooms;
begin
  select * into r from public.loy_rooms where id = p_id;
  if not found then return jsonb_build_object('status', 404, 'error', 'ไม่พบห้องนี้'); end if;
  return jsonb_build_object('id', r.id, 'style', r.style, 'wishes', r.wishes, 'floated', r.floated);
end $$;

create function public.loy_wish(p_id text, p_name text, p_wish text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare r public.loy_rooms;
begin
  if length(trim(p_name)) not between 1 and 30 or length(trim(p_wish)) not between 1 and 200 then
    return jsonb_build_object('status', 400, 'error', 'กรุณาใส่ชื่อและคำอธิษฐาน');
  end if;
  select * into r from public.loy_rooms where id = p_id for update;
  if not found then return jsonb_build_object('status', 404, 'error', 'ไม่พบห้องนี้'); end if;
  if r.floated then return jsonb_build_object('status', 409, 'error', 'กระทงถูกลอยแล้ว สร้างห้องใหม่เพื่ออธิษฐานอีกครั้ง'); end if;
  if jsonb_array_length(r.wishes) >= 50 then return jsonb_build_object('status', 400, 'error', 'ห้องนี้มีคำอธิษฐานครบ 50 ข้อแล้ว'); end if;
  update public.loy_rooms set wishes = wishes || jsonb_build_array(jsonb_build_object('name', trim(p_name), 'wish', trim(p_wish))) where id = p_id returning * into r;
  return jsonb_build_object('id', r.id, 'style', r.style, 'wishes', r.wishes, 'floated', r.floated);
end $$;

create function public.loy_float(p_id text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare r public.loy_rooms;
begin
  select * into r from public.loy_rooms where id = p_id for update;
  if not found then return jsonb_build_object('status', 404, 'error', 'ไม่พบห้องนี้'); end if;
  if jsonb_array_length(r.wishes) = 0 then return jsonb_build_object('status', 400, 'error', 'เพิ่มคำอธิษฐานก่อนลอยกระทง'); end if;
  update public.loy_rooms set floated = true where id = p_id returning * into r;
  return jsonb_build_object('id', r.id, 'style', r.style, 'wishes', r.wishes, 'floated', r.floated);
end $$;

revoke all on function public.loy_create(text,text), public.loy_get(text), public.loy_wish(text,text,text), public.loy_float(text) from public, anon, authenticated;
grant execute on function public.loy_create(text,text), public.loy_get(text), public.loy_wish(text,text,text), public.loy_float(text) to service_role;

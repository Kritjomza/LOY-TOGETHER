-- Upgrade existing installations after supabase-setup.sql; existing room data is preserved.
create or replace function public.loy_view(r public.loy_rooms) returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('id',r.id,'style',r.style,'floated',r.floated,'wishes',coalesce((select jsonb_agg(x - 'token') from jsonb_array_elements(r.wishes) x), '[]'::jsonb));
$$;
create or replace function public.loy_create(p_id text, p_style text) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r public.loy_rooms; begin insert into public.loy_rooms(id,style) values(p_id,p_style) returning * into r; return public.loy_view(r); end $$;
create or replace function public.loy_get(p_id text) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r public.loy_rooms; begin select * into r from public.loy_rooms where id=p_id; if not found then return jsonb_build_object('status',404,'error','ไม่พบห้องนี้'); end if; return public.loy_view(r); end $$;
-- Remove old endpoints so a single caller cannot bypass the two-person confirmation.
drop function if exists public.loy_wish(text,text,text);
drop function if exists public.loy_float(text);
create or replace function public.loy_wish(p_id text,p_token text,p_name text,p_wish text) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r public.loy_rooms; idx integer;
begin
 if p_token !~ '^[a-f0-9]{64}$' or length(trim(p_name)) not between 1 and 30 or length(trim(p_wish)) not between 1 and 200 then return jsonb_build_object('status',400,'error','กรุณาใส่ชื่อและคำอธิษฐาน'); end if;
 select * into r from public.loy_rooms where id=p_id for update;
 if not found then return jsonb_build_object('status',404,'error','ไม่พบห้องนี้'); end if;
 if r.floated then return jsonb_build_object('status',409,'error','กระทงลอยไปแล้ว'); end if;
 select ordinality::integer-1 into idx from jsonb_array_elements(r.wishes) with ordinality as e(v,ordinality) where v->>'token'=p_token;
 if idx is null then
   if jsonb_array_length(r.wishes)>=2 then return jsonb_build_object('status',409,'error','ห้องนี้มีผู้เข้าร่วมครบสองคนแล้ว'); end if;
   r.wishes := r.wishes || jsonb_build_array(jsonb_build_object('token',p_token,'name',trim(p_name),'wish',trim(p_wish),'ready',false));
 else r.wishes := jsonb_set(r.wishes,array[idx::text],jsonb_build_object('token',p_token,'name',trim(p_name),'wish',trim(p_wish),'ready',false)); end if;
 update public.loy_rooms set wishes=r.wishes where id=p_id returning * into r; return public.loy_view(r);
end $$;
create or replace function public.loy_style(p_id text,p_token text,p_style text) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r public.loy_rooms;
begin
 select * into r from public.loy_rooms where id=p_id for update;
 if not found then return jsonb_build_object('status',404,'error','ไม่พบห้องนี้'); end if;
 if r.floated then return jsonb_build_object('status',409,'error','กระทงลอยไปแล้ว'); end if;
 if not exists(select 1 from jsonb_array_elements(r.wishes) x where x->>'token'=p_token) then return jsonb_build_object('status',403,'error','กรุณาใส่ชื่อและคำอธิษฐานก่อน'); end if;
 if p_style not in ('lotus','gold','orchid','jasmine') then return jsonb_build_object('status',400,'error','ไม่พบกระทงแบบนี้'); end if;
 select coalesce(jsonb_agg(jsonb_set(x,'{ready}','false'::jsonb)),'[]'::jsonb) into r.wishes from jsonb_array_elements(r.wishes) x;
 update public.loy_rooms set wishes=r.wishes,style=p_style where id=p_id returning * into r; return public.loy_view(r);
end $$;
create or replace function public.loy_float(p_id text,p_token text) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r public.loy_rooms; idx integer;
begin
 select * into r from public.loy_rooms where id=p_id for update;
 if not found then return jsonb_build_object('status',404,'error','ไม่พบห้องนี้'); end if;
 if r.floated then return jsonb_build_object('status',409,'error','กระทงลอยไปแล้ว'); end if;
 select ordinality::integer-1 into idx from jsonb_array_elements(r.wishes) with ordinality as e(v,ordinality) where v->>'token'=p_token;
 if idx is null then return jsonb_build_object('status',403,'error','กรุณาใส่ชื่อและคำอธิษฐานก่อน'); end if;
 if jsonb_array_length(r.wishes)<>2 then return jsonb_build_object('status',409,'error','รอให้เพื่อนเข้าร่วมก่อน'); end if;
 r.wishes := jsonb_set(r.wishes,array[idx::text,'ready'],'true'::jsonb);
 update public.loy_rooms set wishes=r.wishes,floated=not exists(select 1 from jsonb_array_elements(r.wishes) x where x->>'ready' is distinct from 'true') where id=p_id returning * into r; return public.loy_view(r);
end $$;
revoke all on function public.loy_view(public.loy_rooms),public.loy_wish(text,text,text,text),public.loy_float(text,text),public.loy_style(text,text,text) from public,anon,authenticated;
grant execute on function public.loy_view(public.loy_rooms),public.loy_wish(text,text,text,text),public.loy_float(text,text),public.loy_style(text,text,text) to service_role;

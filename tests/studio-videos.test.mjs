import { before, beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const admin = "11111111-1111-4111-8111-111111111111";
const outsider = "22222222-2222-4222-8222-222222222222";
const initialSelection = [{ videoId: "ZsS8bJw2i9k", title: "Um pouco do Studio Katielle Faleiros" }];
const selection = [
  { videoId: "abcdefghij1", title: "Conheça o studio" },
  { videoId: "abcdefghij2", title: "Técnica e cuidado" },
  { videoId: "abcdefghij3", title: "Nosso espaço" },
  { videoId: "abcdefghij4", title: "Movimento no dia a dia" },
];
const directory = new URL("../supabase/migrations/", import.meta.url);
let db, migration, initialState;
async function role(name, id = "") {
  await db.exec(`reset role; set role ${name}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
async function rpc(name, params = []) {
  const placeholders = params.map((_, i) => `$${i + 1}`).join(",");
  return (await db.query(`select public.${name}(${placeholders}) as data`, params)).rows[0].data;
}
const save = (videos = selection, version = 0) =>
  rpc("save_studio_videos", [JSON.stringify(videos), version]);

before(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;
    insert into auth.users values('${admin}'),('${outsider}');
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated;
    grant select,insert on storage.objects to anon,authenticated;
    create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;`);
  const files = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
  for (const file of files) await db.exec(await readFile(new URL(file, directory), "utf8"));
  initialState = await rpc("get_public_studio_videos");
  migration = await readFile(new URL("202611140010_studio_videos.sql", directory), "utf8");
  await db.query("delete from public.studio_admins where user_id=$1", [outsider]);
});
beforeEach(async () => {
  await db.exec("reset role");
  await db.query("update public.studio_videos set version=0,videos=$1::jsonb", [JSON.stringify(initialSelection)]);
  await role("authenticated", admin);
});
after(async () => { await db?.close(); });

test("seleção inicia com o vídeo indicado e leitura pública expõe somente a seleção", async () => {
  assert.deepEqual(initialState, { version: 0, videos: initialSelection });
  await role("anon");
  assert.deepEqual(await rpc("get_public_studio_videos"), { version: 0, videos: initialSelection });
  await assert.rejects(rpc("get_studio_videos"), { code: "42501" });
  await assert.rejects(save(), { code: "42501" });
  await assert.rejects(db.query("select * from public.studio_videos"), { code: "42501" });
});
test("usuário sem autorização pode ler a seleção pública, mas não administrar ou escrever diretamente", async () => {
  await role("authenticated", outsider);
  assert.deepEqual(await rpc("get_public_studio_videos"), { version: 0, videos: initialSelection });
  await assert.rejects(rpc("get_studio_videos"), { code: "42501" });
  await assert.rejects(save(), { code: "42501" });
  await assert.rejects(db.query("update public.studio_videos set videos='[]'::jsonb"), { code: "42501" });
});
test("administrador salva até quatro vídeos em ordem e pode removê-los; anônimo vê a atualização", async () => {
  const saved = await save();
  assert.deepEqual(saved, { version: 1, videos: selection });
  assert.deepEqual(await rpc("get_studio_videos"), saved);
  await assert.rejects(db.query("select * from public.studio_videos"), { code: "42501" });
  await role("anon");
  assert.deepEqual(await rpc("get_public_studio_videos"), saved);
  await role("authenticated", admin);
  assert.deepEqual(await save([], 1), { version: 2, videos: [] });
});
test("validação rejeita objetos arbitrários, links, títulos inválidos, duplicados e mais de quatro vídeos", async () => {
  const invalid = [null, {}, "texto", [null], [{}], [{ ...selection[0], private: "dados" }],
    [{ ...selection[0], title: "" }], [{ ...selection[0], title: "   " }],
    [{ ...selection[0], title: " título " }], [{ ...selection[0], title: "\nTítulo\t" }],
    [{ ...selection[0], title: "a".repeat(121) }],
    [{ ...selection[0], title: 123 }], [{ ...selection[0], videoId: "https://youtu.be/abcdefghij1" }],
    [{ ...selection[0], videoId: "abcdefghij1/" }], [{ ...selection[0], videoId: 123 }],
    [selection[0], selection[0]], [...selection, { videoId: "abcdefghij5", title: "Quinto" }]];
  for (const value of invalid) await assert.rejects(save(value), { code: "22023" });
  await assert.rejects(save(selection, null), { code: "22023" });
  await assert.rejects(save(selection, -1), { code: "22023" });
  assert.deepEqual(await rpc("get_studio_videos"), { version: 0, videos: initialSelection });
});
test("edição antiga e repetição não sobrescrevem a seleção publicada", async () => {
  await save();
  await assert.rejects(save([selection[1]], 0), { code: "22023" });
  await assert.rejects(save(selection, 0), { code: "22023" });
  assert.deepEqual(await rpc("get_studio_videos"), { version: 1, videos: selection });
  assert.deepEqual(await save([...selection].reverse(), 1), { version: 2, videos: [...selection].reverse() });
});
test("reaplicar migração preserva seleção, versão e permissões", async () => {
  await save();
  await db.exec("reset role");
  await db.exec(migration);
  await role("anon");
  assert.deepEqual(await rpc("get_public_studio_videos"), { version: 1, videos: selection });
  await assert.rejects(save(), { code: "42501" });
  await assert.rejects(db.query("select public.valid_studio_video_list('[]'::jsonb)"), { code: "42501" });
  await role("authenticated", admin);
  await save([], 1);
  await db.exec("reset role");
  await db.exec(migration);
  await role("anon");
  assert.deepEqual(await rpc("get_public_studio_videos"), { version: 2, videos: [] });
});

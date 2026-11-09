-- Migração de 09/11/2026 — aplicada no Supabase (projeto wotwmqxgmlwetjzrksrb)
-- com o nome "codigo_obrigatorio_formas_pagamento_colaboradores".
-- Só acrescenta coisas: nenhuma coluna ou dado antigo é apagado, para o
-- histórico de pedidos e caixas continuar aparecendo.

-- 1) Código obrigatório e único em todo produto -------------------------------
-- Quem ainda não tem código ganha um número de 4 dígitos (0001, 0002, ...),
-- seguindo a ordem do cardápio (categoria, depois ordem de cadastro), a
-- partir do maior código numérico que já existir.
with base as (
  select coalesce(max(codigo::int), 0) as ultimo
  from public.produtos
  where codigo ~ '^[0-9]{1,9}$'
),
sem_codigo as (
  select p.id,
         row_number() over (order by c.ordem, p.id) as n
  from public.produtos p
  join public.categorias c on c.id = p.categoria_id
  where p.codigo is null or btrim(p.codigo) = ''
)
update public.produtos p
set codigo = lpad((base.ultimo + s.n)::text, 4, '0')
from sem_codigo s, base
where p.id = s.id;

alter table public.produtos alter column codigo set not null;
alter table public.produtos
  add constraint produtos_codigo_nao_vazio check (btrim(codigo) <> '');
create unique index produtos_codigo_unico on public.produtos (codigo);

-- 2) Novas formas de pagamento ---------------------------------------------------
-- Sequência nova: Dinheiro, Pix maquineta, Cartão de crédito 1X, Cartão de
-- débito, Pix direto na conta. As formas antigas continuam aceitas no banco
-- só para o histórico (o sistema não oferece mais).
alter table public.pagamentos drop constraint pagamentos_forma_check;
alter table public.pagamentos add constraint pagamentos_forma_check check (
  forma = any (array[
    'dinheiro', 'pix_maquineta', 'credito', 'debito', 'pix_conta',
    'pix', 'vale_refeicao', 'vale_alimentacao', 'outros'
  ]::text[])
);

-- Fechamento de caixa com as 5 formas (valor_dinheiro já existia). As
-- colunas antigas (Stone, PagSeguro, Depósito) ficam para os caixas antigos.
alter table public.caixas
  add column valor_pix_maquineta numeric not null default 0,
  add column valor_credito numeric not null default 0,
  add column valor_debito numeric not null default 0,
  add column valor_pix_conta numeric not null default 0;

-- 3) Cadastro completo de colaboradores ----------------------------------------
-- Um colaborador pode ou não ter acesso ao sistema. Quando tem, perfil_id
-- aponta para o usuário de login (tabela perfis).
create table public.colaboradores (
  id bigint generated always as identity primary key,
  nome_completo text not null check (btrim(nome_completo) <> ''),
  cpf text check (cpf ~ '^[0-9]{11}$'),
  data_nascimento date,
  cep text check (cep ~ '^[0-9]{8}$'),
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text check (uf ~ '^[A-Z]{2}$'),
  foto_caminho text,
  funcoes text[] not null default '{}'::text[] check (
    funcoes <@ array['admin', 'gerente', 'caixa', 'cozinha', 'entregador']::text[]
  ),
  perfil_id uuid unique references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index colaboradores_cpf_unico
  on public.colaboradores (cpf) where cpf is not null;

-- Dados pessoais (CPF, endereço, nascimento): só conta master lê e altera.
alter table public.colaboradores enable row level security;

create policy colaboradores_select_master on public.colaboradores
  for select to authenticated using (private.is_master());
create policy colaboradores_insert_master on public.colaboradores
  for insert to authenticated with check (private.is_master());
create policy colaboradores_update_master on public.colaboradores
  for update to authenticated
  using (private.is_master()) with check (private.is_master());
create policy colaboradores_delete_master on public.colaboradores
  for delete to authenticated using (private.is_master());

-- Quem já tem login vira colaborador (o resto do cadastro é completado
-- depois pela tela de Colaboradores).
insert into public.colaboradores (nome_completo, funcoes, perfil_id)
select p.nome, array[p.papel], p.id
from public.perfis p
where p.papel <> 'pendente'
  and not exists (
    select 1 from public.colaboradores c where c.perfil_id = p.id
  );

-- 4) Fotos dos colaboradores: bucket PRIVADO, só master ---------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'colaboradores', 'colaboradores', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy colaboradores_fotos_master on storage.objects
  for all to authenticated
  using (bucket_id = 'colaboradores' and private.is_master())
  with check (bucket_id = 'colaboradores' and private.is_master());

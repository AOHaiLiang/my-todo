-- 1. 创建 todos 表
create table public.todos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  text       text not null,
  completed  boolean not null default false,
  priority   text not null default 'medium'
             check (priority in ('low', 'medium', 'high')),
  image_url  text,
  created_at timestamptz not null default now()
);

-- 如果表已存在，使用下面的语句添加字段：
-- alter table public.todos add column if not exists image_url text;

-- 2. 创建索引：按用户查询 + 按创建时间排序
create index idx_todos_user_id on public.todos(user_id);
create index idx_todos_created_at on public.todos(user_id, created_at desc);

-- 3. 启用 RLS
alter table public.todos enable row level security;

-- 4. RLS 策略：用户只能查看自己的 todos
create policy "Users can view their own todos"
  on public.todos for select
  using (auth.uid() = user_id);

-- 5. RLS 策略：登录用户可以创建自己的 todos
create policy "Users can insert their own todos"
  on public.todos for insert
  with check (auth.uid() = user_id);

-- 6. RLS 策略：用户只能更新自己的 todos
create policy "Users can update their own todos"
  on public.todos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 7. RLS 策略：用户只能删除自己的 todos
create policy "Users can delete their own todos"
  on public.todos for delete
  using (auth.uid() = user_id);

-- 8. Storage RLS 策略（bucket: my-todo，需先在 Dashboard 中创建）
-- 用户只能上传到自己 uid 目录下
create policy "Users can upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'my-todo'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 用户只能查看自己目录下的文件
create policy "Users can view own files"
  on storage.objects for select
  using (
    bucket_id = 'my-todo'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 用户只能删除自己目录下的文件
create policy "Users can delete own files"
  on storage.objects for delete
  using (
    bucket_id = 'my-todo'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
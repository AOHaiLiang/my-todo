"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Trash2,
  Check,
  ListTodo,
  Sparkles,
  Circle,
  CheckCircle2,
  Star,
  Clock,
  Flame,
  Filter,
  X,
  LogIn,
  UserPlus,
  LogOut,
  Loader2,
  ImagePlus,
  Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type Priority = "low" | "medium" | "high";
type FilterType = "all" | "active" | "completed";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  image_url: string | null;
  created_at: string;
}

const priorityConfig: Record<
  Priority,
  { icon: typeof Star; label: string; color: string; bg: string; ring: string }
> = {
  low: {
    icon: Clock,
    label: "低",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/30",
  },
  medium: {
    icon: Star,
    label: "中",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/30",
  },
  high: {
    icon: Flame,
    label: "高",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    ring: "ring-rose-500/30",
  },
};

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [filter, setFilter] = useState<FilterType>("all");
  const [removing, setRemoving] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const fetchTodos = async () => {
    const { data, error: fetchError } = await supabase
      .from("todos")
      .select("id, text, completed, priority, image_url, created_at")
      .order("created_at", { ascending: false });
    if (fetchError) {
      setError(`加载失败: ${fetchError.message}`);
    } else if (data) {
      setTodos(data as Todo[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) fetchTodos();
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) fetchTodos();
      else { setTodos([]); setLoading(false); }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addTodo = async () => {
    const trimmed = input.trim();
    if (!trimmed || !user) return;
    setInput("");
    setError(null);
    setUploading(true);

    let imageUrl: string | null = null;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("my-todo")
        .upload(filePath, imageFile);

      if (uploadError) {
        setError(`图片上传失败: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("my-todo")
        .getPublicUrl(filePath);
      imageUrl = urlData.publicUrl;
    }

    const { data, error: insertError } = await supabase
      .from("todos")
      .insert({ text: trimmed, priority, user_id: user.id, image_url: imageUrl })
      .select("id, text, completed, priority, image_url, created_at")
      .single();

    if (insertError) {
      setError(`添加失败: ${insertError.message}`);
    } else if (data) {
      setTodos((prev) => [data as Todo, ...prev]);
    }

    clearImage();
    setUploading(false);
    inputRef.current?.focus();
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );

    const { error } = await supabase
      .from("todos")
      .update({ completed: !todo.completed })
      .eq("id", id);

    if (error) setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: todo.completed } : t))
    );
  };

  const extractStoragePath = (url: string): string | null => {
    const marker = "/object/public/my-todo/";
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length);
  };

  const removeTodo = async (id: string) => {
    setRemoving(id);
    const todo = todos.find((t) => t.id === id);

    if (todo?.image_url) {
      const path = extractStoragePath(todo.image_url);
      if (path) await supabase.storage.from("my-todo").remove([path]);
    }

    const { error } = await supabase.from("todos").delete().eq("id", id);

    setTimeout(() => {
      if (!error) setTodos((prev) => prev.filter((t) => t.id !== id));
      setRemoving(null);
    }, 300);
  };

  const clearCompleted = async () => {
    const completed = todos.filter((t) => t.completed);
    if (completed.length === 0) return;

    const storagePaths = completed
      .map((t) => t.image_url ? extractStoragePath(t.image_url) : null)
      .filter((p): p is string => p !== null);
    if (storagePaths.length > 0) {
      await supabase.storage.from("my-todo").remove(storagePaths);
    }

    setTodos((prev) => prev.filter((t) => !t.completed));
    const { error } = await supabase
      .from("todos")
      .delete()
      .in("id", completed.map((t) => t.id));

    if (error) fetchTodos();
  };

  const filteredTodos = todos.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  const completedCount = todos.filter((t) => t.completed).length;
  const progress = todos.length > 0 ? (completedCount / todos.length) * 100 : 0;

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Animated background orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" />
        <div className="absolute -right-40 bottom-20 h-[400px] w-[400px] rounded-full bg-blue-600/20 blur-[120px] animate-pulse [animation-delay:2s]" />
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-600/10 blur-[100px] animate-pulse [animation-delay:4s]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col items-center px-4 py-8 sm:py-14">
        {/* Header */}
        <div className="mb-8 flex w-full flex-col items-center gap-5 text-center">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-3 shadow-lg shadow-purple-500/25">
              <ListTodo className="h-7 w-7 text-white" />
            </div>
            <h1 className="bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
              待办清单
            </h1>
          </div>
          <p className="flex items-center gap-1.5 text-sm text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            高效管理每一天，从一件小事开始
          </p>

          {/* Auth buttons */}
          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  setUser(null);
                  setTodos([]);
                }}
                className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-300 backdrop-blur-sm transition-all hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400"
              >
                <LogOut className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                退出登录
              </button>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-300 backdrop-blur-sm transition-all hover:border-purple-500/30 hover:bg-white/10 hover:text-white"
                >
                  <LogIn className="h-4 w-4 text-purple-400 transition-transform group-hover:-translate-x-0.5" />
                  登录
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-purple-600/25 transition-all hover:shadow-xl hover:shadow-purple-600/30 hover:brightness-110"
                >
                  <UserPlus className="h-4 w-4 transition-transform group-hover:scale-110" />
                  注册
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {todos.length > 0 && (
          <div className="mb-8 w-full">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span>
                已完成 {completedCount} / {todos.length} 项
              </span>
              <span className="font-mono">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/5 backdrop-blur-sm">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Input card */}
        {user ? (
          <div className="mb-6 w-full rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-purple-900/20 backdrop-blur-xl">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTodo()}
                placeholder="输入新的待办事项..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-purple-500/50 focus:bg-white/10 focus:ring-2 focus:ring-purple-500/20"
              />
              <button
                onClick={addTodo}
                disabled={!input.trim() || uploading}
                className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-purple-600/25 transition-all hover:shadow-xl hover:shadow-purple-600/30 hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:shadow-none disabled:hover:brightness-100"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                )}
                <span className="hidden sm:inline">{uploading ? "上传中" : "添加"}</span>
              </button>
            </div>

            {/* Priority selector + image upload */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">优先级：</span>
                {(Object.keys(priorityConfig) as Priority[]).map((p) => {
                  const config = priorityConfig[p];
                  const Icon = config.icon;
                  return (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition-all ${
                        priority === p
                          ? `${config.bg} ${config.color} ${config.ring} scale-105`
                          : "text-slate-500 ring-transparent hover:text-slate-300 hover:ring-white/10"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </button>
                  );
                })}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    imageFile
                      ? "bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/30"
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  {imageFile ? "已选图片" : "添加图片"}
                </button>
              </div>
            </div>

            {/* Image preview */}
            {imagePreview && (
              <div className="mt-3 relative inline-block">
                <img
                  src={imagePreview}
                  alt="预览"
                  className="h-20 w-auto rounded-lg border border-white/10 object-cover"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-slate-800 p-0.5 text-slate-400 transition-colors hover:bg-rose-500/20 hover:text-rose-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-2 shrink-0 hover:text-rose-300">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-6 w-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center backdrop-blur-xl">
            <p className="text-sm text-slate-400">
              请先{" "}
              <Link href="/auth/login" className="text-purple-400 underline underline-offset-4 hover:text-purple-300">
                登录
              </Link>{" "}
              后添加待办事项
            </p>
          </div>
        )}

        {/* Filter tabs */}
        <div className="mb-5 flex w-full items-center justify-between">
          <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1 backdrop-blur-sm">
            {(["all", "active", "completed"] as FilterType[]).map((f) => {
              const labelMap = { all: "全部", active: "进行中", completed: "已完成" };
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                    filter === f
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {f === "all" && <Filter className="h-3 w-3" />}
                  {labelMap[f]}
                  {f === "all" && (
                    <span className="ml-0.5 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px]">
                      {todos.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {completedCount > 0 && (
            <button
              onClick={clearCompleted}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-slate-500 transition-all hover:bg-rose-500/10 hover:text-rose-400"
            >
              <X className="h-3 w-3" />
              清除已完成
            </button>
          )}
        </div>

        {/* Todo list */}
        <div className="w-full space-y-2">
          {loading && user ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Loader2 className="mb-3 h-8 w-8 animate-spin opacity-50" />
              <p className="text-sm">加载中...</p>
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-600">
              <ListTodo className="mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm">
                {filter === "all"
                  ? "还没有任务，在上方添加一个吧！"
                  : filter === "active"
                    ? "没有进行中的任务，干得漂亮！"
                    : "还没有已完成的任务。"}
              </p>
            </div>
          ) : null}

          {filteredTodos.map((todo) => {
            const config = priorityConfig[todo.priority];
            const Icon = config.icon;
            return (
              <div
                key={todo.id}
                className={`group rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5 backdrop-blur-sm transition-all duration-300 hover:border-white/10 hover:bg-white/[0.06] ${
                  removing === todo.id
                    ? "translate-x-8 scale-95 opacity-0"
                    : ""
                } ${todo.completed ? "opacity-60" : ""}`}
              >
                <div className="flex items-center gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className="shrink-0 transition-transform active:scale-90"
                  >
                    {todo.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-purple-400" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-600 transition-colors hover:text-purple-400" />
                    )}
                  </button>

                  {/* Text */}
                  <span
                    className={`flex-1 text-sm transition-all ${
                      todo.completed
                        ? "text-slate-500 line-through decoration-slate-600"
                        : "text-slate-200"
                    }`}
                  >
                    {todo.text}
                  </span>

                  {/* Image indicator */}
                  {todo.image_url && (
                    <ImageIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  )}

                  {/* Priority badge */}
                  <span
                    className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ${config.bg} ${config.color} ${config.ring}`}
                  >
                    <Icon className="h-2.5 w-2.5" />
                    {config.label}
                  </span>

                  {/* Delete */}
                  <button
                    onClick={() => removeTodo(todo.id)}
                    className="shrink-0 rounded-lg p-1.5 text-slate-700 opacity-0 transition-all hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Attached image */}
                {todo.image_url && (
                  <div className="mt-2.5 ml-8">
                    <a href={todo.image_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={todo.image_url}
                        alt="附件"
                        className="h-24 w-auto rounded-lg border border-white/10 object-cover transition-opacity hover:opacity-80"
                      />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer stats */}
        {todos.length > 0 && (
          <div className="mt-8 flex items-center gap-4 text-[11px] text-slate-600">
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3" />
              {completedCount} 已完成
            </span>
            <span className="h-3 w-px bg-slate-800" />
            <span>剩余 {todos.length - completedCount} 项</span>
          </div>
        )}
      </div>
    </main>
  );
}

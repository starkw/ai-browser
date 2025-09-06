import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

async function createNote(formData: FormData) {
  "use server";
  const title = String(formData.get("title") ?? "").trim();
  const contentRaw = formData.get("content");
  const content = contentRaw ? String(contentRaw).trim() : null;

  if (!title) {
    return;
  }

  await prisma.note.create({
    data: { title, content },
  });

  revalidatePath("/tabs");
}

export default async function TabsPage() {
  const notes = await prisma.note.findMany({ orderBy: { id: "desc" } });

  return (
    <div className="max-w-2xl w-full mx-auto py-10 space-y-8">
      <h1 className="text-2xl font-semibold">Notes</h1>

      <form action={createNote} className="space-y-3">
        <input
          className="w-full border rounded px-3 py-2"
          name="title"
          placeholder="Title"
          required
        />
        <textarea
          className="w-full border rounded px-3 py-2 min-h-24"
          name="content"
          placeholder="Content (optional)"
        />
        <button
          type="submit"
          className="rounded bg-foreground text-background px-4 py-2"
        >
          Create
        </button>
      </form>

      <ul className="space-y-4">
        {notes.map((n) => (
          <li key={n.id} className="border rounded p-4">
            <div className="font-medium">{n.title}</div>
            {n.content ? (
              <div className="text-sm opacity-80 whitespace-pre-wrap">{n.content}</div>
            ) : null}
            <div className="text-xs opacity-60 mt-1">
              #{n.id} · {new Date(n.createdAt).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}


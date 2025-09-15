import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UP_DIR = path.join(process.cwd(), ".uploads");

function ensureDir() {
  if (!fs.existsSync(UP_DIR)) fs.mkdirSync(UP_DIR, { recursive: true });
}

async function parseBuffer(filePath: string, mime: string, origName: string): Promise<string> {
  try {
    const ext = path.extname(origName).toLowerCase();
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const buf = await fs.promises.readFile(filePath);
    if (mime.includes("pdf") || ext === ".pdf") {
      // 动态导入 pdf-parse 避免构建时问题
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buf);
      return data.text || "";
    }
  if (ext === ".pptx") {
    // 简化：对 PPTX 作为 zip 二进制不做深入解析，返回占位提示
    return "(PPTX 暂不支持内容提取，后续将完善)";
  }
  if (ext === ".txt" || ext === ".md") {
    return buf.toString("utf-8");
  }
  if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const res = await mammoth.extractRawText({ buffer: buf });
    return res.value || "";
  }
  if (ext === ".xlsx" || ext === ".xls") {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buf, { type: "buffer" });
    const texts: string[] = [];
    wb.SheetNames.forEach((name) => {
      const ws = wb.Sheets[name];
      if (ws) texts.push(XLSX.utils.sheet_to_csv(ws));
    });
    return texts.join("\n\n");
  }
  // 图片：OCR（暂时降级为未启用，避免在 Render 编译原生依赖失败）
  if (mime.startsWith("image/") || [".png", ".jpg", ".jpeg", ".webp", ".bmp"].includes(ext)) {
    // 如果未来需要，可改为调用云 OCR 或在独立服务启用 tesseract/sharp
    return "";
  }
    // 兜底：存为二进制，不解析
    return "";
  } catch (error) {
    console.error("Parse error:", error);
    return "";
  }
}

export async function GET() {
  return NextResponse.json({ message: "Upload endpoint ready" });
}

export async function POST(req: Request) {
  try {
    ensureDir();
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = path.join(UP_DIR, safeName);
    await fs.promises.writeFile(filePath, buffer);

    const text = await parseBuffer(filePath, file.type || "", file.name);
    return NextResponse.json({ id: safeName, name: file.name, size: file.size, mime: file.type, text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


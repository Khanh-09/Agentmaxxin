import { indexUploadedDocument } from "@/agent/knowledge";

// POST /api/upload -> Receives text, markdown, or JSON file content and indexes into RAG
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const textOverride = formData.get("text") as string | null;
    const filenameOverride = formData.get("filename") as string | null;

    let filename = filenameOverride || "document.txt";
    let content = "";

    if (file) {
      filename = file.name;
      content = await file.text();
    } else if (textOverride) {
      content = textOverride;
    } else {
      return Response.json({ error: "No file or text provided." }, { status: 400 });
    }

    if (!content.trim()) {
      return Response.json({ error: "File content is empty." }, { status: 400 });
    }

    const result = indexUploadedDocument(filename, content);
    return Response.json({
      success: true,
      filename: result.filename,
      chunksCount: result.chunksCount,
      message: `Đã nạp và phân đoạn thành công tài liệu '${result.filename}' (${result.chunksCount} đoạn tri thức).`,
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

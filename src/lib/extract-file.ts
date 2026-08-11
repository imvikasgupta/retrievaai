import type { PageText } from "@/lib/rag";
import { cleanText, fileExtension } from "@/lib/rag";

/**
 * Browser-side text extraction. Runs before upload so raw files never need to
 * be stored, and the server only ever receives clean text.
 */
export async function extractPages(file: File): Promise<PageText[]> {
  const extension = fileExtension(file.name);

  if (extension === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    const pages: PageText[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      const cleaned = cleanText(text);
      if (cleaned) pages.push({ page: pageNumber, text: cleaned });
    }

    if (pages.length === 0) {
      throw new Error("This PDF has no selectable text. Scanned documents aren't supported yet.");
    }
    return pages;
  }

  if (extension === "docx") {
    const mammoth = await import("mammoth/mammoth.browser");
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    const cleaned = cleanText(result.value);
    if (!cleaned) throw new Error("We couldn't read any text from this document.");
    return [{ page: 1, text: cleaned }];
  }

  const text = cleanText(await file.text());
  if (!text) throw new Error("This file appears to be empty.");
  return [{ page: 1, text }];
}

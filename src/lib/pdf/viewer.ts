/** Thin pdf.js wrapper: open bytes, render a page to a canvas, pull text. */
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export type { PDFDocumentProxy };

export async function openPdf(bytes: Uint8Array): Promise<PDFDocumentProxy> {
	// pdf.js takes ownership of the buffer; hand it a copy.
	return pdfjs.getDocument({ data: bytes.slice(0) }).promise;
}

/** Renders page `n` (1-based) into `canvas` at `scale` CSS px per PDF pt, honouring devicePixelRatio. */
export async function renderPage(
	pdf: PDFDocumentProxy,
	n: number,
	canvas: HTMLCanvasElement,
	scale: number
) {
	const page = await pdf.getPage(n);
	const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
	const viewport = page.getViewport({ scale: scale * dpr });
	canvas.width = Math.floor(viewport.width);
	canvas.height = Math.floor(viewport.height);
	canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
	canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
	const ctx = canvas.getContext('2d');
	if (!ctx) return;
	await page.render({ canvas, canvasContext: ctx, viewport }).promise;
	page.cleanup();
}

/** Release a document's worker resources. */
export function closePdf(pdf: PDFDocumentProxy): Promise<void> {
	return pdf.loadingTask.destroy();
}

/** Width of page 1 in PDF points, for fit-to-width. */
export async function pageWidth(pdf: PDFDocumentProxy): Promise<number> {
	const page = await pdf.getPage(1);
	return page.getViewport({ scale: 1 }).width;
}

/** Text per page, in reading order as the parser sees it. */
export async function extractText(pdf: PDFDocumentProxy): Promise<string[]> {
	const pages: string[] = [];
	for (let n = 1; n <= pdf.numPages; n++) {
		const page = await pdf.getPage(n);
		const content = await page.getTextContent();
		let out = '';
		for (const item of content.items) {
			if (!('str' in item)) continue;
			out += item.str;
			if (item.hasEOL) out += '\n';
		}
		pages.push(out);
	}
	return pages;
}

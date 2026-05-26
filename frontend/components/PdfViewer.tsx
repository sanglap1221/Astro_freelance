type PdfViewerProps = {
  pdfUrl: string;
};

export function PdfViewer({ pdfUrl }: PdfViewerProps) {
  return <iframe src={pdfUrl} className="h-[80vh] w-full border" title="PDF preview" />;
}
type PdfViewerProps = {
  pdfUrl: string;
};

export function PdfViewer({ pdfUrl }: PdfViewerProps) {
  return <iframe src={pdfUrl} className="w-full h-[320mm] border-0" title="PDF preview" />;
}
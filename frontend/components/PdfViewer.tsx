type PdfViewerProps = {
  pdfUrl: string;
};

export function PdfViewer({ pdfUrl }: PdfViewerProps) {
  return <iframe src={pdfUrl} className="w-full h-[460mm] border-0" title="PDF preview" />;
} 
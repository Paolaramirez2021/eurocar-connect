/**
 * Genera PDF directamente en el navegador usando html2pdf.js
 * No requiere backend - funciona siempre.
 */
import html2pdf from 'html2pdf.js';

export async function generatePdfFromHtml(htmlString: string): Promise<Blob> {
  // Crear un contenedor temporal invisible
  const container = document.createElement('div');
  container.innerHTML = htmlString;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '210mm'; // A4 width
  document.body.appendChild(container);

  try {
    const opt = {
      margin: [10, 10, 10, 10],
      filename: 'contrato.pdf',
      image: { type: 'jpeg', quality: 0.85 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false,
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'letter', 
        orientation: 'portrait' 
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    const pdfBlob: Blob = await html2pdf().set(opt).from(container).outputPdf('blob');
    return pdfBlob;
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Genera PDF y retorna como base64 string
 */
export async function generatePdfBase64(htmlString: string): Promise<string> {
  const blob = await generatePdfFromHtml(htmlString);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

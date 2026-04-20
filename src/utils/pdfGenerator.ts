/**
 * Genera PDF desde HTML. 
 * Intenta backend primero, si falla usa generación local en navegador.
 */
import html2pdf from 'html2pdf.js';

const BACKEND_URL = import.meta.env.VITE_API_URL || '';

/**
 * Intenta generar PDF via backend (Puppeteer). Si falla, genera localmente.
 */
export async function generatePdfFromHtml(htmlString: string): Promise<Blob> {
  // Intentar backend primero (mejor calidad)
  try {
    const backendBlob = await generateViaBackend(htmlString);
    if (backendBlob && backendBlob.size > 500) {
      console.log('[PDF] Generado via backend, tamaño:', backendBlob.size);
      return backendBlob;
    }
  } catch (err) {
    console.warn('[PDF] Backend falló, usando generación local:', err);
  }

  // Fallback: generar localmente en el navegador
  console.log('[PDF] Generando localmente con html2pdf.js');
  return generateLocally(htmlString);
}

async function generateViaBackend(htmlString: string): Promise<Blob> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const urls = [
      `${BACKEND_URL}/srv/generate-pdf`,
      `${BACKEND_URL}/api/generate-pdf`,
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html: htmlString,
            options: {
              format: 'Letter',
              printBackground: true,
              margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
            }
          }),
          signal: controller.signal
        });

        if (!response.ok) continue;

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('json')) continue;

        const result = await response.json();
        if (!result.pdf_base64) continue;

        const byteCharacters = atob(result.pdf_base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        return new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
      } catch (e) {
        continue;
      }
    }
    throw new Error('Backend no disponible');
  } finally {
    clearTimeout(timeout);
  }
}

async function generateLocally(htmlString: string): Promise<Blob> {
  // Crear iframe oculto para renderizar el HTML correctamente
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '0';
  iframe.style.top = '0';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-1';
  document.body.appendChild(iframe);

  try {
    // Escribir HTML completo al iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error('No se pudo crear iframe para PDF');
    
    iframeDoc.open();
    iframeDoc.write(htmlString);
    iframeDoc.close();

    // Esperar a que el contenido se renderice
    await new Promise(resolve => setTimeout(resolve, 1000));

    const body = iframeDoc.body;
    if (!body || !body.innerHTML.trim()) {
      throw new Error('El contenido HTML está vacío');
    }

    const opt = {
      margin: [5, 5, 5, 5],
      image: { type: 'jpeg', quality: 0.92 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false,
        width: body.scrollWidth,
        height: body.scrollHeight,
        windowWidth: body.scrollWidth,
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'letter', 
        orientation: 'portrait' as const
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    const pdfBlob: Blob = await html2pdf().set(opt).from(body).outputPdf('blob');
    console.log('[PDF] Generado localmente, tamaño:', pdfBlob.size);
    return pdfBlob;
  } finally {
    document.body.removeChild(iframe);
  }
}

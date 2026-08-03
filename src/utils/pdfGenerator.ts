/**
 * Genera PDF desde HTML directamente en el navegador.
 * Usa html2pdf.js con iframe visible para renderizado correcto.
 */
import html2pdf from 'html2pdf.js';

export async function generatePdfFromHtml(htmlString: string): Promise<Blob> {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '0';
  iframe.style.top = '0';
  iframe.style.width = '816px';
  iframe.style.height = '1200px';
  iframe.style.opacity = '0.01';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '99999';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error('No se pudo acceder al iframe');

    iframeDoc.open();
    iframeDoc.write(htmlString);
    iframeDoc.close();

    // Esperar renderizado e imágenes
    await new Promise<void>((resolve) => {
      const imgs = iframeDoc.querySelectorAll('img');
      if (imgs.length === 0) {
        setTimeout(resolve, 1000);
        return;
      }
      let loaded = 0;
      const total = imgs.length;
      const checkDone = () => { if (++loaded >= total) setTimeout(resolve, 800); };
      imgs.forEach(img => {
        if (img.complete) checkDone();
        else {
          img.onload = checkDone;
          img.onerror = checkDone;
        }
      });
      setTimeout(resolve, 6000);
    });

    const body = iframeDoc.body;
    if (!body || body.scrollHeight < 50) {
      throw new Error('Contenido HTML no se renderizó correctamente');
    }

    const pdfBlob: Blob = await html2pdf()
      .set({
        margin: [8, 6, 8, 6],
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          letterRendering: true,
          logging: false,
          width: 816,
          windowWidth: 816,
        },
        jsPDF: {
          unit: 'mm',
          format: 'letter',
          orientation: 'portrait',
        },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.section-title'] }
      })
      .from(body)
      .outputPdf('blob');

    console.log('[PDF Local] Generado, tamaño:', pdfBlob.size);
    return pdfBlob;
  } finally {
    document.body.removeChild(iframe);
  }
}

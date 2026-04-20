/**
 * Genera PDF desde HTML directamente en el navegador.
 * Usa html2pdf.js con iframe para renderizado completo.
 * NO requiere backend externo.
 */
import html2pdf from 'html2pdf.js';

export async function generatePdfFromHtml(htmlString: string): Promise<Blob> {
  // Crear iframe para renderizar el HTML en tamaño real
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '0';
  iframe.style.top = '0';
  iframe.style.width = '816px';  // Letter width at 96dpi
  iframe.style.height = '1056px'; // Letter height at 96dpi  
  iframe.style.opacity = '0.01'; // Casi invisible pero renderiza contenido
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '99999';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error('No se pudo acceder al iframe');

    // Escribir el HTML completo del contrato (ya tiene <!DOCTYPE>, <style>, etc.)
    iframeDoc.open();
    iframeDoc.write(htmlString);
    iframeDoc.close();

    // Esperar a que imágenes y fuentes carguen
    await new Promise<void>((resolve) => {
      const imgs = iframeDoc.querySelectorAll('img');
      if (imgs.length === 0) {
        setTimeout(resolve, 800);
        return;
      }
      let loaded = 0;
      const total = imgs.length;
      const checkDone = () => { if (++loaded >= total) setTimeout(resolve, 500); };
      imgs.forEach(img => {
        if (img.complete) checkDone();
        else {
          img.onload = checkDone;
          img.onerror = checkDone;
        }
      });
      setTimeout(resolve, 8000); // Safety timeout
    });

    const body = iframeDoc.body;
    if (!body || body.scrollHeight < 50) {
      throw new Error('Contenido HTML no se renderizó correctamente');
    }

    const pdfBlob: Blob = await html2pdf()
      .set({
        margin: [2, 2, 2, 2],
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
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.section', '.section-title'] }
      })
      .from(body)
      .outputPdf('blob');

    console.log('[PDF] Generado localmente, tamaño:', pdfBlob.size);
    return pdfBlob;
  } finally {
    document.body.removeChild(iframe);
  }
}

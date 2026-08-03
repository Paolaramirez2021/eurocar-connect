/**
 * Genera PDF desde HTML directamente en el navegador.
 * Usa html2pdf.js — fallback cuando Railway no está disponible.
 */
import html2pdf from 'html2pdf.js';

export async function generatePdfFromHtml(htmlString: string): Promise<Blob> {
  // Crear un contenedor oculto en el DOM (NO iframe, para mejor compatibilidad con html2canvas)
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // Letter width en px a 96dpi (8.27in)
  container.style.background = 'white';
  container.style.zIndex = '-1';

  // Extraer solo el contenido del body del HTML (html2pdf necesita el contenido, no el document completo)
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Copiar los estilos del template al contenedor
  const styles = doc.querySelectorAll('style');
  styles.forEach(style => {
    const cloned = style.cloneNode(true) as HTMLStyleElement;
    container.appendChild(cloned);
  });

  // Agregar override de estilos para mejorar rendering con html2canvas
  const overrideStyle = document.createElement('style');
  overrideStyle.textContent = `
    * { box-sizing: border-box !important; }
    body, div { max-width: 100% !important; }
    .two-col td { display: table-cell !important; width: 50% !important; vertical-align: top !important; }
    .sig-box { display: inline-block !important; width: 45% !important; vertical-align: top !important; }
    .sig-line { display: block !important; height: 80px !important; border-bottom: 2px solid #333 !important; position: relative !important; }
    .sig-line img { position: absolute !important; bottom: 5px !important; left: 50% !important; transform: translateX(-50%) !important; }
    .verification-grid { display: block !important; text-align: center !important; }
    .verification-item { display: inline-block !important; width: 150px !important; vertical-align: top !important; margin: 5px !important; }
    .label { display: inline-block !important; width: 130px !important; font-weight: bold !important; }
    .value { display: inline-block !important; min-width: 150px !important; }
    table { width: 100% !important; table-layout: fixed !important; }
    img { max-width: 100% !important; }
  `;
  container.appendChild(overrideStyle);

  // Copiar el contenido del body
  const bodyContent = doc.body;
  if (bodyContent) {
    container.innerHTML += bodyContent.innerHTML;
  }

  document.body.appendChild(container);

  try {
    // Esperar a que imágenes carguen
    await new Promise<void>((resolve) => {
      const imgs = container.querySelectorAll('img');
      if (imgs.length === 0) {
        setTimeout(resolve, 500);
        return;
      }
      let loaded = 0;
      const total = imgs.length;
      const checkDone = () => { if (++loaded >= total) setTimeout(resolve, 300); };
      imgs.forEach(img => {
        if (img.complete) checkDone();
        else {
          img.onload = checkDone;
          img.onerror = checkDone;
        }
      });
      setTimeout(resolve, 5000);
    });

    const pdfBlob: Blob = await html2pdf()
      .set({
        margin: [10, 8, 10, 8], // mm: top, left, bottom, right
        filename: 'contrato.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          letterRendering: true,
          logging: false,
          width: 794,
          windowWidth: 794,
          scrollY: 0,
          scrollX: 0,
        },
        jsPDF: {
          unit: 'mm',
          format: 'letter',
          orientation: 'portrait',
        },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.section-title'] }
      })
      .from(container)
      .outputPdf('blob');

    console.log('[PDF Local] Generado, tamaño:', pdfBlob.size);
    return pdfBlob;
  } finally {
    document.body.removeChild(container);
  }
}

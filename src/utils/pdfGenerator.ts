/**
 * Genera PDF desde HTML directamente en el navegador.
 * Renderiza en un div visible (fuera de pantalla) para que html2canvas funcione.
 */
import html2pdf from 'html2pdf.js';

export async function generatePdfFromHtml(htmlString: string): Promise<Blob> {
  // Extraer body content y styles del HTML completo
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  
  // Crear wrapper visible pero fuera de vista
  const wrapper = document.createElement('div');
  wrapper.id = 'pdf-render-wrapper';
  wrapper.style.cssText = 'position:fixed; top:0; left:0; width:816px; z-index:99999; background:white; overflow:hidden;';
  
  // Copiar estilos del HTML del contrato
  const styles = doc.querySelectorAll('style');
  styles.forEach(s => wrapper.appendChild(s.cloneNode(true)));
  
  // Copiar el contenido del body
  const content = document.createElement('div');
  content.innerHTML = doc.body.innerHTML;
  // Aplicar estilos inline del body del template
  content.style.cssText = 'font-family:Arial,sans-serif; font-size:11px; line-height:1.4; color:#333; padding:15mm; max-width:215.9mm; box-sizing:border-box;';
  wrapper.appendChild(content);
  
  document.body.appendChild(wrapper);

  try {
    // Esperar imágenes
    await new Promise<void>((resolve) => {
      const imgs = wrapper.querySelectorAll('img');
      if (imgs.length === 0) { setTimeout(resolve, 800); return; }
      let loaded = 0;
      const check = () => { if (++loaded >= imgs.length) setTimeout(resolve, 500); };
      imgs.forEach(img => {
        if (img.complete) check();
        else { img.onload = check; img.onerror = check; }
      });
      setTimeout(resolve, 5000);
    });

    const pdfBlob: Blob = await html2pdf()
      .set({
        margin: [2, 2, 2, 2],
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          windowWidth: 816,
        },
        jsPDF: {
          unit: 'mm',
          format: 'letter',
          orientation: 'portrait',
        },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.section-title'] }
      })
      .from(content)
      .outputPdf('blob');

    console.log('[PDF Local] Generado, tamaño:', pdfBlob.size);
    return pdfBlob;
  } finally {
    document.body.removeChild(wrapper);
  }
}

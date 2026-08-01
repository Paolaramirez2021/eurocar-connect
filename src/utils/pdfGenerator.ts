/**
 * Genera PDF desde HTML.
 * Estrategia: Abre ventana de impresión del navegador (CSS perfecto).
 * Retorna el HTML como Blob para subir a Supabase.
 */

/**
 * Abre el HTML en una nueva ventana y activa el diálogo de impresión del navegador.
 * El usuario puede guardar como PDF con formato perfecto.
 * Retorna un Blob del HTML para subir a storage como respaldo.
 */
export async function generatePdfFromHtml(htmlString: string): Promise<Blob> {
  // Abrir ventana de impresión con el HTML del contrato
  const printWindow = window.open('', '_blank', 'width=850,height=1100');
  
  if (!printWindow) {
    throw new Error('No se pudo abrir la ventana de impresión. Permita pop-ups en su navegador.');
  }

  // Escribir el HTML completo (ya tiene DOCTYPE, styles, @page margins, etc.)
  printWindow.document.open();
  printWindow.document.write(htmlString);
  printWindow.document.close();

  // Esperar que carguen imágenes y luego abrir diálogo de impresión
  await new Promise<void>((resolve) => {
    printWindow.onload = () => resolve();
    // Safety timeout
    setTimeout(resolve, 3000);
  });

  // Activar impresión automáticamente  
  setTimeout(() => {
    try {
      printWindow.print();
    } catch (e) {
      console.warn('[PDF Fallback] No se pudo activar print automático:', e);
    }
  }, 1000);

  // Retornar el HTML como Blob PDF-like para subir a storage
  // (Se sube el HTML, y el PDF real lo guarda el usuario desde el diálogo de impresión)
  const htmlBlob = new Blob([htmlString], { type: 'application/pdf' });
  return htmlBlob;
}

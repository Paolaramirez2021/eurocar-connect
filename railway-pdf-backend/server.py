"""
Backend PDF Generator para Eurocar Rental
Deploy en Railway - Solo genera PDFs con Puppeteer
VERSIÓN 2: Usa stdin para pasar HTML (sin límite de tamaño)
"""
import os
import asyncio
import logging
import json
import base64
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Eurocar PDF Generator", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GeneratePDFRequest(BaseModel):
    html: str
    options: Optional[Dict[str, Any]] = None

@app.get("/")
async def root():
    return {"status": "ok", "service": "Eurocar PDF Generator v2"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/generate-pdf")
async def generate_pdf(request: GeneratePDFRequest):
    try:
        logger.info(f"Generando PDF... HTML length: {len(request.html)}")

        # Script Node.js que lee HTML de stdin (sin límite de tamaño de argumento)
        js_code = """
const puppeteer = require('puppeteer');

let inputData = '';
process.stdin.on('data', chunk => { inputData += chunk; });
process.stdin.on('end', async () => {
    try {
        const payload = JSON.parse(inputData);
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process']
        });
        const page = await browser.newPage();
        await page.setContent(payload.html, { waitUntil: ['networkidle0', 'domcontentloaded'] });
        await new Promise(r => setTimeout(r, 500));
        const opts = payload.options || {};
        const pdfBuffer = await page.pdf({
            format: opts.format || 'Letter',
            printBackground: true,
            margin: opts.margin || { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
        });
        process.stdout.write(pdfBuffer);
        await browser.close();
    } catch (err) {
        process.stderr.write(err.message || 'Puppeteer error');
        process.exit(1);
    }
});
"""
        options_dict = request.options or {}
        stdin_payload = json.dumps({"html": request.html, "options": options_dict})

        process = await asyncio.create_subprocess_exec(
            'node', '-e', js_code,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await asyncio.wait_for(
            process.communicate(input=stdin_payload.encode()),
            timeout=60
        )

        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else 'Error desconocido'
            logger.error(f"Puppeteer error: {error_msg}")
            raise HTTPException(status_code=500, detail=f"Error generando PDF: {error_msg}")

        if len(stdout) < 100:
            raise HTTPException(status_code=500, detail="PDF generado vacío o corrupto")

        logger.info(f"PDF generado exitosamente, tamaño: {len(stdout)} bytes")

        return Response(
            content=stdout,
            media_type="application/pdf",
            headers={"Content-Disposition": "inline; filename=contrato.pdf"}
        )

    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Timeout generando PDF")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)

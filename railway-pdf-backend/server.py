"""
Backend PDF Generator para Eurocar Rental
Deploy en Railway - Solo genera PDFs con Puppeteer
"""
import os
import asyncio
import logging
import subprocess
import json
import base64
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Eurocar PDF Generator", version="1.0.0")

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
    return {"status": "ok", "service": "Eurocar PDF Generator"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/generate-pdf")
async def generate_pdf(request: GeneratePDFRequest):
    try:
        logger.info("Generando PDF...")

        js_code = """
        const puppeteer = require('puppeteer');

        (async () => {
            const browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
            });

            const page = await browser.newPage();

            const html = JSON.parse(process.argv[1]);

            await page.setContent(html, {
                waitUntil: ['networkidle0', 'domcontentloaded']
            });

            await page.waitForTimeout(1000);

            const options = JSON.parse(process.argv[2] || '{}');

            const pdfBuffer = await page.pdf({
                format: options.format || 'Letter',
                printBackground: true,
                margin: options.margin || {
                    top: '10mm',
                    right: '10mm',
                    bottom: '10mm',
                    left: '10mm'
                }
            });

            const base64Pdf = pdfBuffer.toString('base64');
            process.stdout.write(JSON.stringify({ pdf_base64: base64Pdf }));

            await browser.close();
        })();
        """

        options_json = json.dumps(request.options or {})
        html_json = json.dumps(request.html)

        process = await asyncio.create_subprocess_exec(
            'node', '-e', js_code, html_json, options_json,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=60
        )

        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else 'Error desconocido'
            logger.error(f"Puppeteer error: {error_msg}")
            raise HTTPException(status_code=500, detail=f"Error generando PDF: {error_msg}")

        result = json.loads(stdout.decode())
        logger.info("PDF generado exitosamente")

        return {"status": "success", "pdf_base64": result["pdf_base64"]}

    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Timeout generando PDF")
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)

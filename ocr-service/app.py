import os
import base64
import json
import fitz  # PyMuPDF
from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Request
from openai import OpenAI
from pydantic import BaseModel

app = FastAPI()

# Make sure to pass the OPENAI_API_KEY from environment variables
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

class ValidationRequest(BaseModel):
    file_base64: str
    prompt: str

class ValidationResult(BaseModel):
    valido: bool
    motivo_rechazo: str

@app.post("/validate", response_model=ValidationResult)
async def validate_document(request: ValidationRequest):
    try:
        base64_image = request.file_base64
        prompt = request.prompt
        # Note: In JSON, we expect the base64 string directly.
        # If the user sends a PDF, it will be handled by OpenAI directly if supported, or we can just send it as image.
        # Wait, if we send base64 from n8n, we don't know if it's PDF or Image here unless we check magic bytes.
        
        # Check magic bytes for PDF: JVBERi0
        if base64_image.startswith('JVBERi0'):
            # It's a PDF
            content = base64.b64decode(base64_image)
            doc = fitz.open(stream=content, filetype="pdf")
            if len(doc) == 0:
                raise HTTPException(status_code=400, detail="El PDF está vacío.")
            page = doc.load_page(0)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            img_bytes = pix.tobytes("jpeg")
            base64_image = base64.b64encode(img_bytes).decode('utf-8')

        # Construct OpenAI call
        system_prompt = """
        Eres un experto auditor de documentos. Debes analizar la imagen del documento proporcionado de acuerdo a las reglas solicitadas por el usuario.
        Debes devolver SIEMPRE tu respuesta en formato JSON estrictamente con la siguiente estructura:
        {
          "valido": true o false,
          "motivo_rechazo": "Si es valido, vacio. Si es false, explica clara y amablemente por qué se rechaza el documento para que el usuario pueda corregirlo."
        }
        """

        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={ "type": "json_object" },
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                ]}
            ],
            temperature=0.0
        )

        result_str = response.choices[0].message.content
        result_json = json.loads(result_str)

        return ValidationResult(
            valido=result_json.get("valido", False),
            motivo_rechazo=result_json.get("motivo_rechazo", "")
        )

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

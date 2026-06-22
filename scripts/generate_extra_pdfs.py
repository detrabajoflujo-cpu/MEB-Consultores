import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER

def create_pdf(filename, title_text, body_text):
    doc = SimpleDocTemplate(filename, pagesize=letter)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=20,
        alignment=TA_CENTER
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=12,
        spaceAfter=10,
        leading=16
    )
    
    elements = []
    
    elements.append(Paragraph(title_text, title_style))
    elements.append(Spacer(1, 20))
    
    for para in body_text.split('\n\n'):
        if para.strip():
            elements.append(Paragraph(para.strip(), body_style))
            elements.append(Spacer(1, 10))
            
    doc.build(elements)
    print(f"Created: {filename}")

base_dir = r"c:\Users\Angel-PC\Downloads\PuntoClinico-Avances\PuntoClinico-Avances\n8n-workflows"

# Empresa PDF
empresa_text = """
Bienvenidos a Meb Consultores.

Somos una firma especializada en asesoría y gestión de trámites para pensiones. Nuestro objetivo es brindarle tranquilidad y certeza jurídica durante su proceso de pensión.

Contamos con años de experiencia en el rubro, respaldando a miles de clientes que hoy disfrutan de sus beneficios sin complicaciones.

Nuestros valores son la transparencia, el compromiso y la agilidad.
"""
create_pdf(os.path.join(base_dir, "Empresa_Meb_Consultores.pdf"), "Meb Consultores - Información de la Empresa", empresa_text)

# Contrato PDF
contrato_text = """
CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES

En la ciudad y fecha correspondientes, celebran el presente contrato por una parte MEB CONSULTORES, y por otra parte el CLIENTE, bajo las siguientes cláusulas:

PRIMERA: MEB Consultores se compromete a realizar la gestión del expediente de pensión del cliente.
SEGUNDA: El cliente se compromete a entregar la documentación requerida de manera veraz, legible y escaneada mediante escáner.
TERCERA: El cliente acepta que las fotografías de documentos tomadas con celular serán motivo de rechazo de su expediente.
CUARTA: Este contrato es preliminar y deberá firmarse formalmente una vez concluida la revisión documental.

Firma del Cliente: ___________________________
Firma MEB Consultores: _______________________
"""
create_pdf(os.path.join(base_dir, "Contrato_Meb_Consultores.pdf"), "Contrato Preliminar de Servicios", contrato_text)

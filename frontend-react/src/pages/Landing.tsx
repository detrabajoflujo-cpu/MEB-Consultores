import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../landing.css';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* HEADER */}
      <header className="landing-header">
        <div className="landing-container flex items-center justify-between">
          <div className="landing-logo">
            <span className="logo-icon">🏛️</span>
            <span className="logo-text">MEB Consultores</span>
          </div>
          <nav className="landing-nav">
            <button className="btn-nav" onClick={() => document.getElementById('privacy')?.scrollIntoView({ behavior: 'smooth' })}>
              Políticas de Privacidad
            </button>
          </nav>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="landing-hero">
        <div className="landing-container text-center">
          <h1 className="hero-title">
            Tranquilidad y respaldo para su <span className="text-gold">Pensión</span>
          </h1>
          <p className="hero-subtitle">
            Expertos en asesoría y gestión de trámites. Le acompañamos en cada paso para asegurar el futuro financiero que merece con total transparencia y seguridad.
          </p>
          <div className="hero-actions">
            <button className="btn-gold" onClick={() => window.open('https://wa.me/message', '_blank')}>
              Contactar un Asesor
            </button>
          </div>
        </div>
        <div className="hero-bg-overlay"></div>
      </section>

      {/* STATS BAR */}
      <section className="landing-stats">
        <div className="landing-container flex-grid stats-grid">
          <div className="stat-item fade-in-up delay-1">
            <h2 className="stat-number">10+</h2>
            <p className="stat-label">Años de Experiencia</p>
          </div>
          <div className="stat-item fade-in-up delay-2">
            <h2 className="stat-number">500+</h2>
            <p className="stat-label">Trámites Exitosos</p>
          </div>
          <div className="stat-item fade-in-up delay-3">
            <h2 className="stat-number">98%</h2>
            <p className="stat-label">Casos de Éxito</p>
          </div>
          <div className="stat-item fade-in-up delay-4">
            <h2 className="stat-number">100%</h2>
            <p className="stat-label">Asesoría Personalizada</p>
          </div>
        </div>
      </section>

      {/* INFO SECTION */}
      <section className="landing-info">
        <div className="landing-container">
          <div className="section-header text-center fade-in-up">
            <h2 className="section-title">¿Por qué elegir a <span className="text-navy">MEB Consultores</span>?</h2>
            <p className="section-subtitle">Brindamos soluciones integrales con el mayor profesionalismo y dedicación.</p>
          </div>
          <div className="flex-grid mt-4">
            <div className="info-card fade-in-up delay-1">
              <div className="info-icon">🛡️</div>
              <h3>Seguridad Jurídica</h3>
              <p>Trámites 100% legales y transparentes. Su expediente siempre está protegido y gestionado por expertos reconocidos.</p>
            </div>
            <div className="info-card fade-in-up delay-2">
              <div className="info-icon">⏱️</div>
              <h3>Agilidad y Rapidez</h3>
              <p>Aceleramos cada etapa administrativa mediante tecnología de vanguardia para entregarle resultados en el menor tiempo posible.</p>
            </div>
            <div className="info-card fade-in-up delay-3">
              <div className="info-icon">🤝</div>
              <h3>Acompañamiento Total</h3>
              <p>No estará solo. Desde el primer análisis gratuito hasta que reciba su resolución final, nuestro equipo le guiará paso a paso.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PROCESS SECTION */}
      <section className="landing-process">
        <div className="landing-container">
          <div className="section-header text-center fade-in-up">
            <h2 className="section-title text-white">Nuestro <span className="text-gold">Proceso</span></h2>
            <p className="section-subtitle text-silver">Un camino claro, seguro y estructurado hacia su pensión.</p>
          </div>
          <div className="process-timeline mt-4">
            <div className="process-step fade-in-up delay-1">
              <div className="step-number">1</div>
              <h3>Diagnóstico Inicial</h3>
              <p>Analizamos su caso de forma gratuita, evaluamos la viabilidad y le explicamos sus mejores opciones legales.</p>
            </div>
            <div className="process-arrow fade-in-up delay-2">➔</div>
            <div className="process-step fade-in-up delay-2">
              <div className="step-number">2</div>
              <h3>Gestión Documental</h3>
              <p>Recopilamos, validamos e ingresamos su documentación ante las dependencias correspondientes sin que usted se preocupe.</p>
            </div>
            <div className="process-arrow fade-in-up delay-3">➔</div>
            <div className="process-step fade-in-up delay-3">
              <div className="step-number">3</div>
              <h3>Resolución Exitosa</h3>
              <p>Damos seguimiento puntual hasta obtener el dictamen favorable para asegurar el futuro financiero que merece.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRIVACY POLICY */}
      <section id="privacy" className="landing-privacy">
        <div className="landing-container">
          <div className="privacy-card">
            <h2>Política de Privacidad</h2>
            <p className="privacy-date">Última actualización: 12/10/2025</p>

            <p>
              En MEB Consultores nos comprometemos a proteger la privacidad y seguridad de la información de nuestros usuarios, clientes y prospectos.
            </p>

            <h3>1. Información que recopilamos</h3>
            <p>Podemos recopilar la siguiente información:</p>
            <ul>
              <li>Nombre completo.</li>
              <li>Número telefónico.</li>
              <li>Correo electrónico.</li>
              <li>CURP.</li>
              <li>Número de Seguridad Social (NSS).</li>
              <li>Documentación proporcionada voluntariamente por el usuario.</li>
              <li>Información de interacción mediante WhatsApp, formularios web y otros medios digitales.</li>
            </ul>

            <h3>2. Uso de la información</h3>
            <p>La información recopilada será utilizada para:</p>
            <ul>
              <li>Contactar al usuario respecto a los servicios solicitados.</li>
              <li>Gestionar expedientes y procesos administrativos.</li>
              <li>Validar documentación proporcionada por el usuario.</li>
              <li>Dar seguimiento a solicitudes y trámites.</li>
              <li>Mejorar nuestros procesos internos y la calidad del servicio.</li>
            </ul>

            <h3>3. Compartición de información</h3>
            <p>MEB Consultores no vende ni comercializa información personal a terceros.</p>
            <p>La información únicamente podrá compartirse cuando sea necesario para la prestación de los servicios contratados, el cumplimiento de obligaciones legales o por requerimiento de autoridad competente.</p>

            <h3>4. Seguridad de la información</h3>
            <p>Implementamos medidas técnicas y administrativas razonables para proteger la información contra accesos no autorizados, pérdida, alteración o divulgación indebida.</p>

            <h3>5. Conservación de datos</h3>
            <p>La información será conservada únicamente durante el tiempo necesario para cumplir con los fines descritos en esta política o conforme a las disposiciones legales aplicables.</p>

            <h3>6. Derechos del usuario</h3>
            <p>El usuario podrá solicitar:</p>
            <ul>
              <li>Acceso a sus datos.</li>
              <li>Corrección de información incorrecta.</li>
              <li>Eliminación de sus datos cuando proceda.</li>
              <li>Revocación de autorizaciones previamente otorgadas.</li>
            </ul>

            <h3>7. Contacto</h3>
            <p>
              Para cualquier duda relacionada con esta Política de Privacidad o el tratamiento de sus datos personales, puede comunicarse con:
            </p>
            <div className="contact-info">
              <p><strong>MEB Consultores</strong></p>
              <p>Sitio web: <a href="https://mebconsultores.net">https://mebconsultores.net</a></p>
              <p>Correo electrónico: <a href="mailto:contacto@mebconsultores.net">contacto@mebconsultores.net</a></p>
            </div>

            <h3>8. Cambios a esta política</h3>
            <p>MEB Consultores podrá actualizar esta Política de Privacidad en cualquier momento. Las modificaciones serán publicadas en esta misma página.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="landing-container text-center">
          <p>© 2026 MEB Consultores. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

import { LoginCarnetBarcode } from '@/components/login/LoginCarnetBarcode';
import { BRAND_ICON_SVG } from '@/config/brandAssets';
import { SCHOOL_NAME, SCHOOL_SHORT } from '@/config/siteSeo';

const SPARKS = Array.from({ length: 10 }, (_, i) => i);
const EMBERS = Array.from({ length: 18 }, (_, i) => i);
const CARNET_CODE = '61814729';
const STUDENT_PHOTO = '/login-carnet-student.jpg';

/** Carnet foto real (Jean Piaget) si existe asset / override por env. */
const PHOTO_CARNET_SRC =
  (import.meta.env.VITE_LOGIN_CARNET_SRC as string | undefined)?.trim() ||
  (SCHOOL_NAME.includes('Jean Piaget') ? '/Carnet-JeanPiaget.png' : '');

/**
 * Escena de login: carnet real (JP) o réplica digital (San Ramón).
 */
export function LoginHeroIllustration() {
  if (PHOTO_CARNET_SRC) {
    return (
      <div className="login-hero-visual login-carnet-scene" aria-hidden>
        <div className="login-carnet-scene__halo" data-login-visual-halo />
        <div className="login-carnet-scene__glow-ring" data-login-visual-glow-ring aria-hidden />
        <div className="login-carnet-scene__pulse" data-login-visual-pulse-ring aria-hidden />

        <div className="login-carnet-scene__frame" data-login-visual-inner>
          <div className="login-carnet-scanner" data-login-visual-scanner>
            <div className="login-carnet-scanner__frame" aria-hidden>
              <span className="login-carnet-scanner__corner login-carnet-scanner__corner--tl" />
              <span className="login-carnet-scanner__corner login-carnet-scanner__corner--tr" />
              <span className="login-carnet-scanner__corner login-carnet-scanner__corner--bl" />
              <span className="login-carnet-scanner__corner login-carnet-scanner__corner--br" />
            </div>

            <div
              className="login-carnet-card login-carnet-replica login-carnet-replica--photo"
              data-login-visual-card
            >
              <div className="login-carnet-replica__edge-glow" data-login-visual-edge-glow aria-hidden />
              <div className="login-carnet-card__flash" data-login-visual-flash aria-hidden />
              <div className="login-carnet-card__success-ring" data-login-visual-success-ring aria-hidden />

              <div
                className="login-carnet-replica__photo-card"
                data-login-visual-carnet
                data-login-visual-carnet-part="photo"
              >
                <img
                  src={PHOTO_CARNET_SRC}
                  alt={`Carnet escolar de ejemplo — ${SCHOOL_NAME}`}
                  className="login-carnet-replica__photo-card-img"
                  width={420}
                  height={640}
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-hero-visual login-carnet-scene" aria-hidden>
      <div className="login-carnet-scene__halo" data-login-visual-halo />
      <div className="login-carnet-scene__glow-ring" data-login-visual-glow-ring aria-hidden />
      <div className="login-carnet-scene__pulse" data-login-visual-pulse-ring aria-hidden />

      <div className="login-carnet-scene__frame" data-login-visual-inner>
        <div className="login-carnet-scanner" data-login-visual-scanner>
          <div className="login-carnet-scanner__frame" aria-hidden>
            <span className="login-carnet-scanner__corner login-carnet-scanner__corner--tl" />
            <span className="login-carnet-scanner__corner login-carnet-scanner__corner--tr" />
            <span className="login-carnet-scanner__corner login-carnet-scanner__corner--bl" />
            <span className="login-carnet-scanner__corner login-carnet-scanner__corner--br" />
          </div>

          <div className="login-carnet-card login-carnet-replica" data-login-visual-card>
            <div className="login-carnet-replica__orbit" data-login-visual-orbit aria-hidden />
            <div className="login-carnet-replica__embers" data-login-visual-embers aria-hidden>
              {EMBERS.map((i) => (
                <span key={i} className="login-carnet-replica__ember" data-login-visual-ember={i} />
              ))}
            </div>
            <div className="login-carnet-replica__edge-glow" data-login-visual-edge-glow aria-hidden />
            <div className="login-carnet-replica__shimmer" data-login-visual-shimmer aria-hidden>
              <span className="login-carnet-replica__shimmer-beam" data-login-visual-shimmer-beam />
            </div>
            <div className="login-carnet-replica__holo" data-login-visual-holo aria-hidden />
            <div className="login-carnet-card__flash" data-login-visual-flash aria-hidden />
            <div className="login-carnet-card__success-ring" data-login-visual-success-ring aria-hidden />

            <div className="login-carnet-replica__flip" data-login-visual-flip>
              <div className="login-carnet-replica__face login-carnet-replica__face--front">
                <div className="login-carnet-replica__scan-overlay" data-login-visual-scan-overlay aria-hidden />
                <div className="login-carnet-replica__scan-cone" data-login-visual-scan-cone aria-hidden />
                <div className="login-carnet-replica__scan-line" data-login-visual-card-scanline aria-hidden />

                <div className="login-carnet-replica__stripe" data-login-visual-carnet-part="stripe" aria-hidden />

                <div className="login-carnet-replica__inner" data-login-visual-carnet>
                  <header className="login-carnet-replica__head" data-login-visual-carnet-part="header">
                    <span className="login-carnet-replica__chip" data-login-visual-carnet-part="chip" aria-hidden />
                    <img
                      src={BRAND_ICON_SVG}
                      alt={`Escudo ${SCHOOL_SHORT}`}
                      className="login-carnet-replica__crest"
                      width={20}
                      height={20}
                      draggable={false}
                    />
                    <div className="login-carnet-replica__head-text">
                      <p className="login-carnet-replica__school">{SCHOOL_SHORT}</p>
                      <p className="login-carnet-replica__school-sub">Institución Educativa Pública Emblemática</p>
                    </div>
                  </header>

                  <div className="login-carnet-replica__body">
                    <div className="login-carnet-replica__photo-wrap" data-login-visual-carnet-part="photo">
                      <div className="login-carnet-replica__photo">
                        <span className="login-carnet-replica__photo-ring" aria-hidden />
                        <img
                          src={STUDENT_PHOTO}
                          alt="Estudiante de ejemplo en carnet escolar"
                          className="login-carnet-replica__photo-img"
                          draggable={false}
                        />
                      </div>
                    </div>
                    <div className="login-carnet-replica__info" data-login-visual-carnet-part="info">
                      <p className="login-carnet-replica__name">
                        Jacob Elías
                        <br />
                        Mora Villegas
                      </p>
                      <p className="login-carnet-replica__grade">5º &apos;A&apos; · Secundaria</p>
                    </div>
                  </div>

                  <footer className="login-carnet-replica__foot" data-login-visual-carnet-part="foot">
                    <div className="login-carnet-replica__barcode-wrap" data-login-visual-bars>
                      <LoginCarnetBarcode value={CARNET_CODE} className="login-carnet-replica__barcode-svg" />
                    </div>
                    <p className="login-carnet-replica__foot-code">{CARNET_CODE}</p>
                    <p className="login-carnet-replica__foot-role">Estudiante</p>
                  </footer>
                </div>

                <div className="login-carnet-card__barcode-zone" data-login-visual-barcode-zone>
                  <span className="login-carnet-card__zone-pulse" aria-hidden />
                  <span className="login-carnet-card__barcode-corner login-carnet-card__barcode-corner--tl" />
                  <span className="login-carnet-card__barcode-corner login-carnet-card__barcode-corner--tr" />
                  <span className="login-carnet-card__barcode-corner login-carnet-card__barcode-corner--bl" />
                  <span className="login-carnet-card__barcode-corner login-carnet-card__barcode-corner--br" />
                  <div className="login-carnet-card__barcode-track" data-login-visual-scan-track>
                    <div className="login-carnet-card__barcode-sparks" aria-hidden>
                      {SPARKS.map((i) => (
                        <span key={i} className="login-carnet-card__spark" data-login-visual-spark={i} />
                      ))}
                    </div>
                    <div className="login-carnet-card__barcode-hscan" data-login-visual-hscan aria-hidden />
                    <div className="login-carnet-card__barcode-trail" data-login-visual-beam-glow aria-hidden />
                    <div className="login-carnet-card__barcode-beam" data-login-visual-beam aria-hidden />
                    <div className="login-carnet-card__barcode-beam-core" data-login-visual-beam-core aria-hidden />
                  </div>
                </div>
              </div>

              <div className="login-carnet-replica__face login-carnet-replica__face--back" data-login-visual-flip-back>
                <div className="login-carnet-replica__back-stripe" aria-hidden />
                <img
                  src={BRAND_ICON_SVG}
                  alt={`Escudo ${SCHOOL_SHORT}`}
                  className="login-carnet-replica__back-crest"
                  width={36}
                  height={36}
                  draggable={false}
                />
                <p className="login-carnet-replica__back-school">{SCHOOL_SHORT}</p>
                <p className="login-carnet-replica__back-note">Documento de identificación escolar</p>
                <div className="login-carnet-replica__back-line" aria-hidden />
                <p className="login-carnet-replica__back-sign">Firma autorizada</p>
                <p className="login-carnet-replica__back-code">{CARNET_CODE}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

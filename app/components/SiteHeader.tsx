"use client";

// codivostudio-web(ver2) 헤더와 같은 모양. 로고, "전체 프로젝트" 링크, 종료 버튼만 둔다.
// 이 앱은 vercel.app 주소로도 열릴 수 있어서 링크는 절대 주소로 둔다.
const SITE = "https://www.codivostudio.com";

// 스크립트로 열지 않은 창은 브라우저가 window.close()를 막는다.
// 잠시 후에도 창이 남아 있으면 홈페이지로 이동한다.
function closeWindow() {
  window.close();
  setTimeout(() => {
    window.location.href = `${SITE}/`;
  }, 300);
}

export default function SiteHeader() {
  return (
    <header className="cs-site-header">
      <div className="cs-site-header__inner">
        <a className="cs-site-header__logo" href={`${SITE}/`} aria-label="CODIVO STUDIO 홈">
          <img
            src="/tools/margin-calculator/logo/brand-logo.png"
            alt=""
            width={42}
            height={28}
          />
          <span className="cs-site-header__brand">
            <span className="cs-site-header__name">
              <b>COD</b>
              <b className="is-vivo">IVO</b> <em>STUDIO</em>
            </span>
            <span className="cs-site-header__meaning">
              code + <i>vivo</i>
            </span>
          </span>
        </a>
        <div className="cs-site-header__actions">
          <a className="cs-site-header__link" href={`${SITE}/tools`}>
            전체 프로젝트
          </a>
          <button type="button" className="cs-site-header__close" onClick={closeWindow}>
            종료
          </button>
        </div>
      </div>
    </header>
  );
}

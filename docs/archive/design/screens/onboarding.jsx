// onboarding.jsx — 미인증 상태 진입 안내 + 노트 저장 시점 인증 요구

const { C: Co, Phone: PhO, LectureLogo: LLO, PrimaryButton: PBo, Icon: IcO } = window.LN;

// A안. 풀스크린 웰컴 (스플래시 다음 단계)
function OnboardingWelcome({ nav } = {}) {
  return (
    <PhO bg={Co.navy} statusbar="light">
      {/* 배경 장식 */}
      <div style={{ position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(75,130,197,0.35), transparent 65%)' }}/>
      <div style={{ position: 'absolute', bottom: -100, left: -80, width: 280, height: 280, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(75,130,197,0.18), transparent 70%)' }}/>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '50px 28px 24px', position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <LLO size={80}/>
        <div style={{ marginTop: 26 }}>
          <div style={{ fontSize: 38, fontWeight: 800, color: '#fff', letterSpacing: '-0.8px', lineHeight: 1, fontStyle: 'italic' }}>
            LectureNote
          </div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.62)', marginTop: 12, fontStyle: 'italic' }}>
            "녹음, 자료, 필기 — 모두 하나의 노트로"
          </div>
        </div>

        {/* 가치 제안 */}
        <div style={{ marginTop: 38, width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { i: 'mic', t: '강의 녹음 + PDF + 필기를 한번에' },
            { i: 'bolt', t: 'Gemini 멀티모달 AI가 요약·정리' },
            { i: 'library', t: '학기별로 자동 분류된 내 노트함' },
          ].map(b => (
            <div key={b.i} style={{
              display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.08)', borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.12)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: Co.blue, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BulletIcon name={b.i}/>
              </div>
              <div style={{ fontSize: 14, color: '#fff', fontWeight: 500, letterSpacing: '-0.1px' }}>{b.t}</div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }}/>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div onClick={() => nav && nav('signup')} style={{cursor:'pointer'}}><PBo>회원가입하고 시작하기</PBo></div>
          <button onClick={() => nav && nav('login')} style={{
            width: '100%', height: 50, borderRadius: 14, background: 'transparent',
            color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)',
            fontSize: 14.5, fontWeight: 600, cursor: 'pointer',
          }}>이미 계정이 있어요 · 로그인</button>
        </div>

        <div onClick={() => nav && nav('main')} style={{ marginTop: 14, fontSize: 12, color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>
          로그인 없이 둘러보기 →
        </div>
      </div>
    </PhO>
  );
}

// B안. 가벼운 안내 배너 — 로그인 안 한 상태로 메인을 둘러보다 노트 저장하려할 때
function GuestSavePrompt() {
  return (
    <PhO bg={Co.bg} statusbar="light">
      <div style={{ height: 56, background: Co.navy, padding: '0 16px',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, overflow: 'hidden' }}><LLO size={30}/></div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Lecture<span style={{ color: Co.blue }}>Note</span></div>
        <div style={{ marginLeft: 'auto', fontSize: 11.5, color: 'rgba(255,255,255,0.62)' }}>게스트</div>
      </div>

      <div style={{ flex: 1, padding: '14px 14px 14px', overflow: 'auto' }}>
        {/* 게스트 모드 안내 배너 */}
        <div style={{
          background: Co.warnSoft, border: `1px solid ${Co.warn}40`,
          borderRadius: 12, padding: '12px 14px', marginBottom: 12,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <div style={{ color: Co.warn, marginTop: 1 }}><IcO name="info" size={18}/></div>
          <div style={{ fontSize: 12.5, color: '#8a5a06', lineHeight: 1.55 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#7c3e00', marginBottom: 2 }}>둘러보기 모드</div>
            로그인하지 않아 노트는 이 기기에만 임시 저장됩니다.
            <span style={{ color: Co.navy, fontWeight: 700, marginLeft: 4 }}>가입하면 영구 보관 →</span>
          </div>
        </div>

        {/* 본문(흐릿하게) */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: Co.navy }}>강의 등록</div>
          <div style={{ marginTop: 12, height: 90, border: `2px dashed ${Co.border}`, borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: Co.muted, fontSize: 13 }}>
            강의계획서 PDF 업로드
          </div>
        </div>

        {/* 모달 — '로그인이 필요해요' */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,27,61,0.55)' }}/>
        <div style={{
          position: 'absolute', left: 24, right: 24, top: '50%',
          transform: 'translateY(-50%)',
          background: '#fff', borderRadius: 20, padding: '24px 22px 20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: Co.blueSoft, color: Co.blue,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            <IcO name="lock" size={22}/>
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: Co.text, letterSpacing: '-0.3px' }}>
            노트를 저장하려면 로그인이 필요해요
          </div>
          <div style={{ fontSize: 13, color: Co.muted, marginTop: 8, lineHeight: 1.55 }}>
            가입한 계정에만 노트가 안전하게 보관됩니다.
            지금까지 입력한 내용은 그대로 유지됩니다.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <PBo variant="ghost" style={{ flex: 1 }}>나중에</PBo>
            <PBo style={{ flex: 1.5 }}>로그인</PBo>
          </div>
        </div>
      </div>
    </PhO>
  );
}

function BulletIcon({ name }) {
  const map = {
    mic:  <><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/></>,
    bolt: <path d="M13 3L5 14h6l-1 7 9-12h-7l1-6z" fill="currentColor"/>,
    library: <><rect x="4" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="10" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="16" y="4" width="4" height="16" rx="1" fill="currentColor"/></>,
  };
  return <svg width="18" height="18" viewBox="0 0 24 24">{map[name]}</svg>;
}

window.OnboardingScreens = { OnboardingWelcome, GuestSavePrompt };

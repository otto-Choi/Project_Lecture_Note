// main-app.jsx — 로그인 후 메인 앱 (기존 강의 등록 탭을 간단히 재현)

const { C: Cm, Phone: PhM, AppBar: ABm, BottomNav: BNm, Icon: IcM, LectureLogo: LLM } = window.LN;

function MainApp({ user, nav }) {
  return (
    <PhM bg={Cm.bg} statusbar="light">
      <ABm title="강의 등록" user={user || '김'} onUserClick={() => nav && nav('profile')}/>

      <div style={{ flex: 1, padding: '14px 14px', overflow: 'auto' }}>
        {/* 인사 배너 */}
        <div style={{
          background: 'linear-gradient(135deg, #4B82C5 0%, #1A2D5E 100%)',
          borderRadius: 14, padding: '14px 16px', color: '#fff', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 19, background: 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, flexShrink: 0,
          }}>김</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>안녕하세요, 김도환님</div>
            <div style={{ fontSize: 11.5, opacity: 0.78, marginTop: 1 }}>등록된 강의 4개 · 이번 주 노트 3개</div>
          </div>
        </div>

        {/* 강의 등록 카드 */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: 16,
          marginBottom: 12,
          boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 12px rgba(16,24,40,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: Cm.navy }}>강의 등록</div>
            <div style={{
              fontSize: 9.5, padding: '2px 8px', borderRadius: 20,
              background: Cm.navy, color: '#fff', fontWeight: 700, letterSpacing: '0.08em',
            }}>STEP 0</div>
            <div style={{ marginLeft: 'auto', fontSize: 11, color: Cm.muted }}>학기 초 1회</div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: Cm.textSoft, marginBottom: 6 }}>
            강의계획서 (PDF 또는 TXT) *
          </div>
          <div style={{
            border: `2px dashed ${Cm.border}`, borderRadius: 14, padding: '22px 14px 18px',
            textAlign: 'center', background: '#fbfbfd',
          }}>
            <div style={{ width: 38, height: 38, margin: '0 auto 8px', color: Cm.blue,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IcM name="info" size={32} color={Cm.blue}/>
            </div>
            <div style={{ fontSize: 13.5, color: Cm.text, fontWeight: 600 }}>파일을 선택하거나 끌어다 놓으세요</div>
            <div style={{ fontSize: 11.5, color: Cm.muted, marginTop: 3 }}>PDF · TXT</div>
          </div>

          <div style={{
            display: 'none',
            alignItems: 'center', gap: 8, marginTop: 8,
            padding: '9px 12px', background: Cm.okSoft, borderRadius: 10,
            fontSize: 12, color: '#157a45', fontWeight: 600,
          }}>
            <IcM name="check" size={14} color={Cm.ok}/> 조직행동론_강의계획서.pdf
          </div>
        </div>

        <div onClick={() => nav && nav('pipeline')} style={{ cursor: 'pointer' }}>
          <button style={{
            width: '100%', height: 52, borderRadius: 14,
            background: Cm.navy, color: '#fff', border: 'none',
            fontSize: 15, fontWeight: 700, letterSpacing: '-0.2px',
            boxShadow: '0 4px 12px rgba(26,45,94,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: 'pointer',
          }}>
            강의 등록하기 (데모: 파이프라인 보기)
            <IcM name="arrow-right" size={16}/>
          </button>
        </div>

        <div style={{ height: 12 }}/>

        {/* 등록된 강의 목록 */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: 16,
          boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 12px rgba(16,24,40,0.04)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: Cm.navy, marginBottom: 12 }}>최근 등록된 강의</div>
          {[
            { t: '조직행동론', s: '이병헌 교수 · 2026-03-04' },
            { t: '경영전략', s: '김도환 교수 · 2026-02-28' },
            { t: '재무관리', s: '최철원 교수 · 2026-02-22' },
          ].map(l => (
            <div key={l.t} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', borderRadius: 12,
              border: `1.5px solid ${Cm.border}`, background: '#fff',
              marginBottom: 6,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: Cm.text }}>{l.t}</div>
                <div style={{ fontSize: 11.5, color: Cm.muted, marginTop: 1 }}>{l.s}</div>
              </div>
              <span style={{ color: Cm.muted }}><IcM name="chevron" size={16}/></span>
            </div>
          ))}
        </div>
      </div>

      <BNm active="t0"/>
    </PhM>
  );
}

window.MainApp = MainApp;

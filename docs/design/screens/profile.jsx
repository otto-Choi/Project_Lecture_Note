// profile.jsx — 프로필 시트 (앱바 우측 아이콘에서 열림) + 앱바에 사용자 메뉴 추가된 메인 컨텍스트

const { C: Cp, Phone: PhP, LectureLogo: LLP, AppBar: ABp, BottomNav: BNp, Icon: IcP, PrimaryButton: PBp } = window.LN;

// 프로필 시트 A — 앱바 컨텍스트와 함께 표시
function ProfileSheetA() {
  return (
    <PhP bg={Cp.bg} statusbar="light">
      <ABp title="강의 등록" user="김"/>
      {/* 살짝 보이는 본문 — 회색 영역 */}
      <div style={{ flex: 1, padding: '14px 14px', background: Cp.bg, opacity: 0.55, filter: 'blur(0.3px)' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, height: 120 }}/>
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, height: 200 }}/>
      </div>

      {/* 시트 마스크 */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,27,61,0.55)' }}/>

      {/* 시트 본체 */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: '#fff',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -10px 30px rgba(0,0,0,0.25)',
        paddingBottom: 24,
      }}>
        <div style={{ width: 42, height: 4, background: Cp.border, borderRadius: 2, margin: '10px auto 18px' }}/>

        {/* 헤더: 아바타 + 이름 */}
        <div style={{ padding: '0 22px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 28,
            background: 'linear-gradient(135deg, #4B82C5 0%, #1A2D5E 100%)',
            color: '#fff', fontSize: 22, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>김</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: Cp.text, letterSpacing: '-0.2px' }}>김도환</div>
            <div style={{ fontSize: 12.5, color: Cp.muted, marginTop: 2 }}>@lecture_note_2026 · 서울과학기술대</div>
          </div>
          <button style={{
            border: `1px solid ${Cp.border}`, background: '#fff', color: Cp.textSoft,
            fontSize: 11.5, fontWeight: 600, padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
          }}>편집</button>
        </div>

        {/* 통계 */}
        <div style={{ display: 'flex', gap: 10, padding: '0 22px 18px' }}>
          <Stat label="등록 강의" v="4"/>
          <Stat label="생성 노트" v="27"/>
          <Stat label="이번 주" v="3"/>
        </div>

        <Divider/>

        {/* 다크모드 토글 */}
        <Row label="다크모드" icon="moon">
          <Toggle on={false}/>
        </Row>
        <Row label="알림" icon="bell">
          <Toggle on={true}/>
        </Row>
        <Divider/>
        <Row label="계정 정보" icon="user" chevron/>
        <Row label="앱 설정" icon="settings" chevron/>
        <Divider/>
        <Row label="로그아웃" icon="logout" tint={Cp.err}/>
      </div>
    </PhP>
  );
}

// 프로필 시트 B — 풀 페이지 형태 ('내정보' 화면 스타일)
function ProfilePageB({ nav, onLogout } = {}) {
  const logout = () => onLogout ? onLogout() : nav && nav('login');
  return (
    <PhP bg={Cp.bg} statusbar="light">
      <ABp title="내 정보" user="김" onUserClick={() => nav && nav('main')}/>

      <div style={{ flex: 1, padding: '14px 14px 80px', overflow: 'auto' }}>
        {/* 사용자 헤더 카드 */}
        <div style={{
          background: 'linear-gradient(135deg, #1A2D5E 0%, #243A6E 60%, #4B82C5 130%)',
          borderRadius: 18, padding: '20px 18px',
          color: '#fff', position: 'relative', overflow: 'hidden',
          marginBottom: 12,
        }}>
          {/* 배경 장식 */}
          <div style={{ position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)' }}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
            <div style={{
              width: 60, height: 60, borderRadius: 30,
              background: 'rgba(255,255,255,0.16)', border: '2px solid rgba(255,255,255,0.32)',
              color: '#fff', fontSize: 22, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>김</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.3px' }}>김도환</div>
              <div style={{ fontSize: 12.5, opacity: 0.78, marginTop: 2 }}>@lecture_note_2026</div>
              <div style={{ fontSize: 12, opacity: 0.62, marginTop: 1 }}>서울과학기술대 · 경영학과</div>
            </div>
            <button style={{
              border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff',
              fontSize: 11.5, fontWeight: 600, padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
            }}>편집</button>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18, position: 'relative' }}>
            <DarkStat label="등록 강의" v="4"/>
            <DarkStat label="생성 노트" v="27"/>
            <DarkStat label="이번 주" v="3"/>
          </div>
        </div>

        {/* 메뉴 카드 */}
        <Card title="설정">
          <Row label="다크모드" icon="moon"><Toggle on={false}/></Row>
          <Row label="푸시 알림" icon="bell"><Toggle on={true}/></Row>
          <Row label="언어 설정" icon="globe" sub="한국어" chevron last onClick={() => nav && nav('language')}/>
        </Card>

        <Card title="계정">
          <Row label="비밀번호 변경" icon="lock" chevron onClick={() => nav && nav('password-change')}/>
          <Row label="가입 정보" icon="info" chevron onClick={() => nav && nav('account-info')}/>
          <Row label="구독 플랜" icon="crown" tint={Cp.warn} chevron sub="Free · 기본 플랜" last onClick={() => nav && nav('subscription')}/>
        </Card>

        <Card>
          <Row label="로그아웃" icon="logout" tint={Cp.err} last onClick={logout}/>
        </Card>

        <div style={{ textAlign: 'center', padding: '12px 0 0', fontSize: 11, color: Cp.muted }}>
          LectureNote v0.4 · 경영전략 9팀
        </div>
      </div>
      <BNp active="t0"/>
    </PhP>
  );
}

// ── Helpers ──────────────────────────────────────────────
function Stat({ label, v }) {
  return (
    <div style={{
      flex: 1, padding: '12px 8px', background: Cp.borderSoft, borderRadius: 12,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 19, fontWeight: 800, color: Cp.navy, letterSpacing: '-0.4px' }}>{v}</div>
      <div style={{ fontSize: 11, color: Cp.muted, marginTop: 1 }}>{label}</div>
    </div>
  );
}
function DarkStat({ label, v }) {
  return (
    <div style={{
      flex: 1, padding: '10px 4px', background: 'rgba(255,255,255,0.12)', borderRadius: 10,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>{v}</div>
      <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>{label}</div>
    </div>
  );
}
function Toggle({ on }) {
  return (
    <div style={{
      width: 42, height: 24, borderRadius: 12,
      background: on ? Cp.navy : Cp.border,
      position: 'relative', transition: 'background 0.15s',
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 20 : 2,
        width: 20, height: 20, borderRadius: 10, background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.15s',
      }}/>
    </div>
  );
}
function Row({ label, icon, sub, chevron, tint, children, last, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '13px 18px',
      borderBottom: last ? 'none' : `1px solid ${Cp.borderSoft}`,
      cursor: 'pointer',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: tint ? `${tint}15` : Cp.borderSoft,
        color: tint || Cp.textSoft,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <IcP name={icon} size={17}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: tint || Cp.text, letterSpacing: '-0.1px' }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: Cp.muted, marginTop: 1, fontFamily: 'ui-monospace, Menlo, monospace' }}>{sub}</div>}
      </div>
      {children}
      {chevron && <span style={{ color: Cp.muted }}><IcP name="chevron" size={18}/></span>}
    </div>
  );
}
function Divider() {
  return <div style={{ height: 8, background: Cp.borderSoft }}/>;
}
function Card({ title, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {title && (
        <div style={{ fontSize: 11.5, fontWeight: 700, color: Cp.navy,
          padding: '8px 18px 6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {title}
        </div>
      )}
      <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 12px rgba(16,24,40,0.04)' }}>
        {children}
      </div>
    </div>
  );
}

window.ProfileScreens = { ProfileSheetA, ProfilePageB };

// login.jsx — 로그인 화면 3가지 변주

const { C, Phone, LectureLogo, Field, PrimaryButton, Check, TextLink, Icon, ScreenTitle } = window.LN;

// ───────────────────────────────────────────────────────────
// A안. 표준 — Navy 상단 1/3 + 흰 카드 폼 (요청한 비주얼 톤)
// ───────────────────────────────────────────────────────────
function LoginA({ nav, onLogin, defaultRemember = true } = {}) {
  const [save, setSave] = React.useState(defaultRemember);
  const goSignup = () => nav && nav('signup');
  const goFind = (which) => nav && nav('find', { tab: which });
  const submit = () => { if (onLogin) onLogin(save); };
  return (
    <Phone bg={C.navy} statusbar="light">
      {/* Navy 상단 — 화면의 약 35% */}
      <div style={{ background: C.navy, padding: '24px 28px 56px', flexShrink: 0 }}>
        <div style={{ marginTop: 14, marginBottom: 22 }}>
          <LectureLogo size={56}/>
        </div>
        <ScreenTitle
          kicker="LECTURENOTE"
          title={<>다시 만나서<br/>반가워요.</>}
          sub="로그인하고 내 강의·노트를 이어서 만들어보세요."
        />
      </div>

      {/* 흰 카드 폼 — 위로 살짝 겹쳐서 올라오는 느낌 */}
      <div style={{
        flex: 1, background: C.bg,
        borderRadius: '24px 24px 0 0',
        marginTop: -18,
        padding: '26px 24px 0',
        display: 'flex', flexDirection: 'column',
      }}>
        <Field
          label="아이디"
          placeholder="아이디를 입력하세요"
          icon={<Icon name="id" size={18}/>}
          value=""
        />
        <Field
          label="비밀번호"
          type="password"
          placeholder="••••••••"
          icon={<Icon name="lock" size={18}/>}
          suffix={<Icon name="eye" size={18}/>}
          value=""
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 18px' }}>
          <Check checked={save} label="자동 로그인" onClick={() => setSave(s => !s)}/>
          <span onClick={() => goFind('pw')}><TextLink>비밀번호 찾기</TextLink></span>
        </div>

        <div onClick={submit} style={{ cursor: 'pointer' }}>
          <PrimaryButton>
            로그인
            <Icon name="arrow-right" size={16} color="#fff"/>
          </PrimaryButton>
        </div>

        <div style={{ flex: 1 }}/>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 14 }}>
          <span onClick={() => goFind('id')}><TextLink>아이디 찾기</TextLink></span>
          <span style={{ color: C.border }}>|</span>
          <span onClick={() => goFind('pw')}><TextLink>비밀번호 찾기</TextLink></span>
        </div>

        <div style={{ flex: 1 }}/>

        <div onClick={goSignup} style={{
          padding: '18px 0 22px',
          display: 'flex', justifyContent: 'center', gap: 6,
          fontSize: 13.5, color: C.muted, borderTop: `1px solid ${C.border}`, marginTop: 12,
          cursor: 'pointer',
        }}>
          처음이신가요?
          <span style={{ color: C.navy, fontWeight: 700 }}>회원가입 →</span>
        </div>
      </div>
    </Phone>
  );
}

// ───────────────────────────────────────────────────────────
// B안. 미니멀 — 단순 흰 배경 + 로고 + 폼만 (담백)
// ───────────────────────────────────────────────────────────
function LoginB() {
  return (
    <Phone bg="#fff" statusbar="dark">
      <div style={{ padding: '12px 28px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 작은 상단 — 뒤로가기 자리 */}
        <div style={{ height: 44, display: 'flex', alignItems: 'center' }}/>

        <div style={{ marginTop: 30, marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <LectureLogo size={44}/>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.navy, letterSpacing: '-0.4px' }}>
              Lecture<span style={{ color: C.blue }}>Note</span>
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: '-0.6px', lineHeight: 1.2 }}>
            로그인
          </div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>
            아이디와 비밀번호를 입력해주세요.
          </div>
        </div>

        <Field label="아이디" placeholder="lecture_note" icon={<Icon name="id" size={18}/>}/>
        <Field label="비밀번호" type="password" placeholder="••••••••" icon={<Icon name="lock" size={18}/>} suffix={<Icon name="eye-off" size={18}/>}/>

        <div style={{ height: 12 }}/>
        <PrimaryButton>로그인</PrimaryButton>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 18 }}>
          <TextLink>아이디 찾기</TextLink>
          <span style={{ color: C.border }}>|</span>
          <TextLink>비밀번호 찾기</TextLink>
          <span style={{ color: C.border }}>|</span>
          <TextLink color={C.navy} weight={700}>회원가입</TextLink>
        </div>

        <div style={{ flex: 1 }}/>

        <div style={{ paddingBottom: 28, fontSize: 11, color: C.muted, textAlign: 'center', letterSpacing: '0.02em' }}>
          경영전략 9팀 · LectureNote v0.4
        </div>
      </div>
    </Phone>
  );
}

// ───────────────────────────────────────────────────────────
// C안. 풀 Navy + 플로팅 화이트 카드 (앱스럽고 임팩트)
// ───────────────────────────────────────────────────────────
function LoginC() {
  return (
    <Phone bg={C.navyDeep} statusbar="light">
      {/* 배경 장식: Sky Blue 원 */}
      <div style={{ position: 'absolute', top: -80, right: -60, width: 240, height: 240, borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, rgba(75,130,197,0.45), transparent 70%)' }}/>
      <div style={{ position: 'absolute', bottom: -120, left: -80, width: 280, height: 280, borderRadius: '50%',
        background: 'radial-gradient(circle at 50% 50%, rgba(75,130,197,0.22), transparent 70%)' }}/>

      <div style={{ padding: '36px 28px 22px', position: 'relative', zIndex: 1 }}>
        <LectureLogo size={52}/>
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 42, fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1, fontStyle: 'italic' }}>
            LectureNote
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.62)', marginTop: 10, letterSpacing: '-0.1px' }}>
            "녹음, 자료, 필기 — 모두 하나의 노트로"
          </div>
        </div>
      </div>

      {/* 카드 */}
      <div style={{
        margin: '14px 20px 0', padding: '24px 22px 22px',
        background: '#fff', borderRadius: 20,
        boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.navy, marginBottom: 4 }}>로그인</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 18 }}>계정 정보를 입력하세요</div>

        <Field label="아이디" placeholder="아이디" icon={<Icon name="id" size={18}/>}/>
        <Field label="비밀번호" type="password" placeholder="비밀번호" icon={<Icon name="lock" size={18}/>} suffix={<Icon name="eye" size={18}/>}/>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14, marginTop: -4 }}>
          <TextLink>비밀번호를 잊으셨나요?</TextLink>
        </div>

        <PrimaryButton variant="navy">로그인</PrimaryButton>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0',
          color: C.muted, fontSize: 12 }}>
          <div style={{ flex: 1, height: 1, background: C.border }}/>
          <span>또는</span>
          <div style={{ flex: 1, height: 1, background: C.border }}/>
        </div>

        <PrimaryButton variant="ghost">
          <Icon name="user" size={16} color={C.navy}/>
          새 계정 만들기
        </PrimaryButton>
      </div>

      <div style={{ flex: 1 }}/>
      <div style={{ textAlign: 'center', padding: '0 0 24px', position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>로그인 없이 둘러보기 →</span>
      </div>
    </Phone>
  );
}

window.LoginScreens = { LoginA, LoginB, LoginC };

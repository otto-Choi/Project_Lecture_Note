// signup.jsx — 회원가입 화면 (2 변주)

const { C: Cs, Phone: PhS, LectureLogo: LL_S, Field: Fs, PrimaryButton: PBs, Check: ChkS, TextLink: TLs, Icon: IcS, ScreenTitle: STs } = window.LN;

// 화면 상단 작은 헤더 (뒤로가기 + 타이틀)
function SubHeader({ title, dark = false, step }) {
  return (
    <div style={{
      height: 52, display: 'flex', alignItems: 'center',
      padding: '0 16px', flexShrink: 0,
      borderBottom: dark ? 'none' : `1px solid ${Cs.border}`,
      background: dark ? Cs.navy : '#fff',
      color: dark ? '#fff' : Cs.text,
    }}>
      <button style={{ background:'none', border:'none', padding: 6, marginLeft: -6, cursor:'pointer',
        color: dark ? '#fff' : Cs.text, display: 'flex' }}>
        <IcS name="back" size={22}/>
      </button>
      <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700, letterSpacing: '-0.2px' }}>{title}</div>
      <div style={{ width: 30, textAlign: 'right', fontSize: 12.5, fontWeight: 600, color: dark ? 'rgba(255,255,255,0.6)' : Cs.muted }}>
        {step}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// A안. 단일 폼 — 모든 항목을 하나의 스크롤 폼에서
// ───────────────────────────────────────────────────────────
function SignupA({ nav } = {}) {
  const [agree1, setAgree1] = React.useState(false);
  const [agree2, setAgree2] = React.useState(false);
  const allAgree = agree1 && agree2;

  return (
    <PhS bg="#fff" statusbar="dark">
      <SubHeader title="회원가입" />
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 22px 24px' }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: Cs.text, letterSpacing: '-0.4px' }}>
            계정 정보를 입력하세요
          </div>
          <div style={{ fontSize: 13, color: Cs.muted, marginTop: 4 }}>
            * 표시는 필수 입력 항목입니다.
          </div>
        </div>

        <SectionLabel>계정 *</SectionLabel>
        <Fs label="아이디" placeholder="4–20자 영문/숫자" icon={<IcS name="id" size={18}/>}
           helper="사용 가능한 아이디입니다." value="lecture_note"/>
        <Fs label="비밀번호" type="password" placeholder="8자 이상, 영문+숫자+특수문자"
           icon={<IcS name="lock" size={18}/>} suffix={<IcS name="eye-off" size={18}/>}/>
        <Fs label="비밀번호 확인" type="password" placeholder="비밀번호 다시 입력"
           icon={<IcS name="lock" size={18}/>}/>

        <div style={{ height: 6 }}/>
        <SectionLabel>프로필</SectionLabel>
        <Fs label="이름 / 닉네임" placeholder="예: 김도환" icon={<IcS name="user" size={18}/>}/>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
          <Fs label="학교" placeholder="예: 서울과학기술대" icon={<IcS name="school" size={18}/>}/>
          <Fs label="학과" placeholder="경영학과"/>
        </div>

        <div style={{ height: 4 }}/>
        <SectionLabel>약관 동의 *</SectionLabel>

        <AgreeRow>
          <ChkS checked={allAgree} label="전체 동의" onClick={() => { const n = !allAgree; setAgree1(n); setAgree2(n); }}/>
        </AgreeRow>
        <AgreeRow inner>
          <ChkS checked={agree1} label="이용약관 동의 (필수)" onClick={() => setAgree1(s => !s)}/>
          <TLs>보기</TLs>
        </AgreeRow>
        <AgreeRow inner last>
          <ChkS checked={agree2} label="개인정보 처리방침 동의 (필수)" onClick={() => setAgree2(s => !s)}/>
          <TLs>보기</TLs>
        </AgreeRow>

        <div style={{ height: 18 }}/>
        <PBs disabled={!allAgree}>가입하고 시작하기</PBs>
        <div style={{ height: 12 }}/>
      </div>
    </PhS>
  );
}

// 2-스텝 B의 Step 1 (계정 정보)
function SignupB({ nav, onNext } = {}) {
  const go = onNext || (() => nav && nav('signup-step2'));
  return (
    <PhS bg={Cs.bg} statusbar="dark">
      <SubHeader title="회원가입" step="1/2"/>

      {/* 진행도 */}
      <div style={{ padding: '14px 22px 16px', background: '#fff', borderBottom: `1px solid ${Cs.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <StepDot n="1" active />
          <div style={{ flex: 1, height: 2, background: Cs.blue }}/>
          <StepDot n="2"/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: Cs.muted, fontWeight: 600 }}>
          <span style={{ color: Cs.navy }}>① 계정 정보</span>
          <span>② 프로필 · 약관</span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '22px 22px 24px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: Cs.text, letterSpacing: '-0.4px', marginBottom: 4 }}>
          어떤 아이디를 쓰시겠어요?
        </div>
        <div style={{ fontSize: 13.5, color: Cs.muted, marginBottom: 22 }}>
          아이디와 비밀번호만 있으면 시작할 수 있어요.
        </div>

        <Fs label="아이디" placeholder="4–20자 영문/숫자" icon={<IcS name="id" size={18}/>}
           helper="3–20자 영문, 숫자, 밑줄(_) 가능"/>
        <Fs label="이메일" type="email" placeholder="example@email.com" icon={<IcS name="mail" size={18}/>}
           helper="비밀번호 재설정·중요 알림에 사용됩니다"/>
        <Fs label="비밀번호" type="password" placeholder="비밀번호 입력" icon={<IcS name="lock" size={18}/>} suffix={<IcS name="eye" size={18}/>}/>
        <Fs label="비밀번호 확인" type="password" placeholder="비밀번호 다시 입력" icon={<IcS name="lock" size={18}/>}/>

        {/* 비밀번호 안전도 게이지 */}
        <div style={{ marginBottom: 18, marginTop: -4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: Cs.muted, marginBottom: 6 }}>
            <span>비밀번호 안전도</span>
            <span style={{ color: Cs.ok, fontWeight: 700 }}>강함</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <Bar fill={Cs.ok}/><Bar fill={Cs.ok}/><Bar fill={Cs.ok}/><Bar/>
          </div>
        </div>

        <div style={{ flex: 1 }}/>
        <div onClick={go} style={{ cursor: 'pointer' }}>
          <PBs>
            다음 단계로
            <IcS name="arrow-right" size={16} color="#fff"/>
          </PBs>
        </div>
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: Cs.muted }}>
          이미 계정이 있으신가요? <span onClick={() => nav && nav('login')} style={{ color: Cs.navy, fontWeight: 700, cursor: 'pointer' }}>로그인</span>
        </div>
      </div>
    </PhS>
  );
}

// 2-스텝 B의 Step 2 (프로필 + 약관)
function SignupBStep2({ nav, onComplete } = {}) {
  const [agree1, setAgree1] = React.useState(false);
  const [agree2, setAgree2] = React.useState(false);
  const [agree3, setAgree3] = React.useState(false);
  const allAgree = agree1 && agree2;
  const finish = () => onComplete ? onComplete() : nav && nav('main');

  return (
    <PhS bg={Cs.bg} statusbar="dark">
      <SubHeader title="회원가입" step="2/2"/>

      {/* 진행도 - Step 2 활성 */}
      <div style={{ padding: '14px 22px 16px', background: '#fff', borderBottom: `1px solid ${Cs.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <StepDot n={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M5 12l4.5 4.5L19 7"/></svg>} done/>
          <div style={{ flex: 1, height: 2, background: Cs.navy }}/>
          <StepDot n="2" active/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: Cs.muted, fontWeight: 600 }}>
          <span style={{ color: Cs.ok }}>① 계정 정보 ✓</span>
          <span style={{ color: Cs.navy }}>② 프로필 · 약관</span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '22px 22px 24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: Cs.text, letterSpacing: '-0.4px', marginBottom: 4 }}>
          마지막 한 가지만 더요
        </div>
        <div style={{ fontSize: 13.5, color: Cs.muted, marginBottom: 22 }}>
          노트에 표시될 이름과 학교 정보를 알려주세요.
        </div>

        <SectionLabel>프로필</SectionLabel>
        <Fs label="이름 / 닉네임" placeholder="예: 김도환" icon={<IcS name="user" size={18}/>}/>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
          <Fs label="학교" placeholder="예: 서울과학기술대" icon={<IcS name="school" size={18}/>}/>
          <Fs label="학과" placeholder="경영학과"/>
        </div>

        <div style={{ height: 4 }}/>
        <SectionLabel>약관 동의 *</SectionLabel>

        <AgreeRow>
          <ChkS checked={allAgree && agree3} label="전체 동의" onClick={() => {
            const n = !(allAgree && agree3);
            setAgree1(n); setAgree2(n); setAgree3(n);
          }}/>
        </AgreeRow>
        <AgreeRow inner>
          <ChkS checked={agree1} label="이용약관 동의 (필수)" onClick={() => setAgree1(s => !s)}/>
          <TLs>보기</TLs>
        </AgreeRow>
        <AgreeRow inner>
          <ChkS checked={agree2} label="개인정보 처리방침 동의 (필수)" onClick={() => setAgree2(s => !s)}/>
          <TLs>보기</TLs>
        </AgreeRow>
        <AgreeRow inner last>
          <ChkS checked={agree3} label="마케팅 정보 수신 (선택)" onClick={() => setAgree3(s => !s)}/>
          <TLs>보기</TLs>
        </AgreeRow>

        <div style={{ flex: 1, minHeight: 18 }}/>
        <div onClick={() => allAgree && finish()} style={{ cursor: allAgree ? 'pointer' : 'not-allowed' }}>
          <PBs disabled={!allAgree}>가입하고 시작하기</PBs>
        </div>
        <div style={{ height: 8 }}/>
      </div>
    </PhS>
  );
}

// ── Helpers ──────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11.5, fontWeight: 700, color: Cs.navy,
      letterSpacing: '0.1em', textTransform: 'uppercase',
      marginBottom: 10, marginTop: 8 }}>{children}</div>
  );
}
function AgreeRow({ children, inner, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: inner ? '10px 14px' : '14px 14px',
      borderBottom: last ? 'none' : `1px solid ${inner ? Cs.borderSoft : Cs.border}`,
      background: inner ? 'transparent' : Cs.borderSoft,
      borderRadius: inner ? 0 : '12px 12px 0 0',
      marginLeft: inner ? 14 : 0,
      marginRight: inner ? 14 : 0,
      fontSize: 13.5,
    }}>{children}</div>
  );
}
function StepDot({ n, active, done }) {
  return (
    <div style={{
      width: 24, height: 24, borderRadius: '50%',
      background: done ? Cs.ok : active ? Cs.navy : '#fff',
      color: (active || done) ? '#fff' : Cs.muted,
      border: (active || done) ? 'none' : `1.5px solid ${Cs.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11.5, fontWeight: 700, flexShrink: 0,
    }}>{n}</div>
  );
}
function Bar({ fill = Cs.border }) {
  return <div style={{ flex: 1, height: 4, borderRadius: 2, background: fill }}/>;
}

window.SignupScreens = { SignupA, SignupB, SignupBStep2 };

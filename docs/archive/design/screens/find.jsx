// find.jsx — 아이디/비밀번호 찾기 (탭 + 결과)

const { C: Cf, Phone: PhF, Field: Ff, PrimaryButton: PBf, Icon: IcF } = window.LN;

function FindHeader({ title, onBack }) {
  return (
    <div style={{
      height: 52, display: 'flex', alignItems: 'center',
      padding: '0 16px', flexShrink: 0, background: '#fff',
      borderBottom: `1px solid ${Cf.border}`,
    }}>
      <button onClick={onBack} style={{ background:'none', border:'none', padding: 6, marginLeft: -6, cursor:'pointer', color: Cf.text, display: 'flex' }}>
        <IcF name="back" size={22}/>
      </button>
      <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700, letterSpacing: '-0.2px' }}>{title}</div>
      <div style={{ width: 30 }}/>
    </div>
  );
}

// 탭 (아이디 찾기 / 비밀번호 찾기)
function FindTabs({ active, onSwitch }) {
  return (
    <div style={{ display: 'flex', background: '#fff', borderBottom: `1px solid ${Cf.border}` }}>
      {['아이디 찾기', '비밀번호 찾기'].map((t, i) => {
        const on = (i === 0) === (active === 'id');
        return (
          <div key={t} onClick={() => onSwitch && onSwitch(i === 0 ? 'id' : 'pw')} style={{cursor:'pointer',
            flex: 1, textAlign: 'center', padding: '14px 0',
            fontSize: 13.5, fontWeight: on ? 700 : 500,
            color: on ? Cf.navy : Cf.muted,
            borderBottom: on ? `2px solid ${Cf.navy}` : '2px solid transparent',
          }}>{t}</div>
        );
      })}
    </div>
  );
}

// 아이디 찾기 (이메일/등록정보 기반 — 일단 가입 시 입력한 이름 + 학교로 매칭)
function FindId({ nav } = {}) {
  return (
    <PhF bg={Cf.bg} statusbar="dark">
      <FindHeader title="계정 찾기" onBack={() => nav && nav('login')}/>
      <FindTabs active="id" onSwitch={t => nav && nav(t === 'id' ? 'find' : 'find-pw')}/>
      <div style={{ flex: 1, padding: '22px 22px 24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: Cf.text, letterSpacing: '-0.4px' }}>
          아이디를 잊으셨나요?
        </div>
        <div style={{ fontSize: 13, color: Cf.muted, marginTop: 6, marginBottom: 22, lineHeight: 1.55 }}>
          가입할 때 입력한 이름과 학교 정보로<br/>아이디를 찾아드립니다.
        </div>

        <Ff label="이름 / 닉네임" placeholder="가입 시 입력한 이름" icon={<IcF name="user" size={18}/>}/>
        <Ff label="학교" placeholder="예: 서울과학기술대" icon={<IcF name="school" size={18}/>}/>

        <div style={{ flex: 1 }}/>

        <div style={{
          padding: '12px 14px', background: Cf.blueSoft, borderRadius: 10,
          fontSize: 12.5, color: '#1c4787', marginBottom: 16,
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <span style={{ color: Cf.blue, marginTop: 1 }}><IcF name="info" size={15}/></span>
          <div>관리자 문의가 필요한 경우 <span style={{ fontWeight: 700 }}>lecturenote@team9.kr</span> 로 연락 주세요.</div>
        </div>

        <div onClick={() => nav && nav('find-result')} style={{cursor:'pointer'}}><PBf>아이디 찾기</PBf></div>
      </div>
    </PhF>
  );
}

// 비밀번호 찾기 — 아이디 입력하면 가입 시 인증 질문/이메일로 재설정
function FindPw({ nav } = {}) {
  return (
    <PhF bg={Cf.bg} statusbar="dark">
      <FindHeader title="계정 찾기" onBack={() => nav && nav('login')}/>
      <FindTabs active="pw" onSwitch={t => nav && nav(t === 'id' ? 'find' : 'find-pw')}/>
      <div style={{ flex: 1, padding: '22px 22px 24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: Cf.text, letterSpacing: '-0.4px' }}>
          비밀번호를 재설정합니다
        </div>
        <div style={{ fontSize: 13, color: Cf.muted, marginTop: 6, marginBottom: 22, lineHeight: 1.55 }}>
          아이디를 입력하시면 가입 시 등록한 이메일로<br/>임시 비밀번호를 보내드립니다.
        </div>

        <Ff label="아이디" placeholder="아이디 입력" icon={<IcF name="id" size={18}/>}/>

        <div style={{ marginTop: 4 }}>
          <div style={{
            padding: '14px 16px', borderRadius: 12,
            border: `1.5px dashed ${Cf.border}`, background: '#fff',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <IcF name="mail" size={20} color={Cf.muted}/>
            <div style={{ fontSize: 13, color: Cf.muted, lineHeight: 1.5 }}>
              가입 시 입력한 이메일 주소가 자동으로 사용됩니다.
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}/>
        <PBf>임시 비밀번호 받기</PBf>
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12.5, color: Cf.muted }}>
          이메일이 기억나지 않는다면 관리자에게 문의해 주세요.
        </div>
      </div>
    </PhF>
  );
}

// 결과 화면 (아이디 찾기 성공)
function FindIdResult({ nav } = {}) {
  return (
    <PhF bg={Cf.bg} statusbar="dark">
      <FindHeader title="계정 찾기" onBack={() => nav && nav('login')}/>
      <div style={{ flex: 1, padding: '28px 22px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: Cf.okSoft, color: Cf.ok,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: 16, marginBottom: 18,
        }}>
          <IcF name="check" size={32} color={Cf.ok}/>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: Cf.text, letterSpacing: '-0.3px' }}>
          아이디를 찾았어요
        </div>
        <div style={{ fontSize: 13, color: Cf.muted, marginTop: 6, marginBottom: 24 }}>
          가입하신 아이디는 다음과 같습니다.
        </div>

        <div style={{
          width: '100%', padding: '22px 18px', background: '#fff',
          borderRadius: 14, border: `1.5px solid ${Cf.border}`,
          textAlign: 'center', marginBottom: 8,
        }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: Cf.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>아이디</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: Cf.navy, marginTop: 8, letterSpacing: '-0.3px' }}>
            lecture_note_2026
          </div>
          <div style={{ fontSize: 12, color: Cf.muted, marginTop: 6 }}>
            가입일: 2026.03.04
          </div>
        </div>

        <div style={{ flex: 1 }}/>

        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <div onClick={() => nav && nav('find-pw')} style={{flex:1, cursor:'pointer'}}><PBf variant="ghost">비밀번호 찾기</PBf></div>
          <div onClick={() => nav && nav('login')} style={{flex:1, cursor:'pointer'}}><PBf>로그인하러 가기</PBf></div>
        </div>
      </div>
    </PhF>
  );
}

window.FindScreens = { FindId, FindPw, FindIdResult };

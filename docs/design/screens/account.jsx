// account.jsx — 비밀번호 변경, 가입 정보(회원탈퇴), 구독 플랜, 언어 설정

const { C: Ca, Phone: PhA, Field: Fa, PrimaryButton: PBa, Icon: IcA, AppBar: ABa } = window.LN;

// 공통 서브헤더
function AcctHeader({ title, onBack }) {
  return (
    <div style={{
      height: 52, display: 'flex', alignItems: 'center',
      padding: '0 16px', flexShrink: 0, background: '#fff',
      borderBottom: `1px solid ${Ca.border}`,
    }}>
      <button onClick={onBack} style={{ background:'none', border:'none', padding: 6, marginLeft: -6, cursor:'pointer', color: Ca.text, display: 'flex' }}>
        <IcA name="back" size={22}/>
      </button>
      <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700, letterSpacing: '-0.2px' }}>{title}</div>
      <div style={{ width: 30 }}/>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// 비밀번호 변경
// ───────────────────────────────────────────────────────────
function PasswordChange({ nav } = {}) {
  return (
    <PhA bg={Ca.bg} statusbar="dark">
      <AcctHeader title="비밀번호 변경" onBack={() => nav && nav('profile')}/>
      <div style={{ flex: 1, padding: '22px 22px 24px', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: Ca.text, letterSpacing: '-0.4px' }}>
          비밀번호를 새로 설정합니다
        </div>
        <div style={{ fontSize: 13, color: Ca.muted, marginTop: 6, marginBottom: 22, lineHeight: 1.55 }}>
          보안을 위해 6개월마다 변경을 권장합니다.<br/>
          영문, 숫자, 특수문자를 모두 포함해주세요.
        </div>

        <Fa label="현재 비밀번호" type="password" placeholder="현재 비밀번호 입력" icon={<IcA name="lock" size={18}/>} suffix={<IcA name="eye-off" size={18}/>}/>

        <div style={{ height: 8 }}/>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: Ca.navy, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>새 비밀번호</div>

        <Fa label="새 비밀번호" type="password" placeholder="8자 이상" icon={<IcA name="lock" size={18}/>} suffix={<IcA name="eye" size={18}/>}/>

        {/* 안전도 게이지 */}
        <div style={{ marginTop: -8, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: Ca.muted, marginBottom: 6 }}>
            <span>비밀번호 안전도</span>
            <span style={{ color: Ca.warn, fontWeight: 700 }}>보통</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <Bar fill={Ca.ok}/><Bar fill={Ca.warn}/><Bar/><Bar/>
          </div>
        </div>

        <Fa label="새 비밀번호 확인" type="password" placeholder="새 비밀번호 다시 입력" icon={<IcA name="lock" size={18}/>}/>

        {/* 규칙 안내 */}
        <div style={{
          background: '#fff', border: `1px solid ${Ca.border}`, borderRadius: 12,
          padding: '12px 14px', marginTop: 4,
        }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: Ca.textSoft, marginBottom: 8 }}>비밀번호 규칙</div>
          <Rule ok>8자 이상</Rule>
          <Rule ok>영문 포함</Rule>
          <Rule>숫자 포함</Rule>
          <Rule>특수문자 포함 (!@#$%^&*)</Rule>
        </div>

        <div style={{ flex: 1, minHeight: 16 }}/>
        <div onClick={() => nav && nav('profile')} style={{ cursor: 'pointer' }}>
          <PBa>비밀번호 변경</PBa>
        </div>
      </div>
    </PhA>
  );
}

function Rule({ ok, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12,
      color: ok ? Ca.ok : Ca.muted, marginBottom: 4 }}>
      <span style={{
        width: 14, height: 14, borderRadius: '50%',
        background: ok ? Ca.ok : 'transparent',
        border: ok ? 'none' : `1.5px solid ${Ca.border}`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {ok && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round"><path d="M5 12l4.5 4.5L19 7"/></svg>}
      </span>
      {children}
    </div>
  );
}
function Bar({ fill = Ca.border }) {
  return <div style={{ flex: 1, height: 4, borderRadius: 2, background: fill }}/>;
}

// ───────────────────────────────────────────────────────────
// 가입 정보 (+ 회원탈퇴)
// ───────────────────────────────────────────────────────────
function AccountInfo({ nav, onDelete } = {}) {
  const [confirm, setConfirm] = React.useState(false);

  return (
    <PhA bg={Ca.bg} statusbar="dark">
      <AcctHeader title="가입 정보" onBack={() => nav && nav('profile')}/>
      <div style={{ flex: 1, padding: '14px 14px 24px', overflow: 'auto' }}>

        <InfoCard title="계정">
          <InfoRow label="아이디" value="lecture_note_2026"/>
          <InfoRow label="이메일" value="user@example.com" action="변경"/>
          <InfoRow label="가입일" value="2026.03.04"/>
          <InfoRow label="가입 방식" value="아이디/비밀번호" last/>
        </InfoCard>

        <InfoCard title="프로필">
          <InfoRow label="이름" value="김도환" action="편집"/>
          <InfoRow label="학교" value="서울과학기술대학교"/>
          <InfoRow label="학과" value="경영학과" last/>
        </InfoCard>

        <InfoCard title="이용 내역">
          <InfoRow label="등록 강의" value="4개"/>
          <InfoRow label="생성 노트" value="27개"/>
          <InfoRow label="사용 저장공간" value="142 MB / 1 GB" last/>
        </InfoCard>

        {/* 회원탈퇴 영역 */}
        <div style={{ marginTop: 8, padding: '0 4px' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: Ca.err, letterSpacing: '0.08em',
            textTransform: 'uppercase', padding: '8px 14px 6px' }}>위험 영역</div>
        </div>

        <div style={{
          background: '#fff', borderRadius: 14, padding: '14px 16px',
          border: `1px solid ${Ca.err}30`,
        }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: Ca.text, marginBottom: 4 }}>회원탈퇴</div>
          <div style={{ fontSize: 12, color: Ca.muted, lineHeight: 1.55, marginBottom: 12 }}>
            탈퇴 시 등록한 모든 강의·노트·녹음 데이터가 영구히 삭제됩니다.
            이 작업은 되돌릴 수 없습니다.
          </div>
          <button onClick={() => setConfirm(true)} style={{
            width: '100%', height: 44, borderRadius: 10,
            background: '#fff', color: Ca.err,
            border: `1.5px solid ${Ca.err}`,
            fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            <IcA name="user-x" size={16} color={Ca.err}/>
            회원탈퇴 진행
          </button>
        </div>
      </div>

      {/* 탈퇴 확인 모달 */}
      {confirm && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,27,61,0.55)' }} onClick={() => setConfirm(false)}/>
          <div style={{
            position: 'absolute', left: 24, right: 24, top: '50%',
            transform: 'translateY(-50%)',
            background: '#fff', borderRadius: 20, padding: '24px 22px 20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: `${Ca.err}15`, color: Ca.err,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
            }}>
              <IcA name="user-x" size={22}/>
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: Ca.text, letterSpacing: '-0.3px' }}>
              정말 탈퇴하시겠어요?
            </div>
            <div style={{ fontSize: 13, color: Ca.muted, marginTop: 8, lineHeight: 1.55 }}>
              이 작업을 진행하면 다음 데이터가 즉시 삭제되며 복구할 수 없습니다.
            </div>
            <ul style={{ margin: '10px 0 14px', paddingLeft: 18, fontSize: 12.5, color: Ca.textSoft, lineHeight: 1.7 }}>
              <li>등록 강의 <b>4개</b> · 생성 노트 <b>27개</b></li>
              <li>업로드 자료 · 녹음 파일</li>
              <li>구독 플랜 자동 해지</li>
            </ul>
            <div style={{
              padding: '10px 12px', background: Ca.errSoft, borderRadius: 10,
              fontSize: 12, color: '#b8281c', marginBottom: 16,
            }}>
              계속하려면 "<b>탈퇴합니다</b>"를 입력하세요.
            </div>
            <input placeholder="탈퇴합니다" style={{
              width: '100%', height: 44, padding: '0 12px',
              border: `1.5px solid ${Ca.border}`, borderRadius: 10, fontSize: 14,
              marginBottom: 16, outline: 'none',
            }}/>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirm(false)} style={{
                flex: 1, height: 46, borderRadius: 12, background: '#fff', color: Ca.textSoft,
                border: `1.5px solid ${Ca.border}`, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>취소</button>
              <button onClick={() => onDelete ? onDelete() : nav && nav('login')} style={{
                flex: 1.2, height: 46, borderRadius: 12, background: Ca.err, color: '#fff',
                border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>탈퇴 진행</button>
            </div>
          </div>
        </>
      )}
    </PhA>
  );
}

function InfoCard({ title, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {title && (
        <div style={{ fontSize: 11.5, fontWeight: 700, color: Ca.navy,
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
function InfoRow({ label, value, action, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 18px',
      borderBottom: last ? 'none' : `1px solid ${Ca.borderSoft}`,
    }}>
      <div style={{ fontSize: 12.5, color: Ca.muted, width: 90, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, fontSize: 13.5, color: Ca.text, fontWeight: 600, letterSpacing: '-0.1px',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      {action && (
        <button style={{
          border: `1px solid ${Ca.border}`, background: '#fff', color: Ca.textSoft,
          fontSize: 11.5, fontWeight: 600, padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
        }}>{action}</button>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// 구독 플랜
// ───────────────────────────────────────────────────────────
function Subscription({ nav } = {}) {
  const [selected, setSelected] = React.useState('pro');
  return (
    <PhA bg={Ca.bg} statusbar="dark">
      <AcctHeader title="구독 플랜" onBack={() => nav && nav('profile')}/>
      <div style={{ flex: 1, overflow: 'auto', padding: '18px 18px 24px' }}>

        {/* 헤더 */}
        <div style={{ textAlign: 'center', padding: '6px 6px 18px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: `${Ca.warn}20`, color: '#8a5a06',
            padding: '5px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 700,
            marginBottom: 12,
          }}>
            <IcA name="sparkles" size={13}/> PRO로 업그레이드
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: Ca.text, letterSpacing: '-0.4px', lineHeight: 1.25 }}>
            더 많은 강의·더 긴 녹음을<br/>한 번에 정리하세요
          </div>
        </div>

        {/* 현재 플랜 배지 */}
        <div style={{
          background: '#fff', border: `1px solid ${Ca.border}`, borderRadius: 12,
          padding: '12px 14px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: Ca.borderSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: Ca.muted,
          }}>
            <IcA name="check" size={16}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, color: Ca.muted }}>현재 이용 중</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: Ca.text }}>Free 플랜</div>
          </div>
          <div style={{ fontSize: 11.5, color: Ca.muted }}>이번 달 노트 7 / 10</div>
        </div>

        {/* 플랜 카드들 */}
        <PlanCard
          id="free"
          name="Free"
          price="₩0"
          desc="간단한 노트 정리에 충분"
          features={[
            '월 10개 노트 생성',
            '강의 등록 최대 2개',
            '녹음 1회당 30분 제한',
            '기본 STT 모델',
          ]}
          selected={selected === 'free'}
          onSelect={() => setSelected('free')}
          current
        />

        <PlanCard
          id="pro"
          name="Pro"
          price="₩4,900"
          period="/ 월"
          desc="학기 전체를 가볍게"
          highlight
          features={[
            '월 100개 노트 생성',
            '강의 등록 무제한',
            '녹음 1회 3시간까지',
            'Gemini 2.5 Pro 우선 처리',
            'PDF·HTML 무제한 내보내기',
          ]}
          selected={selected === 'pro'}
          onSelect={() => setSelected('pro')}
        />

        <PlanCard
          id="team"
          name="Team"
          price="₩12,000"
          period="/ 월 (5인)"
          desc="스터디 그룹·연구실용"
          features={[
            'Pro 모든 기능',
            '강의·노트 공유 워크스페이스',
            '관리자 대시보드',
            '우선 기술지원',
          ]}
          selected={selected === 'team'}
          onSelect={() => setSelected('team')}
        />

        <div style={{ height: 14 }}/>
        <div onClick={() => nav && nav('profile')} style={{ cursor: 'pointer' }}>
          <PBa disabled={selected === 'free'}>
            {selected === 'free' ? '현재 플랜 유지' :
             selected === 'pro' ? 'Pro 시작하기 · 월 ₩4,900' :
                                  'Team 시작하기 · 월 ₩12,000'}
          </PBa>
        </div>
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11.5, color: Ca.muted, lineHeight: 1.6 }}>
          7일 무료 체험 · 언제든 해지 가능<br/>
          결제 후 즉시 이용 가능합니다.
        </div>
      </div>
    </PhA>
  );
}

function PlanCard({ id, name, price, period, desc, features, selected, onSelect, highlight, current }) {
  return (
    <div onClick={onSelect} style={{
      background: highlight && selected ? Ca.navy : '#fff',
      color: highlight && selected ? '#fff' : Ca.text,
      border: selected ? `2px solid ${highlight ? Ca.navy : Ca.blue}` : `1.5px solid ${Ca.border}`,
      borderRadius: 14, padding: '14px 16px', marginBottom: 10, cursor: 'pointer',
      position: 'relative', transition: 'all 0.15s',
      boxShadow: selected ? '0 4px 16px rgba(26,45,94,0.18)' : 'none',
    }}>
      {highlight && (
        <div style={{
          position: 'absolute', top: -10, right: 14,
          background: Ca.warn, color: '#fff', fontSize: 10.5, fontWeight: 800,
          padding: '3px 9px', borderRadius: 20, letterSpacing: '0.04em',
        }}>인기</div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 6 }}>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.2px' }}>{name}</div>
        {current && (
          <div style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
            background: highlight && selected ? 'rgba(255,255,255,0.18)' : Ca.borderSoft,
            color: highlight && selected ? '#fff' : Ca.muted,
          }}>현재</div>
        )}
        <div style={{ flex: 1 }}/>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.4px' }}>{price}</div>
        {period && (
          <div style={{ fontSize: 11.5, opacity: 0.7, marginBottom: 2 }}>{period}</div>
        )}
      </div>
      <div style={{ fontSize: 12, opacity: 0.72, marginBottom: 10 }}>{desc}</div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 12.5, lineHeight: 1.7 }}>
        {features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 2 }}>
            <span style={{ color: highlight && selected ? Ca.blue : Ca.ok, marginTop: 3, flexShrink: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12l4.5 4.5L19 7"/></svg>
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// 언어 설정
// ───────────────────────────────────────────────────────────
function LanguageSettings({ nav } = {}) {
  const [lang, setLang] = React.useState('ko');
  const langs = [
    { id: 'ko', name: '한국어', sub: 'Korean', flag: '🇰🇷' },
    { id: 'en', name: 'English', sub: '영어', flag: '🇺🇸' },
    { id: 'ja', name: '日本語', sub: '일본어', flag: '🇯🇵' },
    { id: 'zh', name: '中文 (简体)', sub: '중국어 (간체)', flag: '🇨🇳' },
  ];
  return (
    <PhA bg={Ca.bg} statusbar="dark">
      <AcctHeader title="언어 설정" onBack={() => nav && nav('profile')}/>
      <div style={{ flex: 1, padding: '14px 14px 24px', overflow: 'auto' }}>

        <div style={{
          padding: '12px 14px', background: Ca.blueSoft, borderRadius: 10,
          fontSize: 12, color: '#1c4787', marginBottom: 14,
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <span style={{ color: Ca.blue, marginTop: 1 }}><IcA name="info" size={15}/></span>
          <div>인터페이스 언어를 변경합니다. 생성된 노트의 언어는 강의 자료를 따릅니다.</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 12px rgba(16,24,40,0.04)' }}>
          {langs.map((l, i) => (
            <div key={l.id} onClick={() => setLang(l.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 18px',
              borderBottom: i === langs.length - 1 ? 'none' : `1px solid ${Ca.borderSoft}`,
              cursor: 'pointer',
              background: lang === l.id ? Ca.blueSoft : '#fff',
            }}>
              <div style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{l.flag}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: Ca.text, letterSpacing: '-0.1px' }}>{l.name}</div>
                <div style={{ fontSize: 11.5, color: Ca.muted, marginTop: 1 }}>{l.sub}</div>
              </div>
              {lang === l.id && (
                <span style={{ color: Ca.blue }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12l4.5 4.5L19 7"/></svg>
                </span>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 10, fontSize: 11.5, color: Ca.muted, textAlign: 'center' }}>
          더 많은 언어가 곧 추가될 예정입니다.
        </div>
      </div>
    </PhA>
  );
}

window.AccountScreens = { PasswordChange, AccountInfo, Subscription, LanguageSettings };

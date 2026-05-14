// shared.jsx — 모바일 셸 + 공통 컴포넌트

const C = {
  navy: '#1A2D5E',
  navyDeep: '#0F1B3D',
  navySoft: '#243A6E',
  blue: '#4B82C5',
  blueSoft: '#E8EFFA',
  hover: '#3A6FB5',
  ok: '#22C55E',
  okSoft: '#E7F8EE',
  err: '#E74C3C',
  errSoft: '#FDECEA',
  warn: '#F59E0B',
  warnSoft: '#FEF4DD',
  text: '#1C1C1E',
  textSoft: '#3F3F44',
  muted: '#6E6E73',
  border: '#E5E7EB',
  borderSoft: '#F0F2F7',
  bg: '#F5F5F7',
  surface: '#FFFFFF',
};

// 폰 셸: 430×900 — 디자인 캔버스 아트보드 안에 그대로 들어감
function Phone({ children, bg = C.bg, statusbar = 'light', label }) {
  return (
    <div style={{
      width: 430, height: 900, background: bg,
      display: 'flex', flexDirection: 'column',
      fontFamily: '"Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: C.text, fontSize: 15, lineHeight: 1.5, overflow: 'hidden',
      position: 'relative',
    }}>
      <PhoneStatusBar tint={statusbar} />
      {children}
    </div>
  );
}

function PhoneStatusBar({ tint = 'light' }) {
  const c = tint === 'light' ? '#fff' : '#0F1B3D';
  return (
    <div style={{
      height: 36, flexShrink: 0, padding: '0 22px 0 22px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      color: c, fontSize: 14, fontWeight: 600, letterSpacing: '-0.2px',
    }}>
      <span>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {/* signal */}
        <svg width="16" height="11" viewBox="0 0 16 11">
          <rect x="0"  y="7" width="3" height="3.5" rx="0.5" fill={c}/>
          <rect x="4"  y="5" width="3" height="5.5" rx="0.5" fill={c}/>
          <rect x="8"  y="3" width="3" height="7.5" rx="0.5" fill={c}/>
          <rect x="12" y="1" width="3" height="9.5" rx="0.5" fill={c}/>
        </svg>
        {/* wifi */}
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
          <path d="M7 8.5 a1.2 1.2 0 1 1 .001 0z" fill={c}/>
          <path d="M2.5 5.3a6 6 0 0 1 9 0" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M.5 2.7a9 9 0 0 1 13 0" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        {/* battery */}
        <svg width="24" height="11" viewBox="0 0 24 11">
          <rect x="0.5" y="0.5" width="20" height="10" rx="2.5" fill="none" stroke={c} opacity="0.55"/>
          <rect x="21.5" y="3.5" width="1.5" height="4" rx="0.5" fill={c} opacity="0.55"/>
          <rect x="2" y="2" width="17" height="7" rx="1.5" fill={c}/>
        </svg>
      </div>
    </div>
  );
}

// 앱 로고 (LectureNote 책자 마크)
function LectureLogo({ size = 48, accent = '#4B82C5' }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size}>
      <rect width="48" height="48" rx="11" fill="#1A2D5E"/>
      <path d="M12 32 L12 14 L23 14 L23 32 Z" fill={accent}/>
      <path d="M25 32 L25 14 L36 14 L36 32 Z" fill="#fff"/>
      <rect x="14.5" y="17.5" width="6.5" height="1.2" fill="#fff" opacity="0.65"/>
      <rect x="14.5" y="20.5" width="5.5" height="1.2" fill="#fff" opacity="0.65"/>
      <rect x="14.5" y="23.5" width="6"   height="1.2" fill="#fff" opacity="0.65"/>
      <rect x="27.5" y="17.5" width="6.5" height="1.2" fill="#1A2D5E"/>
      <rect x="27.5" y="20.5" width="5.5" height="1.2" fill="#6E6E73"/>
      <rect x="27.5" y="23.5" width="6"   height="1.2" fill="#6E6E73"/>
    </svg>
  );
}

// 입력 필드 (라벨 + 인풋, 라이트/다크 인풋)
function Field({ label, type = 'text', placeholder, value = '', icon, suffix, error, helper, autoFocus, dark = false, monospace = false }) {
  const [focus, setFocus] = React.useState(autoFocus);
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600,
          color: dark ? 'rgba(255,255,255,.78)' : C.textSoft,
          marginBottom: 6, letterSpacing: '-0.1px' }}>{label}</label>
      )}
      <div style={{
        position: 'relative',
        display: 'flex', alignItems: 'center',
        background: '#fff',
        border: `1.5px solid ${error ? C.err : focus ? C.blue : C.border}`,
        borderRadius: 12,
        boxShadow: focus ? '0 0 0 3px rgba(75,130,197,0.16)' : 'none',
        transition: 'all 0.15s',
        padding: '0 14px',
        height: 50,
      }}>
        {icon && (
          <span style={{ color: C.muted, marginRight: 10, display: 'flex' }}>{icon}</span>
        )}
        <input
          type={type}
          defaultValue={value}
          placeholder={placeholder}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 15, color: C.text,
            fontFamily: monospace ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
            height: '100%',
          }}/>
        {suffix && <span style={{ color: C.muted, marginLeft: 8 }}>{suffix}</span>}
      </div>
      {error && (
        <div style={{ fontSize: 12, color: C.err, marginTop: 5, fontWeight: 500 }}>{error}</div>
      )}
      {!error && helper && (
        <div style={{ fontSize: 12, color: C.muted, marginTop: 5 }}>{helper}</div>
      )}
    </div>
  );
}

// 메인 CTA 버튼
function PrimaryButton({ children, disabled, style, variant = 'navy' }) {
  const bg = variant === 'navy' ? C.navy : variant === 'blue' ? C.blue : variant === 'ghost' ? 'transparent' : C.navy;
  const fg = variant === 'ghost' ? C.navy : '#fff';
  return (
    <button style={{
      width: '100%', height: 52, borderRadius: 14,
      background: disabled ? '#9CA3AF' : bg,
      color: fg,
      border: variant === 'ghost' ? `1.5px solid ${C.border}` : 'none',
      fontSize: 15, fontWeight: 700, letterSpacing: '-0.2px',
      cursor: 'pointer',
      boxShadow: variant === 'ghost' ? 'none' : '0 4px 12px rgba(26,45,94,0.18)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      ...style,
    }}>{children}</button>
  );
}

// 체크박스
function Check({ checked, label, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
      <div style={{
        width: 20, height: 20, borderRadius: 6,
        border: `1.5px solid ${checked ? C.navy : C.border}`,
        background: checked ? C.navy : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l4.5 4.5L19 7"/>
          </svg>
        )}
      </div>
      <span style={{ fontSize: 13.5, color: C.textSoft }}>{label}</span>
    </div>
  );
}

// 작은 텍스트 링크
function TextLink({ children, color = C.muted, weight = 500 }) {
  return (
    <span style={{ color, fontSize: 13, fontWeight: weight, cursor: 'pointer', letterSpacing: '-0.1px' }}>{children}</span>
  );
}

// 앱바 (메인 앱 컨텍스트용)
function AppBar({ title = '강의 등록', user = null, onUserClick }) {
  return (
    <header style={{
      background: C.navy, height: 56, padding: '0 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.18)', flexShrink: 0,
    }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, overflow: 'hidden' }}>
        <LectureLogo size={30}/>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.2px' }}>
        Lecture<span style={{ color: C.blue }}>Note</span>
      </div>
      <div style={{ marginLeft: 'auto', fontSize: 11.5, color: 'rgba(255,255,255,0.62)', fontWeight: 500 }}>
        {title}
      </div>
      <button onClick={onUserClick} style={{
        marginLeft: 4, width: 34, height: 34, borderRadius: 17,
        background: user ? C.blue : 'rgba(255,255,255,0.12)',
        border: user ? '2px solid rgba(255,255,255,0.28)' : 'none',
        color: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700,
      }}>
        {user ? user[0] : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>
          </svg>
        )}
      </button>
    </header>
  );
}

// 하단 네비
function BottomNav({ active = 't0' }) {
  const items = [
    { id: 't0', label: '강의 등록', icon: (<><rect x="6" y="5" width="12" height="16" rx="2"/><rect x="9" y="3" width="6" height="3.5" rx="1"/><path d="M9 11h6M9 14h6M9 17h4"/></>) },
    { id: 'tn', label: '노트 생성', icon: (<path d="M4 20l3.5-.7L19 7.8a2 2 0 0 0 0-2.8l-.5-.5a2 2 0 0 0-2.8 0L4.7 16 4 20z"/>) },
    { id: 'th', label: '노트 조회', icon: (<><rect x="4" y="4" width="4" height="16" rx="1"/><rect x="10" y="4" width="4" height="16" rx="1"/><rect x="16" y="4" width="4" height="16" rx="1"/></>) },
  ];
  return (
    <nav style={{
      height: 72, background: '#fff', borderTop: `1px solid ${C.border}`,
      display: 'flex', flexShrink: 0, paddingBottom: 8,
      boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
    }}>
      {items.map(it => (
        <button key={it.id} style={{
          flex: 1, background: 'none', border: 'none',
          color: active === it.id ? C.blue : C.muted,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 3, cursor: 'pointer',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{it.icon}</svg>
          <span style={{ fontSize: 10.5, fontWeight: active === it.id ? 700 : 500, letterSpacing: '-0.1px' }}>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}

// 작은 라벨 + 굵은 헤더 텍스트 ("로그인 / 회원가입" 등)
function ScreenTitle({ kicker, title, sub, color = '#fff' }) {
  return (
    <div>
      {kicker && (
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)',
          textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{kicker}</div>
      )}
      <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: '-0.6px', lineHeight: 1.15 }}>{title}</div>
      {sub && (
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.62)', marginTop: 8, lineHeight: 1.55 }}>{sub}</div>
      )}
    </div>
  );
}

// 아이콘 헬퍼
function Icon({ name, size = 18, color = 'currentColor' }) {
  const paths = {
    user:  <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></>,
    lock:  <><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></>,
    eye:   <><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></>,
    'eye-off': <><path d="M9.9 5.1A10.5 10.5 0 0 1 12 5c7 0 11 7 11 7a17.4 17.4 0 0 1-3.2 4.1M6.5 6.8C3 9 1 12 1 12s4 7 11 7c2 0 3.7-.5 5.2-1.3M3 3l18 18"/></>,
    mail:  <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></>,
    id:    <><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="12" r="2.5"/><path d="M14 10h5M14 13h4M5 17c.7-1.5 2.2-2.5 4-2.5s3.3 1 4 2.5"/></>,
    school:<><path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11v5c0 1 3 3 6 3s6-2 6-3v-5"/><path d="M22 9v5"/></>,
    moon:  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>,
    sun:   <><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></>,
    logout:<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></>,
    settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    bell:  <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></>,
    globe: <><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></>,
    crown: <><path d="M3 8l4 4 5-7 5 7 4-4-1 11H4z" strokeLinejoin="round"/><path d="M4 19h16"/></>,
    sparkles: <><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z"/></>,
    'user-x':<><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-7 7-7s7 3 7 7"/><path d="M16 5l5 5M21 5l-5 5"/></>,
    chevron:<path d="M9 6l6 6-6 6"/>,
    back: <path d="M19 12H5M11 6l-6 6 6 6"/>,
    info: <><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></>,
    check:<path d="M5 12l4.5 4.5L19 7"/>,
    'arrow-right':<path d="M5 12h14M13 6l6 6-6 6"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || null}
    </svg>
  );
}

window.LN = { C, Phone, PhoneStatusBar, LectureLogo, Field, PrimaryButton, Check, TextLink, AppBar, BottomNav, ScreenTitle, Icon };

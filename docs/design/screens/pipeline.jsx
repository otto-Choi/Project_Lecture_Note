// pipeline.jsx — Gemini API 호출 단계별 진행 표시 (3 변주)

const { C: Cl, Phone: PhL, Icon: IcL } = window.LN;

// 공통: 로딩 마스크 컨테이너
function LoadingMask({ children }) {
  return (
    <PhL bg={Cl.bg} statusbar="light">
      <div style={{ height: 56, background: Cl.navy, padding: '0 16px',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: Cl.navySoft }}/>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Lecture<span style={{ color: Cl.blue }}>Note</span></div>
        <div style={{ marginLeft: 'auto', fontSize: 11.5, color: 'rgba(255,255,255,0.62)' }}>노트 생성</div>
      </div>
      <div style={{ flex: 1, padding: '14px 14px', overflow: 'hidden', opacity: 0.4 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, height: 110 }}/>
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, height: 140 }}/>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,27,61,0.62)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        {children}
      </div>
    </PhL>
  );
}

// ───────────────────────────────────────────────────────────
// A안. 개선된 스텝리스트 — 각 단계마다 상태 텍스트(서브) + 경과 시간
// ───────────────────────────────────────────────────────────
function PipelineA({ nav } = {}) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1200);
    return () => clearInterval(id);
  }, []);
  const phase = Math.min(4, Math.floor(tick / 2));
  React.useEffect(() => { if (phase >= 4) setTimeout(() => nav && nav('main'), 1500); }, [phase, nav]);

  const stepDefs = [
    { label: '강의 정보 불러오기', done: '완료 · 1.2s', active: 'DB 조회 중...' },
    { label: 'PDF 분석', done: '24장 추출 완료 · 3.4s', active: '24장 텍스트 추출 중...' },
    { label: '수업 녹음 분석', done: '완료 · 14.8s', active: 'Gemini STT 처리 중... 47%' },
    { label: '소스 통합 · 노트 생성', done: '완료 · 41.2s', active: 'Gemini 응답 스트리밍 중...' },
    { label: '저장 및 마무리', done: '완료', active: 'DB 저장 중...' },
  ];
  const steps = stepDefs.map((d, i) => ({
    label: d.label,
    sub: i < phase ? d.done : i === phase ? d.active : '대기 중',
    state: i < phase ? 'done' : i === phase ? 'active' : 'pending',
  }));
  return (
    <LoadingMask>
      <div style={{ background: '#fff', borderRadius: 22, padding: '24px 22px 20px',
        width: '100%', maxWidth: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: Cl.navy,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', flexShrink: 0,
          }}>
            <Spinner/>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: Cl.navy, letterSpacing: '-0.2px' }}>노트 생성 중</div>
            <div style={{ fontSize: 12.5, color: Cl.muted, marginTop: 1 }}>잠시만요 — 최대 3분 정도 걸려요.</div>
          </div>
        </div>

        {/* 단계 리스트 */}
        <div style={{ background: '#fafbfd', borderRadius: 14, padding: '14px 14px' }}>
          {steps.map((s, i) => (
            <StepRow key={i} {...s} last={i === steps.length - 1}/>
          ))}
        </div>

        {/* 경과 시간 */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 14, fontSize: 11.5, color: Cl.muted,
        }}>
          <span>경과 {Math.floor(tick * 1.2)}초</span>
          <span>· {phase} / 5 완료</span>
        </div>
      </div>
    </LoadingMask>
  );
}

function StepRow({ label, sub, state, last }) {
  const colorMap = {
    done: Cl.ok,
    active: Cl.blue,
    pending: Cl.border,
  };
  const stateColor = colorMap[state];
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start',
      paddingBottom: last ? 0 : 10, marginBottom: last ? 0 : 10,
      position: 'relative' }}>
      {/* 연결선 */}
      {!last && (
        <div style={{ position: 'absolute', left: 9, top: 22, bottom: -2,
          width: 1.5, background: state === 'done' ? Cl.ok : Cl.border }}/>
      )}
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        background: state === 'done' ? Cl.ok : state === 'active' ? '#fff' : '#fff',
        border: state === 'pending' ? `1.5px solid ${Cl.border}`
              : state === 'active' ? `1.5px solid ${Cl.blue}`
              : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, position: 'relative', zIndex: 1,
      }}>
        {state === 'done' && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><path d="M5 12l4.5 4.5L19 7"/></svg>
        )}
        {state === 'active' && (
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: Cl.blue,
            animation: 'step-pulse 1s infinite' }}/>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, marginTop: -2 }}>
        <div style={{ fontSize: 13, fontWeight: state === 'active' ? 700 : state === 'done' ? 600 : 500,
          color: state === 'pending' ? Cl.muted : state === 'done' ? Cl.ok : Cl.navy,
          letterSpacing: '-0.1px' }}>{label}</div>
        <div style={{ fontSize: 11.5, color: state === 'active' ? Cl.blue : Cl.muted, marginTop: 2 }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// B안. 진행률 바 + 실시간 청크 미리보기 (Gemini 스트리밍 가시화)
// ───────────────────────────────────────────────────────────
function PipelineB() {
  return (
    <LoadingMask>
      <div style={{ background: '#fff', borderRadius: 22, padding: '22px 22px 20px',
        width: '100%', maxWidth: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: Cl.navy }}>노트 생성 중</div>
          <div style={{ fontSize: 11.5, color: Cl.muted }}>3 / 5 단계</div>
        </div>

        {/* 진행 바 (5개 세그먼트) */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          <Seg fill={Cl.ok}/><Seg fill={Cl.ok}/><Seg fill={Cl.blue} partial/><Seg/><Seg/>
        </div>

        {/* 현재 단계 카드 */}
        <div style={{
          background: Cl.blueSoft, border: `1.5px solid ${Cl.blue}30`,
          borderRadius: 12, padding: '12px 14px', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, background: Cl.blue,
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Spinner/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: Cl.navy }}>Gemini로 노트 생성 중</div>
            <div style={{ fontSize: 11.5, color: '#1c4787', marginTop: 1 }}>현재 1,247 / 약 3,000 토큰</div>
          </div>
        </div>

        {/* 스트리밍 미리보기 — 진짜 글자가 흘러나오는 것처럼 */}
        <div style={{
          background: '#0F1B3D', borderRadius: 10, padding: '12px 14px',
          fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11.5, color: '#7DD3C0',
          minHeight: 92, lineHeight: 1.55, position: 'relative', overflow: 'hidden',
        }}>
          <span style={{ color: '#A1C4E0' }}>## 3주차 · 동기부여 이론</span><br/>
          <span style={{ color: '#cfe8f5' }}>핵심 개념: Maslow 욕구계층, Herzberg</span><br/>
          <span style={{ color: '#cfe8f5' }}>이요인 이론, McClelland 성취동기...</span>
          <span style={{ display: 'inline-block', width: 7, height: 14, background: Cl.blue,
            marginLeft: 2, verticalAlign: 'middle', animation: 'cursor-blink 1s infinite' }}/>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between',
          marginTop: 12, fontSize: 11.5, color: Cl.muted }}>
          <span>경과 0:54</span>
          <span style={{ color: Cl.muted }}>예상 1분 더</span>
        </div>
      </div>
    </LoadingMask>
  );
}

function Seg({ fill = Cl.border, partial }) {
  return (
    <div style={{ flex: 1, height: 6, borderRadius: 3,
      background: Cl.border, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, width: partial ? '55%' : '100%',
        background: fill, borderRadius: 3, transition: 'width 0.3s' }}/>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// C안. 컴팩트 가로 칩 — 화면을 덜 가리는 미니멀 진행 표시
// ───────────────────────────────────────────────────────────
function PipelineC() {
  return (
    <PhL bg={Cl.bg} statusbar="light">
      <div style={{ height: 56, background: Cl.navy, padding: '0 16px',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: Cl.navySoft }}/>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Lecture<span style={{ color: Cl.blue }}>Note</span></div>
        <div style={{ marginLeft: 'auto', fontSize: 11.5, color: 'rgba(255,255,255,0.62)' }}>노트 생성</div>
      </div>

      {/* 진행 바 (얇게, 상단 sticky) */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${Cl.border}`, padding: '12px 14px' }}>
        {/* 진행 칩 줄 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          <Chip label="강의 정보" state="done"/>
          <ChipLink done/>
          <Chip label="PDF 분석" state="done"/>
          <ChipLink done/>
          <Chip label="STT" state="active" pct="47%"/>
          <ChipLink/>
          <Chip label="노트 생성" state="pending"/>
          <ChipLink/>
          <Chip label="저장" state="pending"/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10,
          fontSize: 11.5, color: Cl.muted }}>
          <span><span style={{ color: Cl.blue, fontWeight: 700 }}>STT 처리 중</span> · 47% 완료</span>
          <span>1:24 / 예상 3:00</span>
        </div>
      </div>

      {/* 본문은 그대로 살아있음 - 사용자가 이전 화면 그대로 볼 수 있음 */}
      <div style={{ flex: 1, padding: '14px 14px', overflow: 'auto' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
          boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 12px rgba(16,24,40,0.04)' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: Cl.navy }}>선택됨: 조직행동론</div>
          <div style={{ marginTop: 10, padding: '10px 12px', background: Cl.okSoft, borderRadius: 10,
            fontSize: 12.5, color: '#157a45', display: 'flex', alignItems: 'center', gap: 8 }}>
            <IcL name="check" size={14} color={Cl.ok}/> 3주차 강의 자료 업로드 완료
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 16,
          boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 12px rgba(16,24,40,0.04)' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: Cl.navy, marginBottom: 8 }}>지금 진행되는 작업</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <MiniRow label="강의 정보" sub="조직행동론 3주차" state="done"/>
            <MiniRow label="PDF 분석" sub="24장 · 8,420자 추출" state="done"/>
            <MiniRow label="음성 → 텍스트 (Gemini)" sub="47% · 약 2분 남음" state="active"/>
            <MiniRow label="소스 통합 노트 생성" sub="대기 중" state="pending"/>
            <MiniRow label="DB 저장" sub="대기 중" state="pending"/>
          </div>
        </div>
      </div>
    </PhL>
  );
}

function Chip({ label, state, pct }) {
  const map = {
    done: { bg: Cl.okSoft, fg: '#157a45', dot: Cl.ok },
    active: { bg: Cl.blueSoft, fg: '#1c4787', dot: Cl.blue },
    pending: { bg: Cl.borderSoft, fg: Cl.muted, dot: Cl.border },
  };
  const s = map[state];
  return (
    <div style={{
      flexShrink: 0,
      padding: '6px 10px 6px 8px', borderRadius: 16, background: s.bg, color: s.fg,
      fontSize: 11.5, fontWeight: 700, letterSpacing: '-0.1px',
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot,
        animation: state === 'active' ? 'cursor-blink 1s infinite' : 'none', display: 'inline-block' }}/>
      {label}
      {pct && <span style={{ marginLeft: 2, opacity: 0.85 }}>· {pct}</span>}
    </div>
  );
}
function ChipLink({ done }) {
  return <div style={{ flexShrink: 0, width: 8, height: 1.5, background: done ? Cl.ok : Cl.border }}/>;
}
function MiniRow({ label, sub, state }) {
  const colorMap = { done: Cl.ok, active: Cl.blue, pending: Cl.muted };
  const c = colorMap[state];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
      background: state === 'active' ? Cl.blueSoft : 'transparent',
      borderRadius: 10 }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        background: state === 'done' ? Cl.ok : '#fff',
        border: state !== 'done' ? `1.5px solid ${c}` : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {state === 'done' && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><path d="M5 12l4.5 4.5L19 7"/></svg>
        )}
        {state === 'active' && (
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: Cl.blue,
            animation: 'step-pulse 1s infinite' }}/>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: state === 'active' ? 700 : 600,
          color: state === 'pending' ? Cl.muted : state === 'done' ? '#157a45' : Cl.navy,
          letterSpacing: '-0.1px' }}>{label}</div>
        <div style={{ fontSize: 11, color: state === 'active' ? '#1c4787' : Cl.muted, marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5"/>
      <path d="M12 3a9 9 0 0 1 9 9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite"/>
      </path>
    </svg>
  );
}

window.PipelineScreens = { PipelineA, PipelineB, PipelineC };

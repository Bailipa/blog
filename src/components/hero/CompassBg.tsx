const CX = 1000
const CY = 450
const GOLD = '#f5c71a'

const ringRadii = [320, 280, 245, 215, 190, 160, 135]
const outerRadii = [340, 355, 370, 385, 400]

export default function CompassBg() {
  return (
    <div className="compass-bg">
      <div className="compass-bg-perspective">
        <div className="compass-bg-inner">
          <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
            <defs>
              <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
                <stop offset="40%" stopColor={GOLD} stopOpacity={0.15} />
                <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
              </radialGradient>
            </defs>
            <circle cx={CX} cy={CY} r={120} fill="url(#bgGlow)" />
            {outerRadii.map((r, i) => (
              <circle key={`o${i}`}
                cx={CX} cy={CY} r={r} fill="none" stroke={GOLD}
                strokeWidth={0.5 - i * 0.05} opacity={0.18 - i * 0.03}
              />
            ))}
            {ringRadii.map((r, i) => (
              <circle key={`r${i}`}
                cx={CX} cy={CY} r={r} fill="none" stroke={GOLD}
                strokeWidth={3.5 - i * 0.4} opacity={0.7 - i * 0.05}
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  )
}

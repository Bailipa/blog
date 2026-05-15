const CX = 1000
const CY = 450
const GOLD_BRIGHT = '#f5c71a'

export default function AxialDots() {
  return (
    <g filter="url(#glow)" opacity="0.7">
      <circle cx={CX} cy={130} r="3.5" fill={GOLD_BRIGHT} />
      <circle cx={CX} cy={770} r="3.5" fill={GOLD_BRIGHT} />
      <circle cx={CX} cy={170} r="3" fill={GOLD_BRIGHT} />
      <circle cx={CX} cy={730} r="3" fill={GOLD_BRIGHT} />
      <circle cx={CX} cy={210} r="2.5" fill={GOLD_BRIGHT} />
      <circle cx={CX} cy={690} r="2.5" fill={GOLD_BRIGHT} />
      <circle cx={1320} cy={CY} r="3.5" fill={GOLD_BRIGHT} />
      <circle cx={680} cy={CY} r="3.5" fill={GOLD_BRIGHT} />
      <circle cx={1280} cy={CY} r="3" fill={GOLD_BRIGHT} />
      <circle cx={720} cy={CY} r="3" fill={GOLD_BRIGHT} />
      <circle cx={1240} cy={CY} r="2.5" fill={GOLD_BRIGHT} />
      <circle cx={760} cy={CY} r="2.5" fill={GOLD_BRIGHT} />
      <circle cx={1226} cy={224} r="2" fill={GOLD_BRIGHT} opacity="0.5" />
      <circle cx={1226} cy={676} r="2" fill={GOLD_BRIGHT} opacity="0.5" />
      <circle cx={774} cy={676} r="2" fill={GOLD_BRIGHT} opacity="0.5" />
      <circle cx={774} cy={224} r="2" fill={GOLD_BRIGHT} opacity="0.5" />
    </g>
  )
}

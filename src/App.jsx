import { useState, useEffect, useCallback, useRef } from "react";

const COLORS = ["#E63946", "#457B9D", "#2A9D8F", "#E76F51", "#7B2D8E"];
const COLOR_NAMES = ["Red", "Blue", "Teal", "Orange", "Purple"];
const HARMONIC_LABELS = [
  "1st Harmonic (Fundamental)",
  "2nd Harmonic",
  "3rd Harmonic",
  "4th Harmonic",
  "5th Harmonic",
];

const WAVE_TYPES = {
  square: {
    name: "Square Wave",
    formula: "f(x) = (4/π) Σ [sin((2k-1)x) / (2k-1)]  for k = 1, 2, 3, …",
    coefficients: (n) => (n % 2 === 1 ? 4 / (Math.PI * n) : 0),
    fn: (x) => (((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) < Math.PI ? 1 : -1),
  },
  sawtooth: {
    name: "Sawtooth Wave",
    formula: "f(x) = (2/π) Σ [(-1)^(n+1) sin(nx) / n]  for n = 1, 2, 3, …",
    coefficients: (n) => (2 / (Math.PI * n)) * Math.pow(-1, n + 1),
    fn: (x) => {
      const p = ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      return (p / Math.PI) - 1;
    },
  },
  triangle: {
    name: "Triangle Wave",
    formula: "f(x) = (8/π²) Σ [(-1)^k sin((2k+1)x) / (2k+1)²]  for k = 0, 1, 2, …",
    coefficients: (n) => {
      if (n % 2 === 0) return 0;
      const k = (n - 1) / 2;
      return (8 / (Math.PI * Math.PI * n * n)) * Math.pow(-1, k);
    },
    fn: (x) => {
      const p = ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (p < Math.PI / 2) return (2 * p) / Math.PI;
      if (p < (3 * Math.PI) / 2) return 2 - (2 * p) / Math.PI;
      return (2 * p) / Math.PI - 4;
    },
  },
};

const NUM_POINTS = 500;

function generateXValues() {
  const xs = [];
  for (let i = 0; i <= NUM_POINTS; i++) {
    xs.push((i / NUM_POINTS) * 2 * Math.PI);
  }
  return xs;
}

const X_VALUES = generateXValues();

function Graph({ title, datasets, yRange, width, height, showLegend, legendItems, showTarget }) {
  const padding = { top: 40, right: 24, bottom: 44, left: 52 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const [yMin, yMax] = yRange;

  const toSVGX = (x) => padding.left + (x / (2 * Math.PI)) * plotW;
  const toSVGY = (y) => padding.top + ((yMax - y) / (yMax - yMin)) * plotH;

  const xTicks = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, 2 * Math.PI];
  const xLabels = ["0", "π/2", "π", "3π/2", "2π"];
  const yTicks = [];
  for (let v = yMin; v <= yMax; v += 0.5) {
    yTicks.push(Math.round(v * 10) / 10);
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <svg width={width} height={height} style={{ display: "block", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
        {/* Background */}
        <rect x={padding.left} y={padding.top} width={plotW} height={plotH} fill="#0D1117" rx={4} />

        {/* Title */}
        <text x={width / 2} y={24} textAnchor="middle" fill="#C9D1D9" fontSize={15} fontWeight={600}>
          {title}
        </text>

        {/* Grid lines */}
        {xTicks.map((xv, i) => (
          <line key={`xg${i}`} x1={toSVGX(xv)} y1={padding.top} x2={toSVGX(xv)} y2={padding.top + plotH} stroke="#21262D" strokeWidth={1} />
        ))}
        {yTicks.map((yv, i) => (
          <line key={`yg${i}`} x1={padding.left} y1={toSVGY(yv)} x2={padding.left + plotW} y2={toSVGY(yv)} stroke="#21262D" strokeWidth={1} />
        ))}

        {/* Zero axis */}
        <line x1={padding.left} y1={toSVGY(0)} x2={padding.left + plotW} y2={toSVGY(0)} stroke="#30363D" strokeWidth={1.5} />

        {/* X-axis labels */}
        {xTicks.map((xv, i) => (
          <text key={`xl${i}`} x={toSVGX(xv)} y={padding.top + plotH + 20} textAnchor="middle" fill="#8B949E" fontSize={12}>
            {xLabels[i]}
          </text>
        ))}

        {/* Y-axis labels */}
        {yTicks.filter((v) => v === Math.round(v)).map((yv, i) => (
          <text key={`yl${i}`} x={padding.left - 10} y={toSVGY(yv) + 4} textAnchor="end" fill="#8B949E" fontSize={12}>
            {yv}
          </text>
        ))}

        {/* Data lines */}
        {datasets.map((ds, di) => {
          if (!ds.data || ds.data.length === 0) return null;
          const d = ds.data
            .map((pt, i) => {
              const sx = toSVGX(pt.x);
              const sy = toSVGY(Math.max(yMin, Math.min(yMax, pt.y)));
              return `${i === 0 ? "M" : "L"}${sx.toFixed(1)},${sy.toFixed(1)}`;
            })
            .join(" ");
          return (
            <path
              key={di}
              d={d}
              fill="none"
              stroke={ds.color}
              strokeWidth={ds.width || 2}
              strokeOpacity={ds.opacity || 1}
              strokeDasharray={ds.dash || "none"}
            />
          );
        })}

        {/* Legend */}
        {showLegend && legendItems && (
          <g>
            {legendItems.map((item, i) => (
              <g key={i} transform={`translate(${padding.left + 8 + i * 120}, ${padding.top + 12})`}>
                <line x1={0} y1={0} x2={16} y2={0} stroke={item.color} strokeWidth={2.5} />
                <text x={20} y={4} fill="#8B949E" fontSize={11}>
                  {item.label}
                </text>
              </g>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}

export default function FourierVisualizer() {
  const [amplitudes, setAmplitudes] = useState([0, 0, 0, 0, 0]);
  const [waveType, setWaveType] = useState("square");
  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = useRef(null);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setContainerWidth(Math.min(containerRef.current.offsetWidth, 960));
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const wave = WAVE_TYPES[waveType];
  const graphWidth = Math.max(400, containerWidth - 48);
  const graphHeight = 220;

  const activeCount = amplitudes.filter((a) => Math.abs(a) > 0.001).length;

  const setAmp = useCallback((idx, val) => {
    setAmplitudes((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  }, []);

  const resetAll = () => setAmplitudes([0, 0, 0, 0, 0]);

  const showIdeal = () => {
    setAmplitudes([1, 2, 3, 4, 5].map((n) => {
      const c = wave.coefficients(n);
      return Math.round(Math.min(2, Math.max(-2, c)) * 1000) / 1000;
    }));
  };

  // Individual sine wave datasets
  const individualDatasets = amplitudes.map((amp, i) => {
    if (Math.abs(amp) < 0.001) return null;
    const n = i + 1;
    return {
      color: COLORS[i],
      width: 2,
      opacity: 0.9,
      data: X_VALUES.map((x) => ({ x, y: amp * Math.sin(n * x) })),
    };
  }).filter(Boolean);

  const individualLegend = amplitudes
    .map((amp, i) => (Math.abs(amp) > 0.001 ? { color: COLORS[i], label: `n=${i + 1}` } : null))
    .filter(Boolean);

  // Sum dataset
  const sumData = X_VALUES.map((x) => {
    let y = 0;
    amplitudes.forEach((amp, i) => {
      y += amp * Math.sin((i + 1) * x);
    });
    return { x, y };
  });

  // Target waveform dataset
  const targetData = X_VALUES.map((x) => ({ x, y: wave.fn(x) }));

  // Build equation string
  const eqParts = amplitudes
    .map((amp, i) => {
      if (Math.abs(amp) < 0.001) return null;
      const n = i + 1;
      const coeff = Math.abs(amp) === 1 ? "" : Math.abs(amp).toFixed(2);
      const sign = amp < 0 ? "−" : "+";
      const sinPart = n === 1 ? "sin(x)" : `sin(${n}x)`;
      return { sign, coeff, sinPart };
    })
    .filter(Boolean);

  let equationStr = "f(x) = 0";
  if (eqParts.length > 0) {
    equationStr = "f(x) = " + eqParts
      .map((p, i) => {
        const prefix = i === 0 ? (p.sign === "−" ? "−" : "") : ` ${p.sign} `;
        return `${prefix}${p.coeff}${p.sinPart}`;
      })
      .join("");
  }

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: "100vh",
        background: "linear-gradient(165deg, #0B0E14 0%, #111820 50%, #0F1923 100%)",
        color: "#C9D1D9",
        fontFamily: "'Instrument Sans', 'DM Sans', 'Segoe UI', sans-serif",
        padding: "24px 20px",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#F0F6FC",
            margin: "0 0 4px 0",
            letterSpacing: "-0.5px",
          }}
        >
          <span style={{ color: "#58A6FF" }}>∑</span> Fourier Series Visualizer
        </h1>
        <p style={{ fontSize: 16, color: "#8B949E", margin: 0, maxWidth: 640, marginLeft: "auto", marginRight: "auto" }}>
          Adjust the harmonics to see how sine waves add up to create complex waveforms
        </p>
      </div>

      {/* Wave selector + formula */}
      <div
        style={{
          background: "#161B22",
          border: "1px solid #21262D",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 16,
          maxWidth: 920,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, marginBottom: 12 }}>
          <label style={{ fontSize: 16, fontWeight: 600, color: "#F0F6FC" }}>Target Waveform:</label>
          <select
            value={waveType}
            onChange={(e) => setWaveType(e.target.value)}
            style={{
              background: "#0D1117",
              color: "#C9D1D9",
              border: "1px solid #30363D",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 16,
              cursor: "pointer",
              outline: "none",
            }}
          >
            {Object.entries(WAVE_TYPES).map(([key, wt]) => (
              <option key={key} value={key}>{wt.name}</option>
            ))}
          </select>
          <span
            style={{
              fontSize: 14,
              color: "#58A6FF",
              background: "#0D1117",
              padding: "6px 12px",
              borderRadius: 6,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              border: "1px solid #21262D",
            }}
          >
            Active harmonics: {activeCount}/5
          </span>
        </div>

        <div
          style={{
            fontSize: 15,
            color: "#7EE787",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            background: "#0D1117",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #21262D",
            overflowX: "auto",
          }}
        >
          <div style={{ marginBottom: 4, color: "#8B949E", fontSize: 12 }}>Series formula:</div>
          {wave.formula}
        </div>
      </div>

      {/* Main content */}
      <div
        style={{
          maxWidth: 920,
          marginLeft: "auto",
          marginRight: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Current equation */}
        <div
          style={{
            background: "#161B22",
            border: "1px solid #21262D",
            borderRadius: 10,
            padding: "12px 16px",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: 15,
            color: "#D2A8FF",
            overflowX: "auto",
          }}
        >
          <span style={{ color: "#8B949E", fontSize: 12, display: "block", marginBottom: 4 }}>Current equation:</span>
          {equationStr}
        </div>

        {/* Sliders */}
        <div
          style={{
            background: "#161B22",
            border: "1px solid #21262D",
            borderRadius: 12,
            padding: "16px 20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: "#F0F6FC", margin: 0 }}>Harmonic Amplitudes</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={resetAll}
                style={{
                  background: "#21262D",
                  color: "#C9D1D9",
                  border: "1px solid #30363D",
                  borderRadius: 8,
                  padding: "7px 14px",
                  fontSize: 14,
                  cursor: "pointer",
                  fontWeight: 500,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.target.style.background = "#30363D")}
                onMouseLeave={(e) => (e.target.style.background = "#21262D")}
              >
                Reset All
              </button>
              <button
                onClick={showIdeal}
                style={{
                  background: "#1F6FEB",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 8,
                  padding: "7px 14px",
                  fontSize: 14,
                  cursor: "pointer",
                  fontWeight: 600,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.target.style.background = "#388BFD")}
                onMouseLeave={(e) => (e.target.style.background = "#1F6FEB")}
              >
                Show Ideal Coefficients
              </button>
            </div>
          </div>

          {amplitudes.map((amp, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 0",
                borderBottom: i < 4 ? "1px solid #21262D" : "none",
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: COLORS[i],
                  flexShrink: 0,
                  boxShadow: `0 0 8px ${COLORS[i]}55`,
                }}
              />
              <span style={{ fontSize: 15, minWidth: 220, color: "#C9D1D9", fontWeight: 500 }}>
                {HARMONIC_LABELS[i]}
              </span>
              <input
                type="range"
                min={-2}
                max={2}
                step={0.01}
                value={amp}
                onChange={(e) => setAmp(i, parseFloat(e.target.value))}
                style={{
                  flex: 1,
                  height: 6,
                  accentColor: COLORS[i],
                  cursor: "pointer",
                }}
              />
              <span
                style={{
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontSize: 14,
                  minWidth: 52,
                  textAlign: "right",
                  color: Math.abs(amp) > 0.001 ? COLORS[i] : "#484F58",
                  fontWeight: 600,
                }}
              >
                {amp >= 0 ? " " : ""}{amp.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Graphs */}
        <div
          style={{
            background: "#161B22",
            border: "1px solid #21262D",
            borderRadius: 12,
            padding: "16px 12px",
            overflow: "hidden",
          }}
        >
          <Graph
            title="Individual Harmonics"
            datasets={individualDatasets}
            yRange={[-2.2, 2.2]}
            width={graphWidth}
            height={graphHeight}
            showLegend={true}
            legendItems={individualLegend}
          />

          <Graph
            title="Sum of Harmonics (Fourier Approximation)"
            datasets={[
              { color: "#58A6FF", width: 2.5, data: sumData },
            ]}
            yRange={[-2.2, 2.2]}
            width={graphWidth}
            height={graphHeight}
          />

          <Graph
            title={`Target: ${wave.name}`}
            datasets={[
              { color: "#3FB950", width: 2, dash: "6,3", data: targetData, opacity: 0.7 },
              { color: "#58A6FF", width: 2, data: sumData },
            ]}
            yRange={[-2.2, 2.2]}
            width={graphWidth}
            height={graphHeight}
            showLegend={true}
            legendItems={[
              { color: "#3FB950", label: "Target" },
              { color: "#58A6FF", label: "Approx." },
            ]}
          />
        </div>

        {/* Educational note */}
        <div
          style={{
            background: "#0D1117",
            border: "1px solid #1F6FEB44",
            borderLeft: "3px solid #1F6FEB",
            borderRadius: 8,
            padding: "14px 18px",
            fontSize: 15,
            color: "#8B949E",
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "#58A6FF" }}>💡 Try this:</strong> Press "Show Ideal Coefficients" to see the
          mathematically correct Fourier coefficients, then try adjusting individual sliders to see how each harmonic
          contributes to the final waveform. Notice how odd harmonics matter more for square waves, and how adding more
          harmonics sharpens the approximation near discontinuities (Gibbs phenomenon).
        </div>
      </div>
    </div>
  );
}
import React, { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

function generateMockRiverData(days = 90) {
  const data = [];
  const today = new Date();

  // Use a sinusoidal seasonal pattern plus noise to feel realistic
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    const t = (2 * Math.PI * i) / 45; // ~45‑day pseudo-seasonal cycle
    const base = 450 + 180 * Math.sin(t - Math.PI / 4);
    const noise = (Math.random() - 0.5) * 80;
    let flow = Math.max(220, Math.round(base + noise));

    if (Math.random() < 0.06) {
      flow += 200 + Math.random() * 180;
    }

    data.push({
      date: d.toISOString().slice(5, 10),
      fullDate: d.toISOString().slice(0, 10),
      flow
    });
  }

  return data;
}

const MOCK_DATA = generateMockRiverData(90);

function summarizeData(data, threshold) {
  if (!data.length) {
    return {
      latestFlow: 0,
      latestDate: "",
      avg7: 0,
      avg30: 0,
      maxFlow: 0,
      minFlow: 0,
      daysAbove: 0,
      abovePct: 0,
      trendLabel: "Stable",
      trendDirection: "flat"
    };
  }

  const flows = data.map((d) => d.flow);
  const maxFlow = Math.max(...flows);
  const minFlow = Math.min(...flows);

  const latest = data[data.length - 1];
  const last7 = data.slice(-7);
  const last30 = data.slice(-30);

  const avg = (items) =>
    items.reduce((sum, d) => sum + d.flow, 0) / (items.length || 1);

  const avg7 = avg(last7);
  const avg30 = avg(last30);

  const daysAbove = data.filter((d) => d.flow >= threshold).length;
  const abovePct = (daysAbove / data.length) * 100;

  const firstWindowAvg = avg(data.slice(0, 15));
  const lastWindowAvg = avg(data.slice(-15));
  const delta = lastWindowAvg - firstWindowAvg;
  const rel = firstWindowAvg ? delta / firstWindowAvg : 0;

  let trendLabel = "Stable";
  let trendDirection = "flat";

  if (rel > 0.08) {
    trendLabel = "Rising";
    trendDirection = "up";
  } else if (rel < -0.08) {
    trendLabel = "Falling";
    trendDirection = "down";
  }

  return {
    latestFlow: latest.flow,
    latestDate: latest.fullDate,
    avg7,
    avg30,
    maxFlow,
    minFlow,
    daysAbove,
    abovePct,
    trendLabel,
    trendDirection
  };
}

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid rgba(15,23,42,0.12)",
  boxShadow: "0 16px 30px rgba(15,23,42,0.18)",
  padding: "0.55rem 0.7rem",
  background:
    "radial-gradient(circle at 0% 0%, #e0f2fe 0, #ecfdf3 45%, #ffffff 100%)"
};

function formatFlow(flow) {
  return `${flow.toLocaleString()} cfs`;
}

const App = () => {
  const [threshold, setThreshold] = useState(() => {
    const flows = MOCK_DATA.map((d) => d.flow);
    const max = Math.max(...flows);
    const min = Math.min(...flows);
    return Math.round(min + (max - min) * 0.7);
  });

  const minFlow = useMemo(
    () => Math.min(...MOCK_DATA.map((d) => d.flow)),
    []
  );
  const maxFlow = useMemo(
    () => Math.max(...MOCK_DATA.map((d) => d.flow)),
    []
  );

  const insights = useMemo(
    () => summarizeData(MOCK_DATA, threshold),
    [threshold]
  );

  const thresholdState =
    insights.latestFlow >= threshold
      ? "danger"
      : insights.abovePct > 20
        ? "attention"
        : "normal";

  const thresholdLabel =
    thresholdState === "danger"
      ? "Above flood threshold"
      : thresholdState === "attention"
        ? "Occasional threshold exceedance"
        : "Comfortably below flood threshold";

  const trendArrow =
    insights.trendDirection === "up"
      ? "▲"
      : insights.trendDirection === "down"
        ? "▼"
        : "⟲";

  const sliderMin = Math.floor(minFlow * 0.9);
  const sliderMax = Math.ceil(maxFlow * 1.05);

  const pointsAboveThreshold = MOCK_DATA.filter(
    (d) => d.flow >= threshold
  ).length;

  return (
    <div className="app-shell">
      <div className="card">
        <header className="header">
          <div className="header-left">
            <div className="logo-pill">
              <div className="logo-glyph" />
            </div>
            <div className="title-block">
              <div className="app-title">River-flow-dashboard</div>
              <div className="app-subtitle">Daily discharge · 90‑day window</div>
            </div>
          </div>
          <div className="header-badge">Hydro · Mock Data</div>
        </header>

        <section className="hero">
          <div>
            <h1 className="hero-main-title">
              River conditions at a glance,{" "}
              <span style={{ color: "#0284c7" }}>without the noise.</span>
            </h1>
            <p className="hero-tagline">
              Synthetic daily flow values for the last{" "}
              <span>90 days</span>, tuned to look like a mixed snowmelt and
              storm‑driven river. Use the flood threshold slider to explore how
              often flows push into higher‑risk territory.
            </p>
            <div className="hero-metrics">
              <div className="metric-pill">
                <div className="metric-label">Latest flow</div>
                <div className="metric-value">
                  {formatFlow(insights.latestFlow)}
                </div>
                <div className="metric-subtext">
                  as of {insights.latestDate || "–"}
                </div>
              </div>
              <div className="metric-pill secondary">
                <div className="metric-label">7‑day vs 30‑day</div>
                <div className="metric-value">
                  {Math.round(insights.avg7).toLocaleString()} cfs
                </div>
                <div className="metric-subtext">
                  7‑day mean · 30‑day:{" "}
                  {Math.round(insights.avg30).toLocaleString()} cfs
                </div>
              </div>
            </div>
          </div>

          <aside className="hero-status">
            <div className="status-label">System status</div>
            <div className="status-value">
              {thresholdState === "danger"
                ? "Flood watch"
                : thresholdState === "attention"
                  ? "Elevated but stable"
                  : "Within normal envelope"}
            </div>
            <div className="status-chip-row">
              <div className="status-chip">
                {trendArrow} {insights.trendLabel} over 90‑day window
              </div>
              {thresholdState !== "normal" && (
                <div
                  className={
                    thresholdState === "danger"
                      ? "status-chip danger"
                      : "status-chip attention"
                  }
                >
                  {pointsAboveThreshold} days ≥ threshold
                </div>
              )}
            </div>
            <div className="status-footer">
              This dashboard is backed by{" "}
              <strong>realistic mock JSON</strong> only—safe for exploration and
              UI demos.
            </div>
          </aside>
        </section>
      </div>

      <div className="layout-main">
        <section className="card chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Daily river discharge</div>
              <div className="chart-subtitle">
                Hover to inspect individual days, adjust the threshold to see
                how often flows spike into higher bands.
              </div>
            </div>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-swatch blue" />
                Flow
              </span>
              <span className="legend-item">
                <span className="legend-swatch red" />
                ≥ flood threshold
              </span>
            </div>
          </div>

          <div className="chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="flowStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="50%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.35)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.7)" }}
                  tick={{ fontSize: 11, fill: "#475569" }}
                  interval={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.7)" }}
                  tick={{ fontSize: 11, fill: "#475569" }}
                  tickFormatter={(v) => `${Math.round(v)}`}
                  width={40}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ fontSize: 11, color: "#0f172a" }}
                  formatter={(value) => [formatFlow(value), "Flow"]}
                />
                <ReferenceLine
                  y={threshold}
                  stroke="rgba(239,68,68,0.9)"
                  strokeDasharray="5 4"
                  strokeWidth={1.4}
                  ifOverflow="extendDomain"
                />
                <Line
                  type="monotone"
                  dataKey="flow"
                  stroke="url(#flowStroke)"
                  strokeWidth={2.2}
                  dot={false}
                  activeDot={{
                    r: 4,
                    stroke: "#0f172a",
                    strokeWidth: 1.3,
                    fill: "#ffffff"
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="flow"
                  stroke="transparent"
                  dot={(props) => {
                    const { cx, cy, value } = props;
                    const isAbove = value >= threshold;
                    if (!isAbove) return null;
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="#ef4444"
                        stroke="#b91c1c"
                        strokeWidth={1.3}
                      />
                    );
                  }}
                  activeDot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="threshold-row">
            <div className="threshold-label-row">
              <div>
                <span>Flood threshold: </span>
                <span className="threshold-pill">
                  {formatFlow(threshold)}{" "}
                  <span style={{ opacity: 0.7 }}>(adjustable)</span>
                </span>
              </div>
              <div
                className={
                  "threshold-pill " +
                  (thresholdState !== "normal" ? "threshold-attention" : "")
                }
                style={{
                  background:
                    thresholdState === "danger"
                      ? "rgba(248, 113, 113, 0.12)"
                      : thresholdState === "attention"
                        ? "rgba(251, 191, 36, 0.12)"
                        : "rgba(59,130,246,0.06)",
                  borderColor:
                    thresholdState === "danger"
                      ? "rgba(220,38,38,0.7)"
                      : thresholdState === "attention"
                        ? "rgba(234,179,8,0.7)"
                        : undefined
                }}
              >
                {thresholdLabel}
              </div>
            </div>
            <input
              className="threshold-slider"
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={10}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
            <div className="threshold-helper">
              Currently,{" "}
              <strong>
                {pointsAboveThreshold} of {MOCK_DATA.length} days
              </strong>{" "}
              (≈{insights.abovePct.toFixed(1)}%) reach or exceed this threshold.
            </div>
          </div>
        </section>

        <aside className="card insights-card">
          <div className="insights-header">
            <div>
              <div className="insights-title">Data insights</div>
              <div className="insights-tag">Summary over 90‑day mock record</div>
            </div>
          </div>

          <div className="insights-grid">
            <div className="insight-tile">
              <div className="insight-label">Peak flow</div>
              <div className="insight-value">
                {formatFlow(insights.maxFlow)}
              </div>
              <div className="insight-subtext">
                Highest day in record; adjust threshold to bracket extremes.
              </div>
            </div>
            <div className="insight-tile">
              <div className="insight-label">Baseflow floor</div>
              <div className="insight-value">
                {formatFlow(insights.minFlow)}
              </div>
              <div className="insight-subtext">
                Lowest observed day—helps frame dry‑season scenarios.
              </div>
            </div>
            <div className="insight-tile attention">
              <div className="insight-label">Days ≥ threshold</div>
              <div className="insight-value">
                {pointsAboveThreshold} days
              </div>
              <div className="insight-subtext">
                About {insights.abovePct.toFixed(1)}% of the record crosses your
                chosen line.
              </div>
            </div>
            <div className="insight-tile">
              <div className="insight-label">7‑day mean</div>
              <div className="insight-value">
                {Math.round(insights.avg7).toLocaleString()} cfs
              </div>
              <div className="insight-subtext">
                Smooths out day‑to‑day noise to reveal short‑term behavior.
              </div>
            </div>
            <div className="insight-tile">
              <div className="insight-label">30‑day mean</div>
              <div className="insight-value">
                {Math.round(insights.avg30).toLocaleString()} cfs
              </div>
              <div className="insight-subtext">
                Useful backdrop for identifying anomalously wet periods.
              </div>
            </div>
            <div className="insight-tile">
              <div className="insight-label">Trend signal</div>
              <div className="insight-value">
                {trendArrow} {insights.trendLabel}
              </div>
              <div className="insight-subtext">
                Compares early vs late window to flag sustained shifts.
              </div>
            </div>
          </div>

          <div className="insights-note">
            <strong>Note:</strong> This dashboard intentionally uses{" "}
            <strong>mock JSON‑style data only</strong>—no external APIs are
            called. Swap in your own time series to turn this into a live
            operations view.
          </div>
        </aside>
      </div>

      <footer className="footer">
        <span>Mia Chavez</span> | Spring 2026 · River-flow-dashboard
      </footer>
    </div>
  );
};

export default App;


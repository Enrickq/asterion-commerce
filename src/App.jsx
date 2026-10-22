import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Cloud,
  CloudSun,
  Code2,
  ExternalLink,
  Fingerprint,
  Globe2,
  Layers3,
  Link2,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  Menu,
  Network,
  Orbit,
  Radio,
  RefreshCw,
  Route,
  Settings2,
  ShieldCheck,
  Sparkles,
  Telescope,
  Wallet,
  Wind,
  X,
} from "lucide-react";

const ProviderGrid = lazy(() => import("./ProviderGrid.jsx"));

const money = (value = 0) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value / 100);
const time = (value) =>
  value
    ? new Date(value).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";
const short = (value) =>
  value ? `${value.slice(0, 10)}…${value.slice(-6)}` : "Not issued";
const DEFAULT_INTENT =
  "A private night under the stars in La Palma for two. An expert guide, a premium telescope and private transport. I can shift the session by 20 minutes. Only charge if the agreed sky conditions are met.";
const PHASES = ["Intent", "Agreement", "Evidence", "Settlement"];
const STATUS = {
  NEGOTIATED: ["Agreement ready", "mint"],
  CONSENTED: ["Agreement approved", "mint"],
  ORDER_CREATED: ["Awaiting approval", "gold"],
  AUTHORIZED: ["Awaiting evidence", "gold"],
  CONDITION_MET: ["Conditions met", "mint"],
  CONDITION_FAILED: ["Conditions failed", "rose"],
  CAPTURED: ["Payment captured", "mint"],
  CAPTURE_PENDING: ["Capture pending", "gold"],
  CAPTURE_FAILED: ["Capture declined", "rose"],
  VOID_PENDING: ["Void pending", "gold"],
  VOIDED: ["Authorization voided", "rose"],
  PAYOUTS_PENDING: ["Distributing", "gold"],
  SETTLED: ["Distribution complete", "mint"],
  PAYMENT_FAILED: ["Payment needs attention", "rose"],
};
const CHECK_LABELS = {
  cloud: "Cloud cover",
  wind: "Wind speed",
  humidity: "Humidity",
  freshness: "Evidence freshness",
  sources: "Sources identified",
  agreement: "Source agreement",
};

async function api(path, body) {
  const response = await fetch(`/api${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : data.error?.message ||
            data.message ||
            `Request failed (${response.status})`,
    );
  return data.agreement || data;
}

function Star({ size = 22, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="m20 2 4.8 13.2L38 20l-13.2 4.8L20 38l-4.8-13.2L2 20l13.2-4.8L20 2Z"
        fill="currentColor"
      />
      <path d="m20 13 2.4 7-2.4 7-2.4-7 2.4-7Z" fill="#0a1118" />
    </svg>
  );
}

function SkyScene() {
  const stars = useMemo(
    () =>
      Array.from({ length: 95 }, (_, i) => ({
        x: (i * 71.321 + 11) % 100,
        y: (i * 31.712 + 3) % 70,
        s: i % 11 === 0 ? 2.2 : i % 3 === 0 ? 1.2 : 0.7,
        o: 0.2 + (i % 7) / 10,
      })),
    [],
  );
  return (
    <div className="sky-scene" aria-hidden="true">
      <div className="milky-way" />
      {stars.map((s, i) => (
        <i
          key={i}
          className="sky-star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.s,
            height: s.s,
            opacity: s.o,
          }}
        />
      ))}
      <svg
        className="constellation"
        viewBox="0 0 1100 400"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M610 87 690 47 751 112 840 93 895 163"
          fill="none"
          stroke="#aad7d1"
          strokeWidth=".7"
          opacity=".32"
        />
        {[
          [610, 87],
          [690, 47],
          [751, 112],
          [840, 93],
          [895, 163],
        ].map(([x, y]) => (
          <g key={x}>
            <circle cx={x} cy={y} r="2" fill="#e0eadd" />
            <circle
              cx={x}
              cy={y}
              r="7"
              fill="none"
              stroke="#c9dfd6"
              strokeWidth=".5"
              opacity=".3"
            />
          </g>
        ))}
        <circle
          cx="800"
          cy="170"
          r="100"
          fill="none"
          stroke="#9cc8be"
          strokeWidth=".5"
          strokeDasharray="3 9"
          opacity=".2"
        />
        <path
          d="M0 360 84 311 125 318 172 275 208 289 242 258 284 281 336 237 386 263 420 231 452 250 498 213 535 240 572 224 600 254 649 235 700 278 738 259 788 297 824 275 890 309 950 288 1020 328 1100 302 1100 400 0 400Z"
          fill="#10212a"
        />
        <path
          d="M0 374 70 352 120 367 177 329 230 347 286 321 354 348 410 315 483 354 549 329 610 359 677 341 742 370 811 343 883 367 940 352 1006 375 1100 359 1100 400 0 400Z"
          fill="#0a161e"
        />
      </svg>
      <div className="sky-coordinates">28°45′ N &nbsp; 17°53′ W</div>
      <div className="sky-marker">
        <span />
        <p>
          LA PALMA<small>Canary Islands, Spain</small>
        </p>
      </div>
    </div>
  );
}

function Badge({ children, tone = "mint", dot = false }) {
  return (
    <span className={`badge ${tone}`}>
      {dot && <i />}
      {children}
    </span>
  );
}
function IconBox({ icon: Icon, tone = "" }) {
  return (
    <span className={`icon-box ${tone}`}>
      <Icon size={18} />
    </span>
  );
}
function Spinner() {
  return <LoaderCircle className="spin" size={16} />;
}

function App() {
  const [system, setSystem] = useState(null);
  const [agreement, setAgreement] = useState(null);
  const [agreements, setAgreements] = useState([]);
  const [intent, setIntent] = useState(DEFAULT_INTENT);
  const [budget, setBudget] = useState("1500");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [scenario, setScenario] = useState("clear");
  const [consent, setConsent] = useState(false);
  const [view, setView] = useState("mission");
  const [drawer, setDrawer] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState("");
  const evidenceRef = useRef(null);
  const agreementRef = useRef(null);
  const isDemo =
    !system ||
    (system.mode || "").toLowerCase().includes("demo") ||
    system.paymentProvider === "demo" ||
    system.provider === "demo";
  const status = agreement?.status;
  const statusInfo = STATUS[status] || ["Ready to negotiate", "muted"];
  const total = agreement?.totalMinor || 148000;
  const hasAuth = Boolean(agreement?.payment?.authorizationId);
  const hasCaptured = ["CAPTURED", "PAYOUTS_PENDING", "SETTLED"].includes(
    status,
  );
  const terminal = ["VOIDED", "SETTLED"].includes(status);
  const autonomous = ["ARMED", "RUNNING"].includes(
    agreement?.autopilot?.status,
  );
  const canEvaluate =
    hasAuth &&
    !hasCaptured &&
    !terminal &&
    !["CAPTURE_PENDING", "VOID_PENDING", "CAPTURE_FAILED"].includes(status) &&
    !autonomous;
  const phase = !agreement
    ? 0
    : !hasAuth
      ? 1
      : !hasCaptured && status !== "VOIDED"
        ? 2
        : 3;
  const integrated = system?.integrations;
  const canArmAutopilot = isDemo || system?.sandboxAutopilotEnabled === true;

  const refreshList = useCallback(async () => {
    try {
      const result = await api("/agreements");
      setAgreements(Array.isArray(result) ? result : result.agreements || []);
    } catch {
      /* Surface connection state through primary status request. */
    }
  }, []);

  useEffect(() => {
    api("/status")
      .then(setSystem)
      .catch(() =>
        setError(
          "The local API is unavailable. Start the server, then refresh this page.",
        ),
      );
    refreshList();
    const id =
      new URLSearchParams(window.location.search).get("agreement") ||
      localStorage.getItem("asterion-agreement");
    if (id && /^[a-zA-Z0-9_-]+$/.test(id))
      api(`/agreements/${id}`)
        .then(setAgreement)
        .catch(() => localStorage.removeItem("asterion-agreement"));
  }, [refreshList]);

  useEffect(() => {
    if (agreement?.id) localStorage.setItem("asterion-agreement", agreement.id);
  }, [agreement?.id]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (
      status !== "CAPTURE_PENDING" &&
      status !== "PAYOUTS_PENDING" &&
      !autonomous
    )
      return;
    const timer = setInterval(
      () =>
        api(`/agreements/${agreement.id}`)
          .then(setAgreement)
          .catch(() => {}),
      autonomous ? 900 : 4000,
    );
    return () => clearInterval(timer);
  }, [status, agreement?.id, autonomous]);

  const run = async (label, callback) => {
    if (busy) return;
    setBusy(label);
    setError("");
    try {
      await callback();
      await refreshList();
    } catch (e) {
      setError(e.message);
      if (agreement?.id) {
        try {
          const persisted = await api(`/agreements/${agreement.id}`);
          setAgreement((current) =>
            current?.id === agreement.id ? persisted : current,
          );
        } catch {
          // Keep the original error if the follow-up read also fails.
        }
      }
    } finally {
      setBusy("");
    }
  };

  const negotiate = () =>
    run("negotiating", async () => {
      const budgetMinor = Math.round(Number(budget) * 100);
      if (
        !Number.isSafeInteger(budgetMinor) ||
        budgetMinor < 10000 ||
        budgetMinor > 10000000
      )
        throw new Error("Choose a budget between €100 and €100,000.");
      const result = await api("/negotiate", {
        intent,
        budgetMinor,
        participants: 2,
      });
      setAgreement(result);
      setConsent(false);
      setScenario("clear");
      setTimeout(
        () =>
          agreementRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        100,
      );
    });

  const authorize = () =>
    run("authorizing", async () => {
      let current = agreement;
      if (status === "NEGOTIATED")
        current = await api(`/agreements/${agreement.id}/consent`, {
          agreementHash: agreement.hash,
        });
      if (!current.payment?.orderId)
        current = await api(`/agreements/${agreement.id}/order`, {});
      setAgreement(current);
      const approvalUrl =
        current.payment?.approvalUrl || current.payment?.approveUrl;
      if (
        !isDemo &&
        approvalUrl &&
        !new URLSearchParams(window.location.search).has("token")
      ) {
        setDrawer("approval");
        return;
      }
      current = await api(`/agreements/${agreement.id}/authorize`, {
        orderId: current.payment?.orderId,
        agreementHash: current.hash,
      });
      setAgreement(current);
      setToast(
        isDemo
          ? "Demo authorization created. No real funds are held."
          : "PayPal Sandbox authorization confirmed.",
      );
      window.history.replaceState({}, "", window.location.pathname);
    });

  const evaluate = () =>
    run("evaluating", async () => {
      const next = await api(`/agreements/${agreement.id}/evaluate`, {
        scenario,
      });
      setAgreement(next);
      setToast(
        next.evaluation?.eligible
          ? "Evidence satisfies the approved policy."
          : "Capture blocked by the approved policy.",
      );
    });

  const execute = () =>
    run("executing", async () => {
      const next = await api(`/agreements/${agreement.id}/execute`, {});
      setAgreement(next);
      setToast(
        next.status === "VOIDED"
          ? "Authorization voided. There was no charge to refund."
          : next.status === "CAPTURE_PENDING"
            ? "Capture submitted. Waiting for confirmation."
            : "Capture confirmed. Provider payments are separate operations.",
      );
    });

  const distribute = () =>
    run("distributing", async () => {
      setAgreement(await api(`/agreements/${agreement.id}/payouts`, {}));
      setToast("Provider payment states updated.");
    });
  const reconcile = () =>
    run("reconciling", async () => {
      setAgreement(await api(`/agreements/${agreement.id}/reconcile`, {}));
      setToast("Payment state reconciled.");
    });
  const armAutopilot = () =>
    run("arming", async () => {
      setAgreement(
        await api(`/agreements/${agreement.id}/autopilot`, {
          scenario,
          ...(!isDemo && {
            agreementHash: agreement.hash,
            confirmSandboxAutopilot: true,
          }),
        }),
      );
      setToast(
        "Autonomous execution armed. The server will evaluate, act and reconcile without another click.",
      );
    });
  const download = () =>
    run("exporting", async () => {
      const receipt = await api(`/agreements/${agreement.id}/receipt`);
      const blob = new Blob([JSON.stringify(receipt, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `asterion-${agreement.id}.json`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  const newMission = () => {
    setAgreement(null);
    setConsent(false);
    setScenario("clear");
    setError("");
    setView("mission");
    localStorage.removeItem("asterion-agreement");
    window.history.replaceState({}, "", window.location.pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const checks =
    agreement?.evaluation?.checks ||
    (agreement?.evaluation
      ? [
          {
            id: "policy",
            label: "Approved policy",
            passed: agreement.evaluation.eligible,
            actual:
              (agreement.evaluation.reasons || []).join(", ") ||
              "All conditions satisfied",
          },
        ]
      : []);
  const evidence = agreement?.evidence;
  const events = agreement?.events || [];
  const allocations = agreement?.allocations || [];
  const payoutResponse = agreement?.payment?.payouts;
  const payouts = Array.isArray(payoutResponse)
    ? payoutResponse
    : payoutResponse?.items || [];
  const columns = useMemo(
    () => [
      { field: "name", headerName: "Provider", flex: 1.6, minWidth: 170 },
      { field: "role", headerName: "Service", flex: 1.2, minWidth: 130 },
      {
        field: "amountMinor",
        headerName: "Amount",
        valueFormatter: ({ value }) => money(value),
        flex: 0.8,
        minWidth: 100,
        cellClass: "grid-money",
      },
      {
        field: "paymentState",
        headerName: "State",
        flex: 1.2,
        minWidth: 150,
        cellRenderer: ({ value }) => (
          <span
            className={`grid-state ${["SUCCESS", "SUCCEEDED", "COMPLETED"].includes(value) ? "good" : ""}`}
          >
            <i />
            {value}
          </span>
        ),
      },
    ],
    [],
  );
  const rows = allocations.map((a, i) => ({
    ...a,
    id: a.id || `provider-${i}`,
    paymentState:
      payouts.find(
        (p) =>
          p.allocationId === a.id ||
          p.supplierId === a.id ||
          p.id === a.id ||
          p.recipientId === a.id ||
          p.role === a.role,
      )?.status ||
      (status === "VOIDED"
        ? "CANCELLED"
        : ["organizer", "platform"].includes(a.role?.toLowerCase())
          ? "GROSS REMAINDER"
          : hasCaptured
            ? "READY FOR PAYOUT"
            : "NOT DISBURSED"),
  }));

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            setView("mission");
          }}
        >
          <Star size={31} />
          <span>
            ASTERION<small>COMMERCE, IN AGREEMENT</small>
          </span>
        </a>
        <div className="workspace-switch">
          <span className="workspace-avatar">A</span>
          <div>
            Sky Agreement<small>Canary Islands workspace</small>
          </div>
          <ChevronRight size={15} />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {[
            { id: "mission", label: "Mission control", icon: Orbit },
            { id: "agreements", label: "Agreements", icon: Layers3 },
            { id: "integrations", label: "Integrations", icon: Network },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={view === id ? "nav-item active" : "nav-item"}
              onClick={() => {
                setView(id);
                setMobileNav(false);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === "mission" && <i />}
              {id === "agreements" && agreements.length > 0 && (
                <b>{agreements.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-mission">
          <div>
            <Radio size={14} />
            <span>THE FIRST MISSION</span>
          </div>
          <h4>
            A promise
            <br />
            written in the stars.
          </h4>
          <p>
            La Palma, Canary Islands
            <br />A proof of conditional commerce.
          </p>
          <button onClick={() => setDrawer("architecture")}>
            Explore the architecture <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setDrawer("help")}>
            <CircleHelp size={17} />
            Demo guide
            <ArrowUpRight size={14} />
          </button>
          <div className="user-profile">
            <span className="profile-avatar">SK</span>
            <div>
              Sky Operations<small>Prototype workspace</small>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              aria-label="Toggle navigation"
              onClick={() => setMobileNav(!mobileNav)}
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>
              {view === "mission"
                ? "Mission control"
                : view === "agreements"
                  ? "Agreements"
                  : "Integrations"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="location-label">
              <MapPin size={13} />
              La Palma, ES
            </span>
            <Badge tone="gold" dot>
              {isDemo ? "SIMULATION MODE" : "PAYPAL SANDBOX"}
            </Badge>
            <button
              className="icon-button"
              aria-label="Integration settings"
              onClick={() => setView("integrations")}
            >
              <Settings2 size={17} />
            </button>
          </div>
        </header>

        <main>
          <div className="page-intro">
            <div>
              <div className="eyebrow">
                <i />
                AGENTS NEGOTIATE. EVIDENCE UNLOCKS PAYMENT.
              </div>
              <h1>
                {view === "mission"
                  ? "Mission control"
                  : view === "agreements"
                    ? "Every agreement, accounted for."
                    : "Connected by purpose."}
              </h1>
              <p>
                {view === "mission"
                  ? "A remarkable experience. An agreement you can verify."
                  : view === "agreements"
                    ? "Inspect the agreement, the evidence and every payment decision."
                    : "A transparent view of what is connected, simulated and ready to configure."}
              </p>
            </div>
            <button
              className="button button-secondary new-mission"
              onClick={newMission}
            >
              <Sparkles size={15} />
              New mission
              <ArrowUpRight size={14} />
            </button>
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <ShieldCheck size={18} />
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={16} />
              </button>
            </div>
          )}

          {view === "mission" && (
            <>
              <section className="hero-card">
                <SkyScene />
                <div className="hero-content">
                  <div className="hero-kicker">
                    <span />
                    THE SKY AGREEMENT <i /> MISSION 001
                  </div>
                  <h2>
                    The sky is
                    <br />
                    the condition.
                  </h2>
                  <p>
                    Your agents arrange the extraordinary.
                    <br />
                    Your agreement decides when payment happens.
                  </p>
                  <div className="hero-tags">
                    <span>
                      <Telescope size={13} />
                      Private stargazing
                    </span>
                    <span>
                      <MapPin size={13} />
                      La Palma
                    </span>
                    <span>
                      <ShieldCheck size={13} />
                      Evidence-bound payment
                    </span>
                  </div>
                </div>
                <div className="hero-stamp">
                  <Star size={17} />
                  <span>
                    Built for the
                    <br />
                    <strong>PayPal AI Hackathon</strong>
                  </span>
                </div>
              </section>

              <div className="stats-strip">
                <Metric
                  icon={Wallet}
                  label="AGREEMENT VALUE"
                  value={agreement ? money(total) : "—"}
                  detail={
                    agreement ? "Exact amount agreed" : "Set by the negotiation"
                  }
                />
                <Metric
                  icon={LockKeyhole}
                  label="AUTHORIZED"
                  value={hasAuth && status !== "VOIDED" ? money(total) : "€0"}
                  detail={
                    status === "VOIDED"
                      ? "Authorization voided"
                      : hasAuth
                        ? isDemo
                          ? "Simulated authorization"
                          : "PayPal Sandbox authorization"
                        : "Requires buyer approval"
                  }
                />
                <Metric
                  icon={CheckCheck}
                  label="CAPTURED"
                  value={hasCaptured ? money(total) : "€0"}
                  detail={
                    hasCaptured
                      ? "Capture confirmed"
                      : status === "VOIDED"
                        ? "Blocked · no charge"
                        : "Waiting for approved conditions"
                  }
                />
                <Metric
                  icon={Network}
                  label="SUPPLIER AGENTS"
                  value="03"
                  detail={
                    ["anthropic", "gemini"].includes(
                      agreement?.negotiationProvider,
                    )
                      ? "Model-assisted negotiation"
                      : "Independent, deterministic demo agents"
                  }
                />
              </div>

              <div className="journey-bar">
                {PHASES.map((label, i) => (
                  <button
                    key={label}
                    className={`journey-step ${i === phase ? "current" : i < phase ? "complete" : ""}`}
                    onClick={() =>
                      (i >= 2
                        ? evidenceRef
                        : agreementRef
                      ).current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      })
                    }
                  >
                    <span>{i < phase ? <Check size={12} /> : `0${i + 1}`}</span>
                    {label}
                    {i < 3 && <ChevronRight size={14} />}
                  </button>
                ))}
                <div className="journey-status">
                  <Badge tone={statusInfo[1]} dot>
                    {statusInfo[0]}
                  </Badge>
                </div>
              </div>

              <div className="mission-columns" ref={agreementRef}>
                <section className="panel intent-panel">
                  <PanelHeading
                    icon={Sparkles}
                    kicker="01 / THE INTENTION"
                    title="What would extraordinary look like?"
                  />
                  <label className="field-label" htmlFor="intent">
                    YOUR BRIEF
                  </label>
                  <textarea
                    id="intent"
                    value={intent}
                    maxLength={2000}
                    onChange={(e) => setIntent(e.target.value)}
                    disabled={Boolean(agreement)}
                    rows={4}
                  />
                  <div className="intent-controls">
                    <label>
                      <span>BUDGET LIMIT</span>
                      <div className="budget-input">
                        <b>€</b>
                        <input
                          aria-label="Budget limit in euros"
                          type="number"
                          min="100"
                          max="100000"
                          value={budget}
                          disabled={Boolean(agreement)}
                          onChange={(e) => setBudget(e.target.value)}
                        />
                        <small>EUR</small>
                      </div>
                    </label>
                    <div className="party-size">
                      <span>GUESTS</span>
                      <strong>
                        02 <small>Private experience</small>
                      </strong>
                    </div>
                  </div>
                  <div className="intent-constraints">
                    <span>
                      <Check size={12} />
                      Private transport
                    </span>
                    <span>
                      <Check size={12} />
                      Expert guide
                    </span>
                    <span>
                      <Check size={12} />
                      Weather conditional
                    </span>
                  </div>
                  {!agreement ? (
                    <button
                      className="button button-primary full"
                      disabled={Boolean(busy) || !intent.trim()}
                      onClick={negotiate}
                    >
                      {busy === "negotiating" ? (
                        <Spinner />
                      ) : (
                        <Network size={16} />
                      )}{" "}
                      {busy === "negotiating"
                        ? "Agents are negotiating…"
                        : "Let the agents negotiate"}
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <div className="intent-locked">
                      <Fingerprint size={16} />
                      <span>Intent recorded in this agreement</span>
                      <button onClick={newMission}>Start another</button>
                    </div>
                  )}
                  <p className="microcopy">
                    {isDemo
                      ? "Reproducible simulation. No real bookings or funds."
                      : "Sandbox only. Buyer approval is required before authorization."}
                  </p>
                </section>

                <section className="panel agent-panel">
                  <PanelHeading
                    icon={Network}
                    kicker="02 / THE NEGOTIATION"
                    title="Independent agents. One agreement."
                    accessory={
                      <Badge tone={agreement ? "mint" : "muted"}>
                        {agreement ? "AGREED" : "STANDING BY"}
                      </Badge>
                    }
                  />
                  <AgentMap
                    active={Boolean(agreement)}
                    busy={busy === "negotiating"}
                  />
                  <div className="agent-log">
                    {agreement?.negotiation?.length ? (
                      agreement.negotiation.map((entry, i) => (
                        <div className="negotiation-entry" key={i}>
                          <span
                            className={`agent-dot role-${entry.role || "buyer"}`}
                          />
                          <div>
                            <strong>
                              {entry.agent || entry.role || "Agent"}
                              <small>ROUND {entry.round ?? 1}</small>
                            </strong>
                            <p>
                              {entry.message || entry.content || entry.text}
                            </p>
                          </div>
                          {entry.amountMinor && (
                            <b>{money(entry.amountMinor)}</b>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="log-placeholder">
                        <span className="scan-line" />
                        <p>
                          Your buyer agent will negotiate with three suppliers.
                        </p>
                        <small>
                          Price, availability and cancellation terms travel with
                          every offer.
                        </small>
                      </div>
                    )}
                  </div>
                  {agreement && (
                    <div className="negotiation-total">
                      <span>
                        COMPLETE EXPERIENCE
                        <small>Includes the organizer’s gross remainder</small>
                      </span>
                      <strong>{money(total)}</strong>
                    </div>
                  )}
                </section>
              </div>

              {agreement && (
                <section className="agreement-ribbon">
                  <div>
                    <IconBox icon={Fingerprint} />
                    <span>
                      AGREEMENT FINGERPRINT
                      <strong title={agreement.hash}>
                        {short(agreement.hash)}
                      </strong>
                    </span>
                  </div>
                  <p>
                    Approval binds the services, price and policy to this exact
                    version.
                  </p>
                  <button onClick={() => setDrawer("agreement")}>
                    Inspect agreement
                    <ArrowUpRight size={14} />
                  </button>
                </section>
              )}

              <div className="mission-columns lower-columns" ref={evidenceRef}>
                <section className="panel evidence-panel">
                  <PanelHeading
                    icon={CloudSun}
                    kicker="03 / THE EVIDENCE"
                    title="The sky has a say."
                    accessory={
                      <button
                        className="text-button"
                        disabled={!evidence}
                        onClick={() => setDrawer("evidence")}
                      >
                        Inspect
                        <ArrowUpRight size={13} />
                      </button>
                    }
                  />
                  <div className="weather-display">
                    <div
                      className={`weather-symbol ${scenario !== "clear" ? "cloudy" : ""}`}
                    >
                      {scenario === "clear" ? (
                        <CloudSun size={49} strokeWidth={1} />
                      ) : (
                        <Cloud size={49} strokeWidth={1} />
                      )}
                    </div>
                    <div>
                      <h3>
                        {evidence
                          ? agreement.evaluation?.eligible
                            ? "Within the agreed limits"
                            : "Capture is blocked"
                          : "Evidence comes before payment."}
                      </h3>
                      <p>
                        {evidence
                          ? "Evaluated against the approved policy"
                          : "Clear terms. Fresh data. A deterministic decision."}
                      </p>
                    </div>
                  </div>
                  <div className="weather-metrics">
                    <div>
                      <Cloud size={14} />
                      <span>Cloud cover</span>
                      <strong>
                        {evidence
                          ? `${evidence.cloudPercent ?? evidence.cloudCoverPercent ?? evidence.cloudCover ?? "—"}%`
                          : "≤ 15%"}
                      </strong>
                    </div>
                    <div>
                      <Wind size={14} />
                      <span>Wind speed</span>
                      <strong>
                        {evidence
                          ? `${evidence.windKph ?? evidence.windSpeedKph ?? "—"} km/h`
                          : "≤ 25 km/h"}
                      </strong>
                    </div>
                    <div>
                      <Radio size={14} />
                      <span>Data freshness</span>
                      <strong>
                        {evidence
                          ? agreement.evaluation?.eligible
                            ? "Valid"
                            : scenario === "stale"
                              ? "Expired"
                              : "Checked"
                          : "≤ 10 min"}
                      </strong>
                    </div>
                  </div>
                  <div className="scenario-picker">
                    <label htmlFor="scenario">
                      REPRODUCIBLE WEATHER SCENARIO
                    </label>
                    <select
                      id="scenario"
                      value={scenario}
                      onChange={(e) => setScenario(e.target.value)}
                      disabled={
                        Boolean(busy) || hasCaptured || terminal || autonomous
                      }
                    >
                      <option value="clear">
                        Clear skies · conditions met
                      </option>
                      <option value="cloudy">
                        Cloud cover · outside policy
                      </option>
                      <option value="stale">
                        Stale data · expired evidence
                      </option>
                      <option value="conflict">
                        Conflicting sources · fail closed
                      </option>
                    </select>
                  </div>
                  {checks.length > 0 && (
                    <div className="policy-checks">
                      {checks.map((check, i) => (
                        <div
                          key={check.id || i}
                          className={check.passed ? "passed" : "failed"}
                        >
                          {check.passed ? <Check size={13} /> : <X size={13} />}
                          <span>
                            {CHECK_LABELS[check.id] || check.label || check.id}
                          </span>
                          <small>
                            {check.id === "agreement"
                              ? check.passed
                                ? "PASS"
                                : "CONFLICT"
                              : String(
                                  check.actual ??
                                    (check.passed ? "PASS" : "FAIL"),
                                )}
                          </small>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    className="button button-secondary full"
                    disabled={!canEvaluate || Boolean(busy)}
                    onClick={evaluate}
                  >
                    {busy === "evaluating" ? <Spinner /> : <ScanIcon />}
                    {evidence ? "Re-evaluate evidence" : "Evaluate conditions"}
                    <ArrowRight size={15} />
                  </button>
                  <p className="microcopy">
                    Scenario data is simulated and labelled. A forecast is not a
                    guarantee of future weather.
                  </p>
                </section>

                <section className="panel payment-panel">
                  <PanelHeading
                    icon={ShieldCheck}
                    kicker="04 / THE PAYMENT"
                    title="A payment with a reason."
                    accessory={
                      <span className="paypal-wordmark">
                        Pay<span>Pal</span>
                      </span>
                    }
                  />
                  <div className="payment-amount">
                    <span>AGREED AMOUNT</span>
                    <strong>
                      {agreement ? money(total) : "€0"}
                      <small>EUR</small>
                    </strong>
                    <Badge tone={statusInfo[1]} dot>
                      {statusInfo[0]}
                    </Badge>
                  </div>
                  <div className="payment-steps">
                    <PaymentStep
                      complete={Boolean(agreement)}
                      active={!agreement}
                      title="Negotiate an agreement"
                      detail="Services and terms fit together"
                    />
                    <PaymentStep
                      complete={hasAuth}
                      active={Boolean(agreement) && !hasAuth}
                      title="Buyer approves with PayPal"
                      detail={
                        hasAuth
                          ? short(agreement.payment.authorizationId)
                          : "The exact amount and agreement"
                      }
                    />
                    <PaymentStep
                      complete={Boolean(agreement?.evaluation?.eligible)}
                      active={hasAuth && !evidence}
                      title="Evidence satisfies the policy"
                      detail={
                        status === "VOIDED"
                          ? "Conditions failed. Authorization voided."
                          : "Fresh, complete and within limits"
                      }
                      failed={
                        status === "VOIDED" ||
                        agreement?.evaluation?.eligible === false
                      }
                    />
                    <PaymentStep
                      complete={hasCaptured}
                      active={agreement?.evaluation?.eligible && !hasCaptured}
                      title="Capture, then distribute"
                      detail={
                        hasCaptured
                          ? short(agreement.payment.captureId)
                          : "Separate, traceable operations"
                      }
                    />
                  </div>
                  {agreement && !hasAuth && (
                    <>
                      <label className="consent-box">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                        />
                        <span>
                          I approve this {money(total)} agreement, its weather
                          thresholds and its cancellation terms.{" "}
                          <button
                            className="inline-link"
                            onClick={(e) => {
                              e.preventDefault();
                              setDrawer("agreement");
                            }}
                          >
                            Review terms
                          </button>
                        </span>
                      </label>
                      <button
                        className="button button-paypal full"
                        disabled={!consent || Boolean(busy)}
                        onClick={authorize}
                      >
                        {busy === "authorizing" ? (
                          <Spinner />
                        ) : (
                          <LockKeyhole size={15} />
                        )}{" "}
                        {isDemo
                          ? `Simulate authorization · ${money(total)}`
                          : `Continue with PayPal · ${money(total)}`}
                        <ArrowUpRight size={15} />
                      </button>
                    </>
                  )}
                  {status === "AUTHORIZED" &&
                    canArmAutopilot &&
                    !autonomous && (
                      <div className="autopilot-card">
                        <div>
                          <Orbit size={17} />
                          <span>LET THE AGREEMENT RUN</span>
                          <Badge tone="gold">
                            {isDemo ? "DEMO" : "SANDBOX"}
                          </Badge>
                        </div>
                        <p>
                          Arm the server to evaluate the selected weather
                          scenario, capture or void, then distribute. No
                          additional payment click.
                          {!isDemo &&
                            " This private Sandbox run uses test funds and simulated weather. Supplier payouts require configured Sandbox recipients."}
                        </p>
                        <button
                          className="button button-primary full"
                          disabled={Boolean(busy)}
                          onClick={armAutopilot}
                        >
                          {busy === "arming" ? (
                            <Spinner />
                          ) : (
                            <Radio size={15} />
                          )}
                          Arm autonomous execution
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    )}
                  {autonomous && (
                    <div className="autopilot-card running">
                      <div>
                        <Spinner />
                        <span>AUTONOMOUS EXECUTION</span>
                        <Badge tone="mint">{agreement.autopilot.status}</Badge>
                      </div>
                      <p>
                        The server owns the next step. This page is observing
                        the persistent workflow.
                      </p>
                    </div>
                  )}
                  {agreement?.autopilot?.status === "FAILED" && (
                    <div className="error-banner">
                      <ShieldCheck size={16} />
                      <span>
                        Autonomous execution needs review. Inspect the audit
                        trail and reconcile the payment state before retrying.
                      </span>
                    </div>
                  )}
                  {canEvaluate && agreement?.evaluation && (
                    <button
                      className={`button full ${agreement.evaluation.eligible ? "button-primary" : "button-danger"}`}
                      disabled={Boolean(busy)}
                      onClick={execute}
                    >
                      {busy === "executing" ? (
                        <Spinner />
                      ) : agreement.evaluation.eligible ? (
                        <ShieldCheck size={16} />
                      ) : (
                        <X size={16} />
                      )}{" "}
                      {agreement.evaluation.eligible
                        ? `Execute conditional capture · ${money(total)}`
                        : "Void authorization · do not charge"}
                      <ArrowRight size={15} />
                    </button>
                  )}
                  {status === "CAPTURED" && !autonomous && (
                    <button
                      className="button button-primary full"
                      disabled={Boolean(busy)}
                      onClick={distribute}
                    >
                      {busy === "distributing" ? (
                        <Spinner />
                      ) : (
                        <Route size={16} />
                      )}
                      Distribute to suppliers
                      <ArrowRight size={15} />
                    </button>
                  )}
                  {!autonomous &&
                    (status === "CAPTURE_PENDING" ||
                      status === "PAYOUTS_PENDING" ||
                      status === "VOID_PENDING" ||
                      (!isDemo &&
                        agreement?.payment?.orderId &&
                        agreement?.payment?.lastError)) && (
                      <button
                        className="button button-secondary full"
                        disabled={Boolean(busy)}
                        onClick={reconcile}
                      >
                        <RefreshCw size={15} />
                        Reconcile payment state
                      </button>
                    )}
                  {terminal && (
                    <div
                      className={`terminal-banner ${status === "VOIDED" ? "voided" : ""}`}
                    >
                      <ShieldCheck size={18} />
                      <div>
                        <strong>
                          {status === "VOIDED"
                            ? "The agreement protected the buyer."
                            : "Every supplier payment is accounted for."}
                        </strong>
                        <p>
                          {status === "VOIDED"
                            ? "No capture. No payout. No charge to refund."
                            : "Inspect the receipt for the complete event trail."}
                        </p>
                      </div>
                    </div>
                  )}
                  {!agreement && (
                    <div className="payment-empty">
                      <LockKeyhole size={14} />
                      Your payment starts with your approval.
                    </div>
                  )}
                  <p className="microcopy">
                    {isDemo
                      ? "Simulated PayPal adapter. No real payment or hold."
                      : "PayPal Sandbox. No production payments."}{" "}
                    Authorization is not escrow.
                  </p>
                </section>
              </div>

              <section className="panel settlement-panel">
                <PanelHeading
                  icon={Route}
                  kicker="THE DISTRIBUTION"
                  title="One agreement. Every obligation visible."
                  accessory={<Badge tone="muted">AG GRID COMMUNITY</Badge>}
                />
                {agreement ? (
                  <>
                    <div className="provider-grid">
                      <Suspense
                        fallback={
                          <div className="audit-empty">
                            <Spinner />
                            Loading the supplier ledger…
                          </div>
                        }
                      >
                        <ProviderGrid rows={rows} columns={columns} />
                      </Suspense>
                    </div>
                    <p className="microcopy align-left">
                      Payouts follow capture and use the organizer’s available
                      balance. This is not an atomic multi-seller split. The
                      organizer remainder is before fees and taxes.
                    </p>
                  </>
                ) : (
                  <div className="empty-distribution">
                    <Route size={24} strokeWidth={1.3} />
                    <div>
                      <strong>A clear view of who gets paid, and why.</strong>
                      <p>
                        Negotiate your first agreement to see provider
                        allocations.
                      </p>
                    </div>
                    <span>
                      GUIDE <i /> TELESCOPE <i /> TRANSPORT
                    </span>
                  </div>
                )}
              </section>

              <section className="panel audit-panel">
                <PanelHeading
                  icon={Activity}
                  kicker="THE AUDIT TRAIL"
                  title="Every decision leaves evidence."
                  accessory={
                    <button
                      className="text-button"
                      disabled={!agreement || Boolean(busy)}
                      onClick={download}
                    >
                      <ArrowDownToLine size={14} />
                      Export receipt
                    </button>
                  }
                />
                {events.length ? (
                  <div className="audit-list">
                    {events
                      .slice()
                      .reverse()
                      .slice(0, 8)
                      .map((event, i) => (
                        <div className="audit-event" key={event.id || i}>
                          <span className="event-point" />
                          <time>
                            {time(
                              event.at || event.timestamp || event.createdAt,
                            )}
                          </time>
                          <strong>
                            {(event.type || "event")
                              .replaceAll("_", " ")
                              .replaceAll(".", " / ")}
                          </strong>
                          <p>
                            {event.message ||
                              event.description ||
                              "State transition recorded"}
                          </p>
                          <span className="event-chain">
                            <Link2 size={11} />
                            {short(event.hash)}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="audit-empty">
                    <Fingerprint size={18} />
                    <span>
                      A hash-linked event trail begins with your first
                      agreement.
                    </span>
                  </div>
                )}
              </section>
            </>
          )}

          {view === "agreements" && (
            <section className="panel agreements-list">
              <PanelHeading
                icon={Layers3}
                kicker="AGREEMENT REGISTRY"
                title={`${agreements.length} agreements in this workspace`}
              />
              {agreements.length ? (
                agreements.map((item) => (
                  <button
                    className="agreement-list-row"
                    key={item.id}
                    onClick={() =>
                      run("loading", async () => {
                        setAgreement(await api(`/agreements/${item.id}`));
                        setView("mission");
                        setConsent(false);
                      })
                    }
                  >
                    <IconBox icon={Fingerprint} />
                    <span>
                      <strong>The Sky Agreement</strong>
                      <small>{item.id}</small>
                    </span>
                    <span className="registry-date">
                      {new Date(item.createdAt).toLocaleDateString("en-GB")}
                    </span>
                    <strong>{money(item.totalMinor)}</strong>
                    <Badge tone={(STATUS[item.status] || [null, "muted"])[1]}>
                      {(STATUS[item.status] || [item.status])[0]}
                    </Badge>
                    <ArrowUpRight size={16} />
                  </button>
                ))
              ) : (
                <div className="large-empty">
                  <Layers3 size={32} />
                  <h3>Your first agreement starts with an intention.</h3>
                  <button
                    className="button button-primary"
                    onClick={newMission}
                  >
                    Create a mission
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </section>
          )}

          {view === "integrations" && (
            <Integrations
              system={system}
              integrated={integrated}
              isDemo={isDemo}
              onArchitecture={() => setDrawer("architecture")}
            />
          )}

          <footer className="footer">
            <div>
              <Star size={15} />
              <span>ASTERION</span>
              <small>Agents negotiate. Evidence unlocks payment.</small>
            </div>
            <span>
              Prototype ·{" "}
              {isDemo ? "Simulated payments & weather" : "PayPal Sandbox"}
              <i />
              No production money
            </span>
          </footer>
        </main>
      </div>

      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{toast}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {drawer && (
        <div className="modal-backdrop" onClick={() => setDrawer(null)}>
          <section
            className={`modal ${drawer === "architecture" ? "wide" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              drawer === "agreement"
                ? "Agreement details"
                : drawer === "evidence"
                  ? "Evidence details"
                  : "ASTERION information"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">ASTERION / INSPECT</span>
                <h2>
                  {drawer === "agreement"
                    ? "The agreement you approve."
                    : drawer === "evidence"
                      ? "The evidence behind the decision."
                      : drawer === "architecture"
                        ? "Designed to make autonomy accountable."
                        : drawer === "approval"
                          ? "Approve in PayPal Sandbox."
                          : "A two-minute mission."}
                </h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close dialog"
                onClick={() => setDrawer(null)}
              >
                <X size={20} />
              </button>
            </div>
            {drawer === "agreement" && (
              <>
                <div className="modal-summary">
                  <Badge tone="mint">{money(total)} EUR</Badge>
                  <Badge tone="muted">{short(agreement?.hash)}</Badge>
                </div>
                <p className="modal-copy">
                  Private observation for two at an operator-confirmed,
                  permitted location in La Palma. No night-time access to
                  scientific telescopes is offered. Capture requires every
                  approved condition to pass before the decision deadline.
                  Scenario thresholds are illustrative operator settings.
                </p>
                <div className="terms-grid">
                  <div>
                    <span>Cloud cover</span>
                    <strong>
                      ≤ {agreement?.policy?.maxCloudPercent ?? 15}%
                    </strong>
                  </div>
                  <div>
                    <span>Wind speed</span>
                    <strong>
                      ≤ {agreement?.policy?.maxWindKph ?? 25} km/h
                    </strong>
                  </div>
                  <div>
                    <span>Data age</span>
                    <strong>≤ 10 minutes</strong>
                  </div>
                  <div>
                    <span>If conditions fail</span>
                    <strong>Void before capture</strong>
                  </div>
                </div>
                <p className="modal-copy">
                  The organizer is the seller of the complete package. Supplier
                  disbursements are separate operations after capture. If
                  conditions deteriorate after capture, cancellation or refund
                  terms apply. Forecast eligibility does not guarantee future
                  sky conditions. This prototype represents simulated providers
                  and bookings.
                </p>
                <pre>
                  {JSON.stringify(
                    {
                      id: agreement?.id,
                      hash: agreement?.hash,
                      intent: agreement?.intent,
                      policy: agreement?.policy,
                      allocations: agreement?.allocations,
                    },
                    null,
                    2,
                  )}
                </pre>
              </>
            )}
            {drawer === "evidence" && (
              <>
                <p className="modal-copy">
                  Reproducible scenario data. The receipt records the data
                  evaluated, its timestamps and its origin. It does not certify
                  that a forecast will be correct.
                </p>
                <pre>
                  {JSON.stringify(
                    {
                      evidence: agreement?.evidence,
                      evaluation: agreement?.evaluation,
                    },
                    null,
                    2,
                  )}
                </pre>
              </>
            )}
            {drawer === "architecture" && (
              <>
                <p className="modal-copy">
                  Models can propose. The payment service enforces consent,
                  exact terms, fresh evidence and a single valid state
                  transition. Payment credentials stay on the server.
                </p>
                <div className="architecture-flow">
                  {[
                    ["01", "Intent", "Buyer limits and preferences"],
                    ["02", "Negotiation", "Independent supplier policies"],
                    ["03", "Agreement", "Versioned terms and approval"],
                    ["04", "Evidence", "Source, location and timestamp"],
                    ["05", "Policy", "Deterministic execution guard"],
                    ["06", "PayPal", "Authorize, capture or void"],
                  ].map(([n, t, d]) => (
                    <div key={n}>
                      <span>{n}</span>
                      <strong>{t}</strong>
                      <p>{d}</p>
                    </div>
                  ))}
                </div>
                <div className="architecture-notes">
                  <div>
                    <ShieldCheck size={19} />
                    <h4>Fail closed</h4>
                    <p>
                      Expired, missing or conflicting evidence blocks capture.
                    </p>
                  </div>
                  <div>
                    <Link2 size={19} />
                    <h4>Inspect the trail</h4>
                    <p>
                      Agreement hashes and linked events make changes
                      detectable.
                    </p>
                  </div>
                  <div>
                    <Wallet size={19} />
                    <h4>Money has states</h4>
                    <p>A pending capture cannot unlock supplier payouts.</p>
                  </div>
                </div>
              </>
            )}
            {drawer === "approval" && (
              <>
                <p className="modal-copy">
                  Use a PayPal Sandbox buyer account to approve this order.
                  After completing checkout, return here to confirm
                  authorization.
                </p>
                <a
                  className="button button-paypal full"
                  href={
                    agreement?.payment?.approvalUrl ||
                    agreement?.payment?.approveUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Open PayPal Sandbox
                  <ExternalLink size={16} />
                </a>
                <button
                  className="button button-secondary full approval-confirm"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    run("authorizing", async () => {
                      setAgreement(
                        await api(`/agreements/${agreement.id}/authorize`, {
                          orderId: agreement.payment.orderId,
                          agreementHash: agreement.hash,
                        }),
                      );
                      setDrawer(null);
                    })
                  }
                >
                  I approved the order · verify authorization
                  <ShieldCheck size={16} />
                </button>
              </>
            )}
            {drawer === "help" && (
              <>
                <ol className="demo-guide">
                  <li>
                    <strong>Express an intention.</strong>
                    <p>
                      Keep the default brief or change the budget. Supplier
                      agents negotiate within their own policies.
                    </p>
                  </li>
                  <li>
                    <strong>Approve the exact agreement.</strong>
                    <p>
                      Review the terms and simulate authorization. No real money
                      moves in demo mode.
                    </p>
                  </li>
                  <li>
                    <strong>Choose the evidence scenario.</strong>
                    <p>
                      Clear skies pass. Clouds, expired data and conflicting
                      sources fail closed.
                    </p>
                  </li>
                  <li>
                    <strong>Execute the decision.</strong>
                    <p>
                      Capture only when eligible, then distribute. Otherwise
                      void the authorization.
                    </p>
                  </li>
                  <li>
                    <strong>Inspect the receipt.</strong>
                    <p>
                      Export the agreement, evidence, payment identifiers and
                      linked event trail.
                    </p>
                  </li>
                </ol>
                <button
                  className="button button-primary full"
                  onClick={() => setDrawer(null)}
                >
                  Start exploring
                  <ArrowRight size={16} />
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }) {
  return (
    <div className="metric">
      <div className="metric-label">
        <Icon size={14} />
        {label}
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
function PanelHeading({ icon: Icon, kicker, title, accessory }) {
  return (
    <div className="panel-heading">
      <div>
        <div className="panel-kicker">
          <Icon size={13} />
          {kicker}
        </div>
        <h3>{title}</h3>
      </div>
      {accessory}
    </div>
  );
}
function ScanIcon() {
  return <Radio size={16} />;
}
function PaymentStep({ complete, active, title, detail, failed }) {
  return (
    <div
      className={`payment-step ${complete ? "done" : ""} ${active ? "active" : ""} ${failed ? "failed" : ""}`}
    >
      <span>
        {failed ? <X size={11} /> : complete ? <Check size={11} /> : <i />}
      </span>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function AgentMap({ active, busy }) {
  return (
    <div
      className={`agent-map ${active ? "agreed" : ""} ${busy ? "negotiating" : ""}`}
    >
      <svg viewBox="0 0 520 155" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M260 44 C260 93 85 65 85 115M260 44V115M260 44C260 93 435 65 435 115"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray={active ? "" : "4 4"}
        />
        <circle cx="260" cy="74" r="3" fill="currentColor" />
      </svg>
      <div className="buyer-node">
        <span>
          <Star size={17} />
        </span>
        <div>
          YOUR BUYER AGENT
          <small>
            {active ? "Agreement assembled" : "Intent to agreement"}
          </small>
        </div>
        <i className={active ? "node-ready" : ""} />
      </div>
      <div className="supplier-nodes">
        {[
          { icon: Globe2, name: "Guide", sub: "Expertise & time" },
          { icon: Telescope, name: "Telescope", sub: "Equipment & slot" },
          { icon: Route, name: "Transport", sub: "Route & availability" },
        ].map(({ icon: Icon, name, sub }) => (
          <div className="supplier-node" key={name}>
            <span>
              <Icon size={18} />
              {active && (
                <i>
                  <Check size={7} />
                </i>
              )}
            </span>
            <strong>{name}</strong>
            <small>{sub}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function Integrations({ system, isDemo, onArchitecture }) {
  const connections = Object.fromEntries(
    (system?.integrations || []).map((item) => [item.id, item]),
  );
  const agentConnection = connections.agents;
  const hosted = connections.render?.status === "deployed";
  const contextUsed = connections.apimatic?.status === "development-tool";
  const cards = [
    {
      name: "PayPal",
      tag: isDemo ? "SIMULATED" : "SANDBOX CONFIGURED",
      tone: isDemo ? "gold" : "mint",
      icon: Wallet,
      description:
        "A server-side adapter for order approval, authorization, conditional capture, void and separate provider payouts.",
      detail: isDemo
        ? "Add Sandbox credentials to enable the real API adapter. Credentials alone do not prove an end-to-end payment test."
        : "Sandbox credentials configured. Complete a buyer approval to verify the integration.",
      href: "https://developer.paypal.com/dashboard/",
    },
    {
      name: "AG Grid",
      tag: "INTEGRATED",
      tone: "mint",
      icon: Layers3,
      description:
        "The live supplier allocation grid uses AG Grid Community with sorting, resizing and a custom operations theme.",
      detail:
        "Community features. AG Studio and Enterprise features are not claimed.",
      href: "https://www.ag-grid.com/",
    },
    {
      name:
        agentConnection?.mode === "gemini" ? "Google Gemini" : "AI negotiation",
      tag: agentConnection?.status === "configured" ? "CONFIGURED" : "OPTIONAL",
      tone: agentConnection?.status === "configured" ? "mint" : "muted",
      icon: Sparkles,
      description:
        "Optional model-assisted negotiation. Every proposal remains subject to supplier limits and deterministic validation.",
      detail:
        "Gemini and Anthropic adapters are available. The default uses deterministic policies; model configuration requires a separate end-to-end test.",
      href: "https://aistudio.google.com/",
    },
    {
      name: "Render",
      tag: hosted ? "HOSTED ON RENDER" : "DEPLOYMENT PREPARED",
      tone: hosted ? "mint" : "muted",
      icon: Globe2,
      description:
        "A single Node service runs the interface, conditional payment engine and autonomous execution jobs.",
      detail: hosted
        ? "The free public demo uses temporary SQLite storage. Records can reset when the instance is replaced; paid persistent storage is optional."
        : "Deployment blueprint ready. The free plan uses temporary storage; a separate blueprint supports paid persistent storage.",
      href: "https://dashboard.render.com/",
    },
    {
      name: "Kernel",
      tag: "ADAPTER PREPARED",
      tone: "muted",
      icon: ExternalLink,
      description:
        "Optional hosted browser session for a configured supplier portal. The demo supplier portal can be opened locally.",
      detail:
        "Requires a Kernel API key and an approved provider URL. No browser session is claimed without a response.",
      href: "https://www.kernel.sh/",
    },
    {
      name: "APIMatic",
      tag: contextUsed ? "CONTEXT USED" : "DEVELOPMENT TOOL",
      tone: contextUsed ? "mint" : "muted",
      icon: Code2,
      description:
        "The PayPal Context Plugin supports the coding workflow with PayPal integration guidance and error-handling references.",
      detail: contextUsed
        ? "Installed and consulted during development. It does not execute payments or run production agents."
        : "Installation and use are documented. Runtime payment authorization stays in the server adapter.",
      href: "https://context.apimatic.io/",
    },
    {
      name: "Astropods",
      tag: "PLANNED",
      tone: "muted",
      icon: Network,
      description:
        "A future deployment target for independently versioned buyer and supplier agents.",
      detail:
        "The current prototype runs agents locally. No Astropods deployment or sponsor use is claimed.",
      href: "https://docs.astropods.com/welcome",
    },
    {
      name: "AEMET",
      tag: "ADAPTER PREPARED",
      tone: "muted",
      icon: CloudSun,
      description:
        "An optional adapter retrieves station observations when a key and station ID are configured. Local sky evidence remains a separate requirement.",
      detail:
        "Current capture scenarios use explicit simulation data. Municipality data never silently substitutes for site measurements.",
      href: "https://opendata.aemet.es/",
    },
  ];
  return (
    <>
      <div className="integration-notice">
        <ShieldCheck size={22} />
        <div>
          <strong>Every integration has an honest status.</strong>
          <p>
            Prepared adapters are not active connections. All payment actions
            are limited to simulation or PayPal Sandbox.
          </p>
        </div>
        <button className="text-button" onClick={onArchitecture}>
          Architecture
          <ArrowUpRight size={14} />
        </button>
      </div>
      <div className="integration-grid">
        {cards.map(
          ({ name, tag, tone, icon: Icon, description, detail, href }) => (
            <section className="panel integration-card" key={name}>
              <div>
                <IconBox icon={Icon} />
                <Badge tone={tone}>{tag}</Badge>
              </div>
              <h3>{name}</h3>
              <p>{description}</p>
              <small>{detail}</small>
              <a href={href} target="_blank" rel="noreferrer">
                Open developer portal
                <ArrowUpRight size={14} />
              </a>
            </section>
          ),
        )}
      </div>
      <div className="integration-disclosure">
        <LockKeyhole size={16} />
        <span>
          Keys belong in the server’s local <code>.env</code> file. Never paste
          them into the browser, a public repository or this chat.
        </span>
      </div>
    </>
  );
}

export default App;

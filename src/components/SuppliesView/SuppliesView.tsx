"use client";

/* SuppliesView — phlebotomy / specimen-collection consumables inventory for the
   clinic cabinet (doctor persona, desktop).

   Grounding (mastersource):
     • §6.6 Sample — a sample carries a tube/specimen type. The app's tube model
       uses colour-top tubes: EDTA purple-top, SST gold-top, sodium-fluoride
       grey-top, sodium-citrate blue-top. Stock here is the physical inventory of
       those tubes plus the draw consumables (butterfly needles, alcohol swabs,
       gauze, sharps bins) that every collection consumes.
     • §14 PSC reception flow — draws happen at the cabinet; this page is the
       upstream supply that keeps draws possible. Status is honest: it derives
       purely from on-hand vs par level (over / ok / low / out).
     • Cabinet courier logistics — the cabinet courier route runs Mon/Wed/Fri.
       A resupply request can't teleport; it is attached to the next scheduled
       pickup, and the copy names that day so the doctor knows when it lands.

   No backend. All state is local: par-derived status, an editable resupply cart
   with quantity steppers, and a "request resupply" action that confirms via
   toast and clears the cart. Status is never colour alone — every tone carries a
   matching icon. */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge, Button } from "@/components/ui";
import {
  Cart as CartIcon,
  Calendar as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  ChevronRight as ChevronRightIcon,
  Clock as ClockIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Minus as MinusIcon,
  Plus as PlusIcon,
  Refresh as RefreshIcon,
  Tube as TubeIcon,
  Warning as WarningIcon,
} from "@/icons/components";
import type { IconProps } from "@/icons/components";
import { cx } from "@/lib/cx";
import "./SuppliesView.css";

/* ---- domain ------------------------------------------------------------- */

type StockStatus = "over" | "ok" | "low" | "out";
type Tone = "success" | "neutral" | "warning" | "danger";

/* A swatch is shown for tubes (the colour-top is clinically meaningful). Pure
   consumables have no tube colour and render a neutral well instead. */
type TubeColor = "purple" | "gold" | "grey" | "blue";

type SupplyItem = {
  id: string;
  name: string;
  /* short, plain description of the physical item */
  kind: string;
  tube?: TubeColor;
  onHand: number;
  par: number;
  unit: string;
  /* which test types consume this — one calm meta line */
  consumes: string;
  /* multiple of this pack size is the natural resupply step */
  pack: number;
};

/* Honest mix of states: two over-par, two ok, two low, two out. Status is
   derived below, never stored — it always reflects on-hand vs par. */
const SUPPLIES: SupplyItem[] = [
  {
    id: "edta",
    name: "EDTA tube — purple top",
    kind: "4 mL K2EDTA, whole blood",
    tube: "purple",
    onHand: 220,
    par: 150,
    unit: "tubes",
    consumes: "CBC, HbA1c, blood group, reticulocytes",
    pack: 50,
  },
  {
    id: "sst",
    name: "SST tube — gold top",
    kind: "5 mL serum separator, clot activator",
    tube: "gold",
    onHand: 64,
    par: 160,
    unit: "tubes",
    consumes: "Lipid panel, LFT, U&E, TSH, hormones",
    pack: 50,
  },
  {
    id: "fluoride",
    name: "Fluoride tube — grey top",
    kind: "2 mL sodium fluoride / oxalate",
    tube: "grey",
    onHand: 0,
    par: 60,
    unit: "tubes",
    consumes: "Fasting glucose, OGTT, lactate",
    pack: 25,
  },
  {
    id: "citrate",
    name: "Citrate tube — blue top",
    kind: "2.7 mL 3.2% sodium citrate",
    tube: "blue",
    onHand: 90,
    par: 40,
    unit: "tubes",
    consumes: "PT/INR, aPTT, D-dimer, fibrinogen",
    pack: 25,
  },
  {
    id: "butterfly",
    name: "Butterfly needles 23G",
    kind: "Safety winged set, 0.75\" needle",
    onHand: 38,
    par: 120,
    unit: "sets",
    consumes: "Difficult or fragile veins, paediatric draws",
    pack: 25,
  },
  {
    id: "swabs",
    name: "Alcohol swabs",
    kind: "70% isopropyl, individually wrapped",
    onHand: 410,
    par: 300,
    unit: "swabs",
    consumes: "Every draw — site antisepsis",
    pack: 100,
  },
  {
    id: "gauze",
    name: "Gauze pads 2×2",
    kind: "Sterile cotton, post-draw pressure",
    onHand: 52,
    par: 200,
    unit: "pads",
    consumes: "Every draw — post-puncture pressure",
    pack: 100,
  },
  {
    id: "sharps",
    name: "Sharps bin 5 L",
    kind: "Puncture-proof, locking lid",
    onHand: 0,
    par: 4,
    unit: "bins",
    consumes: "Needle disposal — biohazard custody",
    pack: 2,
  },
];

/* This-week usage — calm awareness, not a metrics cockpit. Static demo figures
   tie draws to tube consumption (a single draw often pulls several tubes). */
const WEEK_DRAWS = 47;
const WEEK_USAGE: Array<{ id: string; label: string; used: number; tube?: TubeColor }> = [
  { id: "edta", label: "EDTA purple", used: 41, tube: "purple" },
  { id: "sst", label: "SST gold", used: 58, tube: "gold" },
  { id: "fluoride", label: "Fluoride grey", used: 19, tube: "grey" },
  { id: "citrate", label: "Citrate blue", used: 12, tube: "blue" },
];

/* Next courier pickup — the cabinet route runs Mon/Wed/Fri. Static demo "today"
   is Sunday, so the next pickup is Monday. */
const NEXT_PICKUP = "Monday, Jun 22";

/* ---- status logic ------------------------------------------------------- */

function statusOf(item: SupplyItem): StockStatus {
  if (item.onHand <= 0) return "out";
  if (item.onHand < item.par) return "low";
  if (item.onHand > item.par) return "over";
  return "ok";
}

const STATUS_META: Record<StockStatus, { label: string; tone: Tone }> = {
  over: { label: "Over par", tone: "neutral" },
  ok: { label: "At par", tone: "success" },
  low: { label: "Low", tone: "warning" },
  out: { label: "Out", tone: "danger" },
};

const TONE_ICON: Record<Tone, (props: IconProps) => React.ReactElement> = {
  success: CheckCircleIcon,
  neutral: CheckCircleIcon,
  warning: ClockIcon,
  danger: WarningIcon,
};

const TUBE_LABEL: Record<TubeColor, string> = {
  purple: "Purple top",
  gold: "Gold top",
  grey: "Grey top",
  blue: "Blue top",
};

/* ---- component ---------------------------------------------------------- */

type Filter = "all" | "attention";

export function SuppliesView() {
  /* Resupply cart: itemId -> requested quantity (in units). */
  const [cart, setCart] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<Filter>("all");
  /* Submit is simulated work — keeps the request from reading as instant/fake
     and guards against a double-fire while it resolves. */
  const [submitting, setSubmitting] = useState(false);
  /* Last submitted request, kept so the page shows an honest "in transit" row
     after a request rather than silently resetting. */
  const [lastRequest, setLastRequest] = useState<
    { count: number; total: number; when: string; ids: string[] } | null
  >(null);

  const decorated = useMemo(
    () =>
      SUPPLIES.map((item) => ({
        item,
        status: statusOf(item),
      })),
    [],
  );

  const attentionItems = decorated.filter(
    (d) => d.status === "low" || d.status === "out",
  );
  const attentionCount = attentionItems.length;

  const cartItems = SUPPLIES.filter((s) => (cart[s.id] ?? 0) > 0);
  const cartUnitTotal = cartItems.reduce((sum, s) => sum + (cart[s.id] ?? 0), 0);

  /* Items already attached to the last courier run. While the cart is empty
     these rows show an inert "Requested · with courier" marker instead of a
     fresh Resupply button, so the doctor can't double-order the same line for
     the same pickup. Re-adding a line to the cart supersedes the marker. */
  const requestedIds = new Set(
    cartItems.length === 0 ? (lastRequest?.ids ?? []) : [],
  );

  /* The "needs attention" filter shows low/out lines that still need a request.
     Once every attention line has been requested (and the cart is empty), the
     filtered view empties out and the "all caught up" card becomes reachable —
     the one place the otherwise-static empty state can be seen. */
  const visible =
    filter === "attention"
      ? decorated.filter(
          (d) =>
            (d.status === "low" || d.status === "out") &&
            !requestedIds.has(d.item.id),
        )
      : decorated;

  /* At least one low/out line is not yet in the cart — keeps the bulk shortcut
     available even after the doctor has hand-added a line. */
  const someAttentionUncarted = attentionItems.some(
    ({ item }) => (cart[item.id] ?? 0) <= 0,
  );

  /* suggested top-up = enough whole packs to clear par. Healthy stock (at/over
     par) has no deficit and is never auto-suggested — those rows are gated out
     of the add flow entirely, so this only ever runs for low/out lines. */
  function suggestFor(item: SupplyItem): number {
    const deficit = Math.max(item.par - item.onHand, 0);
    if (deficit <= 0) return 0;
    return Math.ceil(deficit / item.pack) * item.pack;
  }

  function setQty(id: string, qty: number) {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  function addToCart(item: SupplyItem) {
    const qty = suggestFor(item);
    /* Gated: only low/out lines reach here, so qty is always a real deficit. */
    if (qty <= 0) return;
    setCart((prev) => ({ ...prev, [item.id]: qty }));
    toast.success(`${item.name} added to resupply`, {
      description: `Suggested ${qty} ${item.unit} to clear par.`,
    });
  }

  /* Increment/decrement by one pack. Floors at a single pack — the minus button
     never silently deletes the line (use the explicit remove for that), so the
     "min 1 pack" contract stays visible. */
  function step(item: SupplyItem, dir: 1 | -1) {
    const current = cart[item.id] ?? 0;
    const next = Math.max(item.pack, current + dir * item.pack);
    setQty(item.id, next);
  }

  function addAllLow() {
    const next: Record<string, number> = { ...cart };
    decorated.forEach(({ item, status }) => {
      if (status === "low" || status === "out") {
        const qty = suggestFor(item);
        if (qty > 0) next[item.id] = qty;
      }
    });
    setCart(next);
    toast.success("Low and out-of-stock items added", {
      description: "Quantities suggested to clear each par level.",
    });
  }

  /* Clear is only destructive once the cart holds more than one line — a single
     line is cheap to re-add, but wiping a built-up cart offers an undo. */
  function clearCart() {
    if (submitting) return;
    const prev = cart;
    setCart({});
    if (cartItems.length > 1) {
      toast("Resupply cart cleared", {
        description: `${cartItems.length} lines removed.`,
        action: { label: "Undo", onClick: () => setCart(prev) },
      });
    }
  }

  function submitRequest() {
    if (cartItems.length === 0 || submitting) return;
    /* Snapshot before the commit so Undo can restore the exact cart. */
    const submittedCart = cart;
    const submitted = {
      count: cartItems.length,
      total: cartUnitTotal,
      when: NEXT_PICKUP,
      ids: cartItems.map((s) => s.id),
    };
    setSubmitting(true);
    /* Simulated courier hand-off — fixed delay, deterministic. */
    setTimeout(() => {
      setLastRequest(submitted);
      setCart({});
      /* Keep the attention filter on after a submit so the doctor lands on the
         honest "all caught up" empty when the last low/out line is requested,
         instead of silently jumping back to the full list. */
      setSubmitting(false);
      toast.success("Resupply requested", {
        description: `${submitted.count} ${
          submitted.count === 1 ? "item" : "items"
        } with the ${NEXT_PICKUP} courier.`,
        action: {
          label: "Undo",
          onClick: () => {
            setCart(submittedCart);
            setLastRequest(null);
          },
        },
      });
    }, 600);
  }

  return (
    <div className="sup" aria-label="Specimen supplies">
      {/* ---- intro / route awareness ---- */}
      <header className="sup-intro">
        <div className="sup-intro-copy">
          <p className="sup-eyebrow">Cabinet inventory</p>
          <p className="sup-lede">
            Tubes and draw consumables for specimen collection. Status is set by
            on-hand against par — restock the low and empty lines before the next
            courier run.
          </p>
        </div>
        <div className="sup-route">
          <span aria-hidden className="sup-route-ic">
            <CalendarIcon size={18} variant="stroke" />
          </span>
          <span className="sup-route-copy">
            <strong>Courier route · Mon / Wed / Fri</strong>
            <small>Next pickup {NEXT_PICKUP}</small>
          </span>
        </div>
      </header>

      <div className="sup-grid">
        {/* ---- stock list ---- */}
        <section className="sup-stock" aria-label="Stock list">
          <div className="sup-section-head">
            <h2>
              Stock list
              <Badge appearance="subtle" className="sup-count" tone="neutral">
                {SUPPLIES.length}
              </Badge>
            </h2>
            <div className="sup-head-tools">
              {attentionCount > 0 && (
                <SegHint
                  filter={filter}
                  attentionCount={attentionCount}
                  onChange={setFilter}
                />
              )}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="sup-empty">
              <span aria-hidden className="sup-empty-ic">
                <CheckCircleIcon size={18} variant="stroke" />
              </span>
              <span>
                All caught up — no low or out lines left to request. Switch to
                All to see the full cabinet.
              </span>
            </div>
          ) : (
            <ul className="sup-list">
              {visible.map(({ item, status }) => {
                const meta = STATUS_META[status];
                const Icon = TONE_ICON[meta.tone];
                const inCart = (cart[item.id] ?? 0) > 0;
                const requested = requestedIds.has(item.id);
                /* Only low/out lines are resuppliable. Healthy stock is gated:
                   it shows a quiet "At par"/"Well stocked" label, never a
                   primary add action, so the cabinet can't be over-ordered. */
                const needsResupply = status === "low" || status === "out";
                const pct = Math.min(
                  100,
                  Math.round((item.onHand / item.par) * 100),
                );
                return (
                  <li
                    className={cx("sup-row", `tone-${meta.tone}`)}
                    key={item.id}
                  >
                    <span aria-hidden className="sup-swatch-cell">
                      {item.tube ? (
                        <span
                          className={cx("sup-swatch", `sup-swatch--${item.tube}`)}
                          title={TUBE_LABEL[item.tube]}
                        >
                          <TubeIcon size={16} variant="stroke" />
                        </span>
                      ) : (
                        <span className="sup-swatch sup-swatch--plain">
                          <TubeIcon size={16} variant="stroke" />
                        </span>
                      )}
                    </span>

                    <span className="sup-row-main">
                      <span className="sup-row-title">
                        <strong>{item.name}</strong>
                        <small>{item.kind}</small>
                      </span>
                      <span className="sup-row-consumes">{item.consumes}</span>
                    </span>

                    <span className="sup-row-level">
                      <span className="sup-level-nums">
                        <strong>{item.onHand}</strong>
                        <small>
                          of {item.par} {item.unit} par
                        </small>
                      </span>
                      <span
                        className="sup-bar"
                        role="img"
                        aria-label={`${item.onHand} on hand of ${item.par} par`}
                      >
                        <span
                          className={cx("sup-bar-fill", `fill-${meta.tone}`)}
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                    </span>

                    <span className="sup-row-status">
                      <Badge
                        appearance="subtle"
                        tone={meta.tone}
                        icon={<Icon size={12} variant="stroke" />}
                      >
                        {meta.label}
                      </Badge>
                    </span>

                    <span className="sup-row-action">
                      {inCart ? (
                        <Badge
                          appearance="subtle"
                          tone="neutral"
                          icon={<CheckCircleIcon size={12} variant="stroke" />}
                        >
                          In cart
                        </Badge>
                      ) : requested ? (
                        <Badge
                          appearance="subtle"
                          tone="info"
                          icon={<RefreshIcon size={12} variant="stroke" />}
                          title={`Requested — with the ${lastRequest?.when ?? NEXT_PICKUP} courier`}
                        >
                          Requested
                        </Badge>
                      ) : needsResupply ? (
                        <Button
                          intent="secondary"
                          size="sm"
                          leadingIcon={<PlusIcon size={14} variant="stroke" />}
                          onClick={() => addToCart(item)}
                        >
                          Resupply
                        </Button>
                      ) : (
                        <span
                          className="sup-gated"
                          title="Above par — no resupply needed"
                        >
                          {status === "over" ? "Well stocked" : "At par"}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ---- side rail: cart + usage ---- */}
        <aside className="sup-rail" aria-label="Resupply and usage">
          <section className="sup-cart" aria-label="Resupply cart">
            <div className="sup-rail-head">
              <h3>
                Resupply cart
                {cartItems.length > 0 && (
                  <Badge appearance="subtle" className="sup-count" tone="info">
                    {cartItems.length}
                  </Badge>
                )}
              </h3>
              {attentionCount > 0 && someAttentionUncarted && (
                <button
                  type="button"
                  className="sup-link"
                  onClick={addAllLow}
                >
                  Add all low
                  <ChevronRightIcon aria-hidden size={13} variant="stroke" />
                </button>
              )}
            </div>

            {cartItems.length === 0 ? (
              <div className="sup-cart-empty">
                <span aria-hidden className="sup-empty-ic">
                  <CartIcon size={18} variant="stroke" />
                </span>
                <p>
                  No items selected. Add low or empty lines, then send the request
                  with the next courier.
                </p>
              </div>
            ) : (
              <>
                <ul className="sup-cart-list">
                  {cartItems.map((item) => {
                    const qty = cart[item.id] ?? 0;
                    /* packs is the source of truth for the subtitle — rounding
                       guarantees a clean "N×pack" with no fraction even if a
                       quantity ever desyncs from a pack multiple. */
                    const packs = Math.round(qty / item.pack);
                    const atFloor = qty <= item.pack;
                    return (
                      <li className="sup-cart-row" key={item.id}>
                        <span className="sup-cart-copy">
                          {item.tube ? (
                            <span
                              aria-hidden
                              className={cx(
                                "sup-dot",
                                `sup-dot--${item.tube}`,
                              )}
                            />
                          ) : (
                            <span aria-hidden className="sup-dot sup-dot--plain" />
                          )}
                          <span>
                            <strong>{item.name}</strong>
                            <small>
                              {qty} {item.unit} · {packs}×{item.pack} pack
                            </small>
                          </span>
                        </span>
                        <span className="sup-stepper">
                          <button
                            type="button"
                            aria-label={`Decrease ${item.name}`}
                            disabled={atFloor || submitting}
                            onClick={() => step(item, -1)}
                          >
                            <MinusIcon size={14} variant="stroke" />
                          </button>
                          <span className="sup-stepper-val">{qty}</span>
                          <button
                            type="button"
                            aria-label={`Increase ${item.name}`}
                            disabled={submitting}
                            onClick={() => step(item, 1)}
                          >
                            <PlusIcon size={14} variant="stroke" />
                          </button>
                          <button
                            type="button"
                            className="sup-cart-remove"
                            aria-label={`Remove ${item.name}`}
                            disabled={submitting}
                            onClick={() => setQty(item.id, 0)}
                          >
                            <CloseIcon size={14} variant="stroke" />
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div className="sup-cart-foot">
                  <p className="sup-cart-route">
                    <InfoIcon size={13} variant="stroke" aria-hidden />
                    Goes out with the {NEXT_PICKUP} courier.
                  </p>
                  <div className="sup-cart-actions">
                    <Button
                      intent="secondary"
                      size="sm"
                      disabled={submitting}
                      onClick={clearCart}
                    >
                      Clear
                    </Button>
                    <Button
                      intent="primary"
                      size="sm"
                      loading={submitting}
                      leadingIcon={<CartIcon size={14} variant="stroke" />}
                      onClick={submitRequest}
                    >
                      {submitting
                        ? "Requesting…"
                        : `Request resupply (${cartUnitTotal})`}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {lastRequest && cartItems.length === 0 && (
              <div className="sup-pending tone-info">
                <span aria-hidden className="sup-tone-icon">
                  <RefreshIcon size={16} variant="stroke" />
                </span>
                <span className="sup-pending-copy">
                  <strong>
                    {lastRequest.count}{" "}
                    {lastRequest.count === 1 ? "item" : "items"} requested
                  </strong>
                  <small>
                    {lastRequest.total} units · with the {lastRequest.when}{" "}
                    courier
                  </small>
                </span>
              </div>
            )}
          </section>

          <section className="sup-usage" aria-label="This week's usage">
            <div className="sup-rail-head">
              <h3>This week</h3>
              <span className="sup-usage-draws">{WEEK_DRAWS} draws</span>
            </div>
            <p className="sup-usage-note">
              Tubes consumed since Monday — one draw often pulls several tubes.
            </p>
            <ul className="sup-usage-list">
              {WEEK_USAGE.map((u) => (
                <li className="sup-usage-row" key={u.id}>
                  <span className="sup-usage-label">
                    {u.tube ? (
                      <span
                        aria-hidden
                        className={cx("sup-dot", `sup-dot--${u.tube}`)}
                      />
                    ) : null}
                    {u.label}
                  </span>
                  <span className="sup-usage-count">{u.used}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

/* Small inline filter — all vs. needs attention. Kept as a component so the
   header stays readable. */
function SegHint({
  filter,
  attentionCount,
  onChange,
}: {
  filter: Filter;
  attentionCount: number;
  onChange: (f: Filter) => void;
}) {
  return (
    <div className="sup-seg" role="group" aria-label="Filter stock">
      <button
        type="button"
        aria-pressed={filter === "all"}
        className={cx("sup-seg-btn", filter === "all" && "is-active")}
        onClick={() => onChange("all")}
      >
        All
      </button>
      <button
        type="button"
        aria-pressed={filter === "attention"}
        className={cx("sup-seg-btn", filter === "attention" && "is-active")}
        onClick={() => onChange("attention")}
      >
        Needs attention
        <span className="sup-seg-count">{attentionCount}</span>
      </button>
    </div>
  );
}

export default SuppliesView;

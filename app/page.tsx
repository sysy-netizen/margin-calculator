"use client";

// codivostudio-web(Astro)의 /tools/margin-calculator/ 페이지가 이 앱을 iframe/프록시로
// 감쌀 예정입니다 (excel-converter와 동일한 패턴). 헤더/제목/설명은 그쪽 ProgramLayout이
// 렌더링하므로, 여기서는 도구 UI만 그립니다.
//
// 상품 등록 전에 판매가를 정하는 단일 상품 계산기입니다. 부가세 계산은
// api/_lib/config.py 의 supply_and_vat(일반과세, 매입세액 공제 가정)과 같은 방식입니다.
// 정산 후 계산(api/_lib/calculator.py)과 같은 식을 쓰되, 택배비·기타비용을 추가로 반영합니다.

import { useEffect, useState } from "react";

type Mode = "forward" | "reverse";
type TargetType = "margin" | "profit";

// 부가세 포함 금액에서 부가세가 차지하는 비율 (0.1 / 1.1)
const VAT_SHARE = 0.1 / 1.1;

type Inputs = {
  cost: string;
  costIncludesVat: boolean;
  shipCost: string;
  shipVatDeductible: boolean;
  customerShip: string;
  otherCost: string;
  npayRate: string;
  salesRate: string;
  price: string;
  targetType: TargetType;
  targetMargin: string;
  targetProfit: string;
  roundUnit: string;
};

const INITIAL: Inputs = {
  cost: "",
  costIncludesVat: true,
  shipCost: "0",
  shipVatDeductible: true,
  customerShip: "0",
  otherCost: "0",
  // 건별정산내역 실측치: 10,900원 주문에 결제수수료 395원, 판매수수료 327원 (VAT 포함)
  npayRate: "3.63",
  salesRate: "3.003",
  price: "",
  targetType: "margin",
  targetMargin: "20",
  targetProfit: "",
  roundUnit: "10",
};

// 매번 다시 입력하기 번거로운 설정값만 브라우저에 기억합니다 (상품별 값은 저장하지 않음)
const SETTINGS_KEY = "margin-calculator:settings";
const SETTING_KEYS = [
  "npayRate",
  "salesRate",
  "roundUnit",
  "costIncludesVat",
  "shipVatDeductible",
] as const;

// 마진율별 판매가 비교표에 보여줄 목표 마진율(%)
const COMPARE_MARGINS = [10, 15, 20, 25, 30, 40];

function num(value: string): number {
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function won(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

type Breakdown = {
  price: number;
  customerShip: number;
  revenue: number;
  fee: number;
  cost: number;
  shipCost: number;
  otherCost: number;
  outputVat: number;
  inputVat: number;
  vatPayable: number;
  profit: number;
  margin: number;
  markup: number;
};

type Params = {
  cost: number;
  shipCost: number;
  shipVatDeductible: boolean;
  customerShip: number;
  otherCost: number;
  feeRate: number;
};

function params(inp: Inputs): Params {
  const costInput = num(inp.cost);
  return {
    cost: inp.costIncludesVat ? costInput : costInput * 1.1,
    shipCost: num(inp.shipCost),
    shipVatDeductible: inp.shipVatDeductible,
    customerShip: num(inp.customerShip),
    otherCost: num(inp.otherCost),
    feeRate: (num(inp.npayRate) + num(inp.salesRate)) / 100,
  };
}

// 판매가(부가세 포함) → 순이익/마진
function forward(price: number, p: Params): Breakdown {
  const revenue = price + p.customerShip;
  const fee = revenue * p.feeRate;
  const outputVat = revenue * VAT_SHARE;
  const inputVat =
    (p.cost + fee + (p.shipVatDeductible ? p.shipCost : 0)) * VAT_SHARE;
  const vatPayable = outputVat - inputVat;
  const profit =
    revenue - p.cost - fee - p.shipCost - p.otherCost - vatPayable;
  return {
    price,
    customerShip: p.customerShip,
    revenue,
    fee,
    cost: p.cost,
    shipCost: p.shipCost,
    otherCost: p.otherCost,
    outputVat,
    inputVat,
    vatPayable,
    profit,
    margin: price > 0 ? profit / price : 0,
    markup: p.cost > 0 ? profit / p.cost : 0,
  };
}

// 순이익 = (1-k)[(1-f)(P+D) - C] - S(1-k·t) - E 이므로 P에 대해 일차식 → 한 번에 역산
function reversePrice(
  p: Params,
  target: { type: TargetType; margin: number; profit: number },
): number | null {
  const keep = 1 - VAT_SHARE;
  const k = keep * (1 - p.feeRate);
  const fixed =
    keep * p.cost +
    p.shipCost * (1 - (p.shipVatDeductible ? VAT_SHARE : 0)) +
    p.otherCost -
    k * p.customerShip;

  if (target.type === "profit") {
    if (k <= 0) return null;
    return (target.profit + fixed) / k;
  }
  const denominator = k - target.margin;
  if (denominator <= 0) return null;
  return fixed / denominator;
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div className="cs-field cs-calc-field">
      <label>{props.label}</label>
      <div className="cs-calc-input">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
        />
        {props.suffix ? <span>{props.suffix}</span> : null}
      </div>
      {props.hint ? <p className="cs-field__hint">{props.hint}</p> : null}
    </div>
  );
}

function Check(props: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="cs-calc-check">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      {props.label}
    </label>
  );
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("reverse");
  const [inp, setInp] = useState<Inputs>(INITIAL);

  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const set = <K extends keyof Inputs>(key: K, value: Inputs[K]) =>
    setInp((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Inputs>;
        setInp((prev) => {
          const next = { ...prev };
          for (const key of SETTING_KEYS) {
            if (typeof parsed[key] === typeof prev[key]) {
              (next as Record<string, unknown>)[key] = parsed[key];
            }
          }
          return next;
        });
      }
    } catch {
      // 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서는 기본값으로 동작
    }
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    try {
      const toSave: Record<string, unknown> = {};
      for (const key of SETTING_KEYS) toSave[key] = inp[key];
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave));
    } catch {
      // 무시
    }
  }, [settingsLoaded, inp]);

  const p = params(inp);
  const hasCost = num(inp.cost) > 0;

  let price: number | null = null;
  let error = "";

  if (mode === "forward") {
    price = num(inp.price) > 0 ? num(inp.price) : null;
  } else if (hasCost) {
    const raw = reversePrice(p, {
      type: inp.targetType,
      margin: num(inp.targetMargin) / 100,
      profit: num(inp.targetProfit),
    });
    if (raw === null || raw <= 0) {
      error =
        "이 조건으로는 판매가를 계산할 수 없습니다. 목표 마진율이 수수료와 부가세를 뺀 한도보다 높습니다.";
    } else {
      const unit = Math.max(1, num(inp.roundUnit));
      price = Math.ceil(raw / unit) * unit;
    }
  }

  const result = price !== null && hasCost ? forward(price, p) : null;
  const negative = result !== null && result.profit < 0;

  // 목표 마진율별 판매가 비교 (같은 비용 조건, 같은 올림 단위)
  const compareRows =
    mode === "reverse" && hasCost
      ? COMPARE_MARGINS.map((m) => {
          const raw = reversePrice(p, {
            type: "margin",
            margin: m / 100,
            profit: 0,
          });
          if (raw === null || raw <= 0) return { margin: m, row: null };
          const unit = Math.max(1, num(inp.roundUnit));
          return { margin: m, row: forward(Math.ceil(raw / unit) * unit, p) };
        })
      : [];

  return (
    <main className="cs-page">
      <p className="cs-tool-desc">
        상품을 등록하기 전에 원가와 비용을 넣어 판매가를 정하거나, 정해 둔 판매가의 예상
        마진을 확인합니다. (네이버 스마트스토어 기준, 일반과세자)
      </p>

      <div className="cs-calc-modes" role="tablist" aria-label="계산 방식">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "reverse"}
          className={mode === "reverse" ? "is-active" : ""}
          onClick={() => setMode("reverse")}
        >
          목표 마진 → 판매가
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "forward"}
          className={mode === "forward" ? "is-active" : ""}
          onClick={() => setMode("forward")}
        >
          판매가 → 마진
        </button>
      </div>

      <div className="cs-calc-layout">
        <section className="cs-calc-panel">
          <h2>입력</h2>

          <Field
            label="매입원가"
            value={inp.cost}
            onChange={(v) => set("cost", v)}
            suffix="원"
          />
          <Check
            label="원가에 부가세 포함"
            checked={inp.costIncludesVat}
            onChange={(v) => set("costIncludesVat", v)}
          />

          <Field
            label="택배비 (셀러 부담)"
            value={inp.shipCost}
            onChange={(v) => set("shipCost", v)}
            suffix="원"
          />
          <Check
            label="택배비 매입세액 공제"
            checked={inp.shipVatDeductible}
            onChange={(v) => set("shipVatDeductible", v)}
          />

          <Field
            label="고객이 내는 배송비"
            value={inp.customerShip}
            onChange={(v) => set("customerShip", v)}
            suffix="원"
            hint="무료배송이면 0. 배송비에도 결제수수료가 붙습니다."
          />
          <Field
            label="광고비·포장비 등 기타 비용"
            value={inp.otherCost}
            onChange={(v) => set("otherCost", v)}
            suffix="원"
            hint="부가세 공제 없이 그대로 비용으로 계산합니다."
          />

          <div className="cs-calc-row">
            <Field
              label="결제수수료율"
              value={inp.npayRate}
              onChange={(v) => set("npayRate", v)}
              suffix="%"
            />
            <Field
              label="판매수수료율"
              value={inp.salesRate}
              onChange={(v) => set("salesRate", v)}
              suffix="%"
            />
          </div>
          <p className="cs-field__hint">
            기본값은 건별정산내역에서 확인한 값(부가세 포함)입니다. 결제수단·유입경로·등급에
            따라 달라질 수 있고 네이버 정책에 따라 바뀌므로 본인 정산내역과 맞는지 확인하세요.
          </p>

          <hr className="cs-calc-sep" />

          {mode === "forward" ? (
            <Field
              label="판매가 (부가세 포함)"
              value={inp.price}
              onChange={(v) => set("price", v)}
              suffix="원"
            />
          ) : (
            <>
              <div className="cs-calc-radios">
                <label>
                  <input
                    type="radio"
                    name="target"
                    checked={inp.targetType === "margin"}
                    onChange={() => set("targetType", "margin")}
                  />
                  목표 마진율
                </label>
                <label>
                  <input
                    type="radio"
                    name="target"
                    checked={inp.targetType === "profit"}
                    onChange={() => set("targetType", "profit")}
                  />
                  목표 순이익
                </label>
              </div>
              {inp.targetType === "margin" ? (
                <Field
                  label="목표 마진율 (판매가 대비 순이익)"
                  value={inp.targetMargin}
                  onChange={(v) => set("targetMargin", v)}
                  suffix="%"
                />
              ) : (
                <Field
                  label="목표 순이익 (1개당)"
                  value={inp.targetProfit}
                  onChange={(v) => set("targetProfit", v)}
                  suffix="원"
                />
              )}
              <Field
                label="판매가 올림 단위"
                value={inp.roundUnit}
                onChange={(v) => set("roundUnit", v)}
                suffix="원"
                hint="계산된 가격을 이 단위로 올림합니다. 예: 10 → 12,340원"
              />
            </>
          )}
        </section>

        <section className="cs-calc-panel">
          <h2>결과</h2>

          {error ? <div className="cs-status cs-status--error">{error}</div> : null}

          {!result && !error ? (
            <div className="cs-status cs-status--progress">
              매입원가
              {mode === "forward" ? "와 판매가를" : "를"} 입력하면 결과가 표시됩니다.
            </div>
          ) : null}

          {result ? (
            <>
              <div className="cs-calc-hero">
                {mode === "reverse" ? (
                  <div>
                    <span className="cs-calc-hero__label">권장 판매가</span>
                    <strong>{won(result.price)}</strong>
                  </div>
                ) : null}
                <div>
                  <span className="cs-calc-hero__label">순이익</span>
                  <strong className={negative ? "is-negative" : ""}>
                    {won(result.profit)}
                  </strong>
                </div>
                <div>
                  <span className="cs-calc-hero__label">마진율</span>
                  <strong className={negative ? "is-negative" : ""}>
                    {pct(result.margin)}
                  </strong>
                </div>
              </div>

              {negative ? (
                <div className="cs-status cs-status--error">
                  이 가격에서는 팔수록 손해입니다.
                </div>
              ) : null}

              <table className="cs-calc-table">
                <tbody>
                  <tr>
                    <th>판매가</th>
                    <td>{won(result.price)}</td>
                  </tr>
                  {result.customerShip > 0 ? (
                    <tr>
                      <th>고객 배송비</th>
                      <td>{won(result.customerShip)}</td>
                    </tr>
                  ) : null}
                  <tr className="is-sub">
                    <th>매출 합계</th>
                    <td>{won(result.revenue)}</td>
                  </tr>
                  <tr>
                    <th>수수료 (결제 + 판매)</th>
                    <td>-{won(result.fee)}</td>
                  </tr>
                  <tr>
                    <th>매입원가</th>
                    <td>-{won(result.cost)}</td>
                  </tr>
                  {result.shipCost > 0 ? (
                    <tr>
                      <th>택배비</th>
                      <td>-{won(result.shipCost)}</td>
                    </tr>
                  ) : null}
                  {result.otherCost > 0 ? (
                    <tr>
                      <th>기타 비용</th>
                      <td>-{won(result.otherCost)}</td>
                    </tr>
                  ) : null}
                  <tr>
                    <th>
                      납부할 부가세
                      <small>
                        매출세액 {won(result.outputVat)} − 매입세액 {won(result.inputVat)}
                      </small>
                    </th>
                    <td>-{won(result.vatPayable)}</td>
                  </tr>
                  <tr className="is-total">
                    <th>순이익</th>
                    <td className={negative ? "is-negative" : ""}>{won(result.profit)}</td>
                  </tr>
                </tbody>
              </table>

              <p className="cs-tool-footnote">
                원가 대비 마크업 {pct(result.markup)} · 부가세까지 반영한 금액이며 소득세는
                반영하지 않았습니다. 매입 세금계산서를 항상 받는다고 가정합니다.
              </p>
            </>
          ) : null}
        </section>
      </div>

      {compareRows.length > 0 ? (
        <section className="cs-calc-panel cs-calc-compare">
          <h2>마진율별 판매가 비교</h2>
          <table className="cs-calc-table cs-calc-table--compare">
            <thead>
              <tr>
                <th>목표 마진율</th>
                <th>판매가</th>
                <th>순이익</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map(({ margin, row }) => (
                <tr
                  key={margin}
                  className={
                    inp.targetType === "margin" && num(inp.targetMargin) === margin
                      ? "is-picked"
                      : ""
                  }
                  onClick={() => {
                    set("targetType", "margin");
                    set("targetMargin", String(margin));
                  }}
                >
                  <th>{margin}%</th>
                  <td>{row ? won(row.price) : "계산 불가"}</td>
                  <td>{row ? won(row.profit) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cs-tool-footnote">행을 누르면 그 마진율로 위 결과가 바뀝니다.</p>
        </section>
      ) : null}
    </main>
  );
}

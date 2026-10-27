# -*- coding: utf-8 -*-
"""
calculator.py
==============
정산내역(A파일)에서 주문번호 기준으로 상품주문 행 + 배송비 행을 묶어서,
매출세액·수수료·(원가가 있다면) 매입세액·순이익까지 계산합니다.

원가는 아직 매칭 로직이 없어서(B파일=원가표 샘플 확인 전), 이 단계에서는
`cost` 인자를 넘기지 않으면 매출세액·수수료까지만 계산됩니다.
"""

from typing import Dict, List, Optional
import pandas as pd

from . import config


def _clean(value) -> str:
    text = str(value).strip()
    if text.endswith(".0"):
        text = text[:-2]
    return text


def build_order_rows(a_df: pd.DataFrame) -> List[Dict]:
    """
    A파일 원본 표(raw DataFrame)를 받아서, 주문번호 단위로 묶은 행 목록을 돌려줍니다.
    (상품주문 행에 같은 주문번호의 배송비 행을 합산해서 붙입니다)

    반환되는 각 항목:
        {
            "주문번호": "...",
            "상품주문번호": "...",   # 원가표 매칭 기준 (추후 사용)
            "상품명": "...",
            "정산기준금액_상품": ...,   # 부가세 과세표준 (상품분)
            "정산기준금액_배송비": ...,  # 부가세 과세표준 (배송비분)
            "수수료합계": ...,          # Npay수수료 + 매출연동수수료 (상품행+배송비행 합산, 음수)
            "정산예정금액": ...,         # 참고용 (부가세 계산엔 사용 안 함)
        }
    """
    data = a_df.iloc[config.A_DATA_START_ROW:].reset_index(drop=True)

    product_rows: Dict[str, Dict] = {}
    delivery_by_order: Dict[str, Dict] = {}

    for i in range(len(data)):
        row_type = _clean(data.iloc[i, config.A_COL_TYPE])
        order_no = _clean(data.iloc[i, config.A_COL_ORDER_NO])
        settlement_base = float(data.iloc[i, config.A_COL_SETTLEMENT_BASE] or 0)
        npay_fee = float(data.iloc[i, config.A_COL_NPAY_FEE] or 0)
        sales_fee = float(data.iloc[i, config.A_COL_SALES_FEE] or 0)
        settlement_amount = float(data.iloc[i, config.A_COL_SETTLEMENT_AMOUNT] or 0)

        if row_type == config.A_TYPE_PRODUCT:
            product_rows[order_no] = {
                "주문번호": order_no,
                "상품주문번호": _clean(data.iloc[i, config.A_COL_PRODUCT_ORDER_NO]),
                "상품명": _clean(data.iloc[i, config.A_COL_PRODUCT_NAME]),
                "정산기준금액_상품": settlement_base,
                "정산기준금액_배송비": 0.0,
                "수수료합계": npay_fee + sales_fee,
                "정산예정금액": settlement_amount,
            }
        elif row_type == config.A_TYPE_DELIVERY:
            prev = delivery_by_order.get(order_no, {"base": 0.0, "fee": 0.0, "amount": 0.0})
            delivery_by_order[order_no] = {
                "base": prev["base"] + settlement_base,
                "fee": prev["fee"] + npay_fee + sales_fee,
                "amount": prev["amount"] + settlement_amount,
            }

    for order_no, delivery in delivery_by_order.items():
        row = product_rows.get(order_no)
        if row is None:
            # 상품주문 행 없이 배송비 행만 있는 경우는 실제 데이터에선 안 나와야 하지만,
            # 놓치지 않도록 별도 항목으로 남겨둡니다.
            product_rows[order_no] = {
                "주문번호": order_no,
                "상품주문번호": "",
                "상품명": "(배송비만 있는 주문 — 확인 필요)",
                "정산기준금액_상품": 0.0,
                "정산기준금액_배송비": delivery["base"],
                "수수료합계": delivery["fee"],
                "정산예정금액": delivery["amount"],
            }
            continue
        row["정산기준금액_배송비"] = delivery["base"]
        row["수수료합계"] += delivery["fee"]
        row["정산예정금액"] += delivery["amount"]

    return list(product_rows.values())


def compute_vat_and_margin(order_row: Dict, cost: Optional[float] = None) -> Dict:
    """
    order_row: build_order_rows()가 돌려준 항목 하나.
    cost: 이 주문의 매입원가(부가세 포함 금액). 아직 원가표 매칭이 없으면 None.

    반환값에 부가세·(원가가 있으면) 순이익까지 채워서 돌려줍니다.
    """
    total_sales = order_row["정산기준금액_상품"] + order_row["정산기준금액_배송비"]
    fee_total = -order_row["수수료합계"]  # 원본은 음수라 양수로 뒤집음

    _, output_vat = config.supply_and_vat(total_sales)
    _, fee_input_vat = config.supply_and_vat(fee_total)

    result = {
        **order_row,
        "매출액(부가세포함)": total_sales,
        "매출세액": output_vat,
        "수수료(부가세포함)": fee_total,
        "수수료_매입세액": fee_input_vat,
    }

    if cost is not None:
        _, cost_input_vat = config.supply_and_vat(cost)
        input_vat_total = cost_input_vat + fee_input_vat
        vat_payable = output_vat - input_vat_total
        net_profit = total_sales - cost - fee_total - vat_payable

        result.update({
            "원가(부가세포함)": cost,
            "원가_매입세액": cost_input_vat,
            "납부할부가세": vat_payable,
            "순이익": net_profit,
        })

    return result

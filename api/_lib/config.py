# -*- coding: utf-8 -*-
"""
config.py
=========
프로그램 전체에서 쓰는 '고정값'을 모아둔 파일입니다.
실제 컬럼 위치는 네이버 "건별정산내역" 다운로드 파일(SettleCaseByCase.xlsx)의
실제 샘플을 열어서 확인한 값입니다.
"""


# ── A파일 (네이버 "건별정산내역" 다운로드 파일) 설정 ──────────────────
# 비밀번호 없음(암호화 안 되어 있음). header 없이(raw) 읽어서 행 번호로 접근합니다.
A_DATA_START_ROW = 1              # 실제 데이터가 시작하는 행 (0부터 세는 인덱스, 엑셀상 2행)

A_COL_ORDER_NO = 1                # B열: 주문번호 (상품주문 행과 배송비 행을 묶는 기준)
A_COL_PRODUCT_ORDER_NO = 2        # C열: 상품주문번호 (원가표 매칭 기준 — 상품주문 행에서만 의미 있음)
A_COL_TYPE = 3                    # D열: 구분 ("상품주문" / "배송비")
A_COL_PRODUCT_NAME = 4            # E열: 상품명
A_COL_SETTLEMENT_BASE = 13        # N열: 정산기준금액 — 부가세 과세표준(매출세액 계산 기준)으로 써야 하는 값
A_COL_NPAY_FEE = 14               # O열: Npay 수수료 (음수로 들어있음)
A_COL_SALES_FEE = 15              # P열: 매출 연동 수수료 합계 (스마트스토어 판매수수료, 음수. 배송비 행은 0)
A_COL_SETTLEMENT_AMOUNT = 18      # S열: 정산예정금액 — 실제 입금액(순수령액). 과세표준으로 쓰면 안 됨.

A_TYPE_PRODUCT = "상품주문"
A_TYPE_DELIVERY = "배송비"


# ── B파일 (원가표) 설정 ─────────────────────────────────────────────
# TODO: 실제 원가표 샘플을 받으면 채우기 (상품명/상품번호 중 어떤 걸로 매칭할지,
# 원가가 어느 열에 있는지 등). 그 전까지는 매출세액·수수료 계산까지만 가능합니다.


# ── 부가세 계산 ──────────────────────────────────────────────────────
# 일반과세자, 매입 시 세금계산서 항상 수취(매입세액공제 항상 적용) 가정.
VAT_RATE = 0.1


def supply_and_vat(amount_incl_vat: float) -> tuple[float, float]:
    """부가세 포함 금액을 (공급가액, 부가세)로 분리합니다."""
    supply = amount_incl_vat / (1 + VAT_RATE)
    vat = amount_incl_vat - supply
    return supply, vat

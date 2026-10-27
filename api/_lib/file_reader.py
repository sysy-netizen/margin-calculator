# -*- coding: utf-8 -*-
"""
file_reader.py
===============
A파일(네이버 "건별정산내역" 다운로드 파일)을 '읽기만' 담당합니다.
암호화되어 있지 않아 excel_merge의 네이버 파일과 달리 복호화 과정이 없습니다.
"""

import pandas as pd


def read_settlement_file(source) -> pd.DataFrame:
    """
    A파일(네이버 "건별정산내역", 예: SettleCaseByCase.xlsx)을 읽습니다.
    반환값은 헤더 없이(raw) 읽은 전체 표입니다. (행/열 번호로 접근)

    source: 파일 경로(str) 또는 이미 열려 있는 파일 객체(예: 업로드 파일) 둘 다 가능합니다.
    """
    return pd.read_excel(source, header=None)

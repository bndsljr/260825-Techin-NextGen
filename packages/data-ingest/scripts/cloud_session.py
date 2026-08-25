#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
云平台 SSO 登录 + 只读抓取（Crawler 底层）

复用要点：
  login() -> requests.Session（已通过 partner/CAS 登录 bnds.idsp.yunxiao.com）
  get_json(session, url) / get_text(...) 为只读 GET 封装

只做只读：登录POST + 后续全部 GET，绝不调用任何写接口。
"""
import json
import os
import requests

BASE = os.path.dirname(os.path.abspath(__file__))
CREDS_FILE = os.path.join(BASE, ".credentials.json")

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

def load_creds():
    with open(CREDS_FILE, encoding="utf-8") as f:
        return json.load(f)

def _new_session():
    s = requests.Session()
    s.headers.update({
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    })
    return s

def login(creds=None):
    """走 partner + CAS 登录，返回已认证的 requests.Session"""
    creds = creds or load_creds()
    user = creds["username"]
    pwd = creds["password"]
    service = creds["service"]
    domain = service.split("//")[1].split(".")[0]

    s = _new_session()
    # 1) partner 登录页（拿初始 cookie / 结构）
    page = s.get("https://account-wan.yunxiao.com/partner",
                 params={"service": service}, timeout=25)
    # 2) 提交登录
    payload = {
        "loginName": user,
        "password": pwd,
        "domain": domain,
        "captchaCode": "",
        "captchaValue": "",
        "rememberMe": "false",
        "service": service,
    }
    headers = {
        "Referer": page.url,
        "Origin": "https://account-wan.yunxiao.com",
        "X-Requested-With": "XMLHttpRequest",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    }
    lr = s.post("https://account-wan.yunxiao.com/", data=payload,
                headers=headers, timeout=25)
    j = lr.json()
    if "service" not in j:
        raise RuntimeError("登录失败: %s" % j)
    # 3) 跟随 CAS service 回跳，落定 bnds 会话
    s.get(j["service"], allow_redirects=True, timeout=25)
    # 4) 确保进入门户主页
    s.get("https://bnds.idsp.yunxiao.com/Portal/LayoutD/Default.aspx",
          allow_redirects=True, timeout=25)
    if not s.cookies.get(".ASPXAUTH"):
        raise RuntimeError("未能获取 bnds 会话 cookie (.ASPXAUTH)")
    return s

def get_text(session, url, **kw):
    kw.setdefault("timeout", 25)
    r = session.get(url, **kw)
    r.raise_for_status()
    return r.text

def get_json(session, url, **kw):
    kw.setdefault("timeout", 25)
    kw.setdefault("headers", {})
    kw["headers"].setdefault("X-Requested-With", "XMLHttpRequest")
    kw["headers"].setdefault("Accept", "application/json, text/javascript, */*; q=0.01")
    r = session.get(url, **kw)
    r.raise_for_status()
    try:
        return r.json()
    except ValueError:
        return {"_raw": r.text}

if __name__ == "__main__":
    sess = login()
    print("登录成功，cookies:", sorted(sess.cookies.get_dict().keys()))

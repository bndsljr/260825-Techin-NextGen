#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
十一云平台爬虫（只读）→ 产出 CloudRawPayload（data-ingest 适配器消费的中间格式）

流程：
  1. SSO 登录（account-wan 云校帐号 → CAS 回到 bnds）
  2. GetCourseMax 取当前学期/学段/学生
  3. GetStudentCourseList → 课表（courseGroupList[32]）
  4. MyStudentInfo → 个人档案
  5. MyEvalResult/List2 + StudentPED/List → 过程性评价（当前多半"暂未评价"）

输出：CloudRawPayload JSON（course 行已转成归一化别名字段，供 TS toCourse 消费）
用法：python3 cloud_crawler.py [--out path]
"""
import json
import os
import re
import sys
import argparse
import cloud_session as cs

B = "https://bnds.idsp.yunxiao.com"
SCRATCH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".scratch")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    sess = cs.login()
    out = {
        "studentId": None,
        "schoolPeriodId": None,
        "schoolPeriodName": None,
        "learnSection": None,
        "courses": [],
        "assessments": [],
        "grades": [],
        "profile": None,
        "raw_meta": {"source": "cloud", "fetched_at": None, "raw_format": "cloud-api", "conflicts": [], "warnings": []},
    }

    # 1) 当前上下文
    cm = cs.get_json(sess, B + "/BaseInfos/TimeTable/GetCourseMax?ax=1").get("data", {})
    sid = cm.get("studentId")
    spid = cm.get("schoolPeriodId")
    sec = cm.get("learnSection")  # "1"（学段代码）
    out["studentId"], out["schoolPeriodId"], out["learnSection"] = sid, spid, sec

    sps = cs.get_json(sess, B + "/BaseInfos/TimeTable/GetSchoolPeriods?ax=1").get("data", [])
    name_of = {x["Id"]: x["Name"] for x in sps}
    out["schoolPeriodName"] = name_of.get(spid)
    if out["raw_meta"]["fetched_at"] is None:
        out["raw_meta"]["fetched_at"] = cm.get("updatedTime") or None

    # 2) 课表
    if sid and spid and sec:
        cgl = cs.get_json(sess, B + "/BaseInfos/TimeTable/GetStudentCourseList?ax=1",
                          params={"studentId": sid, "schoolPeriodId": spid, "learnSectionId": sec}).get("data", {}).get("courseGroupList", [])
        seen = set()
        for it in cgl:
            cid = it.get("courseGroupId")
            wt = it.get("whatTime")
            if not cid or not wt:
                out["raw_meta"]["conflicts"].append({"kind": "course_missing_id", "message": "课表行缺 courseGroupId/whatTime", "raw": it})
                continue
            key = f"{cid}:{wt}"
            if key in seen:
                continue
            seen.add(key)
            day = int(str(wt)[0])  # whatTime = `${day}${period}`
            time = (it.get("classTime") or "").split("-")
            st = (time[0].strip() if len(time) > 0 else None) or None
            et = (time[1].strip() if len(time) > 1 else None) or None
            name = it.get("courseGroupName", "")
            out["courses"].append({
                "external_id": key,
                "name": name,
                "teacher": it.get("teacherName") or None,
                "room": it.get("roomName") or None,
                "day_of_week": day,
                "start_time": st,
                "end_time": et,
                "week_parity": "all",
                "term": out["schoolPeriodName"],
                "category": classify_course(name),
            })

    # 3) 个人档案
    prof = fetch_profile(sess)
    out["profile"] = prof

    # 4) 过程性评价（当前多半"暂未评价"）
    assess, warn = fetch_assessments(sess, sid, spid, sec)
    out["assessments"] = assess
    out["raw_meta"]["warnings"] += warn

    # 5) 学生年级（从课表 studentName 提取，如 "李佳睿(高一)"）
    if out["profile"] and not out["profile"].get("gradeLevel"):
        gname = cs.get_json(sess, B + "/BaseInfos/TimeTable/GetStudentCourseList?ax=1",
                            params={"studentId": sid, "schoolPeriodId": spid, "learnSectionId": sec}).get("data", {}).get("studentName", "")
        m = re.search(r"[\(（]([^)）]+)[\)）]", gname or "")
        if m:
            out["profile"]["gradeLevel"] = m.group(1)

    payload = dump_payload(out)
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    if args.out:
        os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
        open(args.out, "w", encoding="utf-8").write(text)
        print("written:", args.out)
    else:
        print(text)

    # 统计
    print(f"\n[stats] courses={len(payload['courses'])} assessments={len(payload['assessments'])} grades={len(payload['grades'])} profile={bool(payload['profile'])}",
          file=sys.stderr)

def classify_course(name: str) -> str:
    if any(k in name for k in ["皮划艇", "工程", "创意", "艺术", "体育", "游泳", "社团", "工匠", "木工", "机器人"]):
        return "elective"
    if "自习" in name:
        return "self_study"
    return "required"

def fetch_profile(sess):
    try:
        html = cs.get_text(sess, B + "/BaseInfos/StudentInfoTG/MyStudentInfo")
    except Exception:
        return None
    vals = {}
    # 解析 name= 的 input/select 值
    for m in re.finditer(r'<(input|select)[^>]*>', html):
        tag = m.group(0)
        name = re.search(r'name="([^"]+)"', tag)
        if not name:
            continue
        n = name.group(1)
        if n.startswith("StudentHouseHolder") or n in ("PicName", "HId", "Coursegroups", "AwardInformation"):
            continue
        val = re.search(r'value="([^"]*)"', tag)
        vals[n] = val.group(1) if val else None
    # 云平台性别字段不可采信，一律不提取（gender 由可信来源人工确认后可选填）
    guardians = []
    gm = re.search(r'<input[^>]*name="StudentHouseHolders\.HouseHolder\.Name"[^>]*value="([^"]*)"', html)
    if gm:
        guardians.append({"name": gm.group(1)})
    return {
        "studentId": "",  # 由调用方在归一化时填；这里保留占位
        "name": vals.get("Name"),
        "studyCode": vals.get("StudyCode"),
        "englishName": vals.get("NameChineseEnglish"),
        "birthday": vals.get("Birthday"),
        "mobile": vals.get("Mobile"),
        "schoolYear": vals.get("SchoolYear"),
        "guardians": guardians,
    }

def fetch_assessments(sess, sid, spid, sec):
    """尝试拉取过程性评价汇总。当前数据多为"暂未评价"，返回空 + 说明。"""
    warnings = []
    if not (sid and spid and sec):
        return [], ["缺少上下文，未拉取过程性评价"]
    try:
        html = cs.get_text(sess, B + "/Eval/MyEvalResult/List2",
                           params={"ax": "1", "SchoolPeriodId": spid, "StudentId": sid,
                                   "SectionCode": sec, "processViewMode": "summary"})
    except Exception as e:
        return [], [f"过程性评价拉取失败: {e}"]
    if "暂未评价" in html or "暂未评价" in html:
        warnings.append("过程性评价：本学期暂未评价")
    return [], warnings

def dump_payload(out):
    profile = out["profile"]
    if profile:
        profile["studentId"] = out["studentId"] or ""
    p = {
        "studentId": out["studentId"],
        "schoolPeriodId": out["schoolPeriodId"],
        "schoolPeriodName": out["schoolPeriodName"],
        "learnSection": out["learnSection"],
        "profile": profile,
        "courses": out["courses"],
        "assessments": out["assessments"],
        "grades": out["grades"],
        "raw_meta": out["raw_meta"],
    }
    return p

if __name__ == "__main__":
    main()

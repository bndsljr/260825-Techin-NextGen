import Foundation
import EventKit
import SwiftUI

/// iPhone 系统日历同步服务
/// 借助 Apple 原生 EventKit 将云平台 32 节课自动创建至专属日历并配置每周循环与课前提醒
public final class CalendarSyncService: @unchecked Sendable {
    public static let shared = CalendarSyncService()
    private let eventStore = EKEventStore()

    private init() {}

    /// 请求日历访问权限并批量写入课表
    public func syncCoursesToSystemCalendar(courses: [Course]) async throws -> (syncedCount: Int, calendarTitle: String) {
        // 1. 请求日历读写权限
        let granted: Bool
        if #available(iOS 17.0, *) {
            granted = try await eventStore.requestFullAccessToEvents()
        } else {
            granted = try await withCheckedThrowingContinuation { continuation in
                eventStore.requestAccess(to: .event) { accessGranted, error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    } else {
                        continuation.resume(returning: accessGranted)
                    }
                }
            }
        }

        guard granted else {
            throw NSError(
                domain: "cn.edu.bnds.companion",
                code: 403,
                userInfo: [NSLocalizedDescriptionKey: "未获得日历访问权限，请在 iPhone「设置 -> 十一校园助手」中开启日历完全访问权限。"]
            )
        }

        // 2. 查找或创建名为 “十一学校课表” 的专属日历
        let calendarTitle = "十一学校课表"
        var bndsCalendar: EKCalendar? = eventStore.calendars(for: .event).first(where: { $0.title == calendarTitle })

        if bndsCalendar == nil {
            let newCal = EKCalendar(for: .event, eventStore: eventStore)
            newCal.title = calendarTitle
            newCal.cgColor = UIColor(red: 163/255, green: 28/255, blue: 46/255, alpha: 1.0).cgColor // BNDS Crimson

            // 优先选择 iCloud 或 本地 default 源
            if let defaultSource = eventStore.defaultCalendarForNewEvents?.source {
                newCal.source = defaultSource
            } else if let localSource = eventStore.sources.first(where: { $0.sourceType == .local || $0.sourceType == .calDAV }) {
                newCal.source = localSource
            } else {
                newCal.source = eventStore.sources.first
            }

            try eventStore.saveCalendar(newCal, commit: true)
            bndsCalendar = newCal
        }

        guard let targetCalendar = bndsCalendar else {
            throw NSError(
                domain: "cn.edu.bnds.companion",
                code: 500,
                userInfo: [NSLocalizedDescriptionKey: "创建日历失败，请检查系统日历存储状态。"]
            )
        }

        // 3. 计算本学期起始基准日期（如 2026 年秋季学期基准周）
        let calendar = Calendar.current
        let now = Date()
        let semesterEndDate = calendar.date(byAdding: .month, value: 5, to: now) ?? now.addingTimeInterval(150 * 86400)

        // 查找当前周或者下一周的基准周一 (Monday)
        let currentWeekday = calendar.component(.weekday, from: now) // 1=Sun, 2=Mon, ..., 7=Sat
        // 转换为 1=Mon, ..., 7=Sun
        let isoWeekday = currentWeekday == 1 ? 7 : currentWeekday - 1
        let daysToMonday = 1 - isoWeekday
        let mondayBase = calendar.startOfDay(for: calendar.date(byAdding: .day, value: daysToMonday, to: now) ?? now)

        var createdCount = 0

        // 4. 遍历云平台课程并创建循环事件
        for course in courses {
            let event = EKEvent(eventStore: eventStore)
            event.calendar = targetCalendar
            event.title = "\(course.name) (\(course.room))"
            event.location = course.room
            event.notes = "授课教师：\(course.teacher)\n学期：\(course.term)\n数据源：十一学校云平台自动同步"

            // 计算具体星期几的日期偏移 (course.dayOfWeek: 1=Mon, ..., 5=Fri)
            let dayOffset = course.dayOfWeek - 1
            guard let courseDate = calendar.date(byAdding: .day, value: dayOffset, to: mondayBase) else { continue }

            // 解析开始和结束时间 (如 "08:55", "09:40")
            let startParts = course.startTime.split(separator: ":").compactMap { Int($0) }
            let endParts = course.endTime.split(separator: ":").compactMap { Int($0) }

            guard startParts.count == 2, endParts.count == 2 else { continue }

            var startComponents = calendar.dateComponents([.year, .month, .day], from: courseDate)
            startComponents.hour = startParts[0]
            startComponents.minute = startParts[1]

            var endComponents = calendar.dateComponents([.year, .month, .day], from: courseDate)
            endComponents.hour = endParts[0]
            endComponents.minute = endParts[1]

            guard let startDate = calendar.date(from: startComponents),
                  let endDate = calendar.date(from: endComponents) else { continue }

            event.startDate = startDate
            event.endDate = endDate

            // 每周重复规则 (直到学期结束)
            let recurrenceRule = EKRecurrenceRule(
                recurrenceWith: .weekly,
                interval: 1,
                end: EKRecurrenceEnd(end: semesterEndDate)
            )
            event.recurrenceRules = [recurrenceRule]

            // 课前 10 分钟提醒
            let alarm = EKAlarm(relativeOffset: -600)
            event.alarms = [alarm]

            try eventStore.save(event, span: .thisEvent, commit: false)
            createdCount += 1
        }

        // 提交所有批量更改
        try eventStore.commit()

        return (createdCount, calendarTitle)
    }
}

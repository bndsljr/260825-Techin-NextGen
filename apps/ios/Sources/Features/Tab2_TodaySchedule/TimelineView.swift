import SwiftUI

/// 今日日程时间轴（课表 + 专注窗口 + 休息时段）
public struct TimelineView: View {
    @EnvironmentObject var appState: AppState

    public init() {}

    public var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // 星期切换器
            WeekdayPickerView()

            let currentDaySlots = appState.scheduleSlots.filter { $0.dayOfWeek == appState.selectedWeekday }

            HStack {
                Text("\(weekdayName(for: appState.selectedWeekday)) 课程表与时段")
                    .font(.system(size: 16, weight: .bold))
                Spacer()
                Text("\(currentDaySlots.count) 个时段 · 云平台已归一化")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 4)
            .padding(.top, 4)

            if currentDaySlots.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "sun.max.fill")
                        .font(.system(size: 32))
                        .foregroundColor(BNDSColors.pending)
                    Text("周末暂无排课，自由安排自主研修与社团活动")
                        .font(.system(size: 13))
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 36)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(BNDSColors.cardBackground)
                )
            } else {
                ForEach(currentDaySlots) { slot in
                    TimelineSlotRow(slot: slot)
                }
            }
        }
    }

    private func weekdayName(for dow: Int) -> String {
        switch dow {
        case 1: return "星期一"
        case 2: return "星期二"
        case 3: return "星期三"
        case 4: return "星期四"
        case 5: return "星期五"
        case 6: return "星期六"
        case 7: return "星期日"
        default: return "星期\(dow)"
        }
    }
}

/// 单个时段卡片
struct TimelineSlotRow: View {
    @EnvironmentObject var appState: AppState
    let slot: ScheduleSlot

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // 时间栏
            VStack(alignment: .trailing, spacing: 2) {
                Text(slot.startAt)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.primary)
                Text(slot.endAt)
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
            .frame(width: 46)

            // 时段卡片
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Image(systemName: slot.kind.iconName)
                            .font(.system(size: 12))
                            .foregroundColor(colorForSlot(slot.kind))

                        Text(slot.title)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.primary)

                        if slot.source == "cloud" {
                            SourceBadge(source: "cloud")
                        }
                    }

                    if let sub = slot.subtitle {
                        Text(sub)
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                if let room = slot.room {
                    HStack(spacing: 3) {
                        Image(systemName: "mappin.circle.fill")
                            .font(.system(size: 10))
                        Text(room)
                            .font(.system(size: 11, weight: .medium))
                    }
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Capsule().fill(Color.primary.opacity(0.05)))
                }

                if slot.kind == .focus {
                    Button(action: {
                        appState.isFocusModalPresented = true
                    }) {
                        Text("开启")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(Capsule().fill(BNDSColors.crimson))
                    }
                }
            }
            .padding(14)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(BNDSColors.cardBackground)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(
                        slot.kind == .focus
                            ? BNDSColors.crimson.opacity(0.4)
                            : Color.primary.opacity(0.04),
                        lineWidth: 1
                    )
            )
        }
    }

    private func colorForSlot(_ kind: SlotKind) -> Color {
        switch kind {
        case .class: return BNDSColors.oxfordNavy
        case .study: return BNDSColors.inProgress
        case .break: return .secondary
        case .focus: return BNDSColors.crimson
        }
    }
}

import SwiftUI

/// 今日日程时间轴（课表 + 专注窗口 + 休息时段）
public struct TimelineView: View {
    @EnvironmentObject var appState: AppState

    public init() {}

    public var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("日程时间轴")
                    .font(.system(size: 17, weight: .bold))
                Spacer()
                Text("统一课表已同步 (云平台 & MB)")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 4)

            ForEach(appState.scheduleSlots) { slot in
                TimelineSlotRow(slot: slot)
            }
        }
    }
}

/// 单个时段卡片
struct TimelineSlotRow: View {
    @EnvironmentObject var appState: AppState
    let slot: ScheduleSlot

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            // 时间栏
            VStack(alignment: .trailing, spacing: 2) {
                Text(slot.startAt)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.primary)
                Text(slot.endAt)
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
            .frame(width: 48)

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

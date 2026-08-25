import SwiftUI

/// 星期选择器（周一 至 周五 / 周末）
public struct WeekdayPickerView: View {
    @EnvironmentObject var appState: AppState

    let days: [(id: Int, name: String, shortName: String)] = [
        (1, "周一", "Mon"),
        (2, "周二", "Tue"),
        (3, "周三", "Wed"),
        (4, "周四", "Thu"),
        (5, "周五", "Fri"),
        (6, "周六", "Sat"),
        (7, "周日", "Sun")
    ]

    public init() {}

    public var body: some View {
        HStack(spacing: 8) {
            ForEach(days, id: \.id) { day in
                let isSelected = appState.selectedWeekday == day.id
                Button(action: {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        appState.selectedWeekday = day.id
                    }
                }) {
                    VStack(spacing: 4) {
                        Text(day.shortName)
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(isSelected ? .white.opacity(0.8) : .secondary)

                        Text(day.name)
                            .font(.system(size: 13, weight: isSelected ? .bold : .medium))
                            .foregroundColor(isSelected ? .white : .primary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(isSelected ? BNDSColors.crimson : BNDSColors.cardBackground)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .strokeBorder(isSelected ? Color.clear : Color.primary.opacity(0.06), lineWidth: 1)
                    )
                }
            }
        }
    }
}

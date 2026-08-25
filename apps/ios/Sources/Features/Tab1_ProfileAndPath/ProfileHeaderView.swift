import SwiftUI

/// 个人档案头部组件（头像、年级、兴趣板块 Chips、设置）
public struct ProfileHeaderView: View {
    @EnvironmentObject var appState: AppState
    @State private var isShowingInterestsSheet = false

    public init() {}

    public var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 14) {
                // 学生头像
                ZStack {
                    Circle()
                        .fill(BNDSColors.bndsGradient)
                        .frame(width: 56, height: 56)
                    Text(String(appState.currentUser.name.suffix(2)))
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)
                }

                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(appState.currentUser.name)
                            .font(.system(size: 20, weight: .bold))
                        Text("高\(appState.currentUser.grade)年级")
                            .font(.system(size: 12, weight: .medium))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Capsule().fill(Color.primary.opacity(0.08)))
                    }

                    Text("十一学校 · BNDSer")
                        .font(.system(size: 13))
                        .foregroundColor(.secondary)
                }

                Spacer()

                // 设置按钮
                Button(action: {
                    isShowingInterestsSheet = true
                }) {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(.secondary)
                        .padding(10)
                        .background(Circle().fill(BNDSColors.tertiaryBackground))
                }
            }

            // 兴趣板块 Chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(appState.currentUser.interests, id: \.self) { interestId in
                        if let pillar = appState.interestPillars.first(where: { $0.id == interestId }) {
                            HStack(spacing: 4) {
                                Image(systemName: pillar.iconName)
                                    .font(.system(size: 11))
                                Text(pillar.name)
                                    .font(.system(size: 12, weight: .medium))
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(
                                Capsule()
                                    .fill(BNDSColors.oxfordNavy.opacity(0.08))
                            )
                            .foregroundColor(BNDSColors.oxfordNavy)
                        }
                    }

                    Button(action: { isShowingInterestsSheet = true }) {
                        Image(systemName: "plus")
                            .font(.system(size: 11, weight: .bold))
                            .padding(6)
                            .background(Circle().fill(Color.primary.opacity(0.06)))
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(BNDSColors.cardBackground)
        )
        .sheet(isPresented: $isShowingInterestsSheet) {
            InterestsEditSheet()
                .environmentObject(appState)
        }
    }
}

/// 兴趣编辑弹窗
struct InterestsEditSheet: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section(header: Text("选择你的探索领域（可多选）")) {
                    ForEach(appState.interestPillars) { pillar in
                        Button(action: {
                            if appState.currentUser.interests.contains(pillar.id) {
                                appState.currentUser.interests.removeAll(where: { $0 == pillar.id })
                            } else {
                                appState.currentUser.interests.append(pillar.id)
                            }
                            MockDataStore.shared.updateUserInterests(appState.currentUser.interests)
                        }) {
                            HStack {
                                Image(systemName: pillar.iconName)
                                    .foregroundColor(BNDSColors.crimson)
                                    .frame(width: 28)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(pillar.name)
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundColor(.primary)
                                    Text(pillar.description)
                                        .font(.system(size: 12))
                                        .foregroundColor(.secondary)
                                }
                                Spacer()
                                if appState.currentUser.interests.contains(pillar.id) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(BNDSColors.achieved)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("兴趣板块设置")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("完成") { dismiss() }
                }
            }
        }
    }
}

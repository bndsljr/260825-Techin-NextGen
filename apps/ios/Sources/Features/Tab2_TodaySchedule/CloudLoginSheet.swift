import SwiftUI

/// 云平台账号密码登录与课表抓取弹窗
public struct CloudLoginSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var appState: AppState

    @State private var username: String = "26111422"
    @State private var password: String = "••••••••"
    @State private var serviceUrl: String = "https://bnds.idsp.yunxiao.com"
    @State private var isScraping: Bool = false
    @State private var progressMessage: String = ""
    @State private var isSuccess: Bool = false
    @State private var errorMessage: String? = nil

    public init() {}

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // 顶部说明横幅
                    HStack(spacing: 12) {
                        Image(systemName: "cloud.fill")
                            .font(.system(size: 28))
                            .foregroundColor(BNDSColors.inProgress)

                        VStack(alignment: .leading, spacing: 3) {
                            Text("十一学校云平台数据同步")
                                .font(.system(size: 17, weight: .bold))
                            Text("通过 SSO/CAS 登录，只读抓取最新 32 节周课表、教室安排与过程性评价")
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                                .lineLimit(2)
                        }
                    }
                    .padding(14)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(BNDSColors.inProgress.opacity(0.08))
                    )

                    // 快速体验填充
                    HStack {
                        Text("测试账号快捷输入")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.secondary)
                        Spacer()
                        Button(action: {
                            username = "26111422"
                            password = "BndsPassword2026!"
                        }) {
                            Text("一键填入演示高一学号")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(BNDSColors.crimson)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Capsule().fill(BNDSColors.crimson.opacity(0.1)))
                        }
                    }

                    // 表单输入
                    VStack(spacing: 14) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("学生学号 / 用户名")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.primary)
                            TextField("请输入十一学校学号 (如 26111422)", text: $username)
                                .padding(12)
                                .background(RoundedRectangle(cornerRadius: 10).fill(BNDSColors.tertiaryBackground))
                                .keyboardType(.asciiCapable)
                                .autocorrectionDisabled()
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            Text("云平台密码")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.primary)
                            SecureField("请输入云平台登录密码", text: $password)
                                .padding(12)
                                .background(RoundedRectangle(cornerRadius: 10).fill(BNDSColors.tertiaryBackground))
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            Text("服务接入地址 (CAS)")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.primary)
                            TextField("云平台域名", text: $serviceUrl)
                                .font(.system(size: 12))
                                .padding(12)
                                .background(RoundedRectangle(cornerRadius: 10).fill(BNDSColors.tertiaryBackground))
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(BNDSColors.cardBackground)
                    )

                    // 进度展示区
                    if isScraping || isSuccess {
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                if isSuccess {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(BNDSColors.achieved)
                                } else {
                                    ProgressView()
                                        .scaleEffect(0.8)
                                }
                                Text(isSuccess ? "抓取与同步完成！" : "正在实时抓取中...")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(isSuccess ? BNDSColors.achieved : .primary)
                            }

                            Text(progressMessage)
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                                .padding(10)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(RoundedRectangle(cornerRadius: 8).fill(Color.primary.opacity(0.04)))
                        }
                        .padding(14)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(BNDSColors.cardBackground)
                        )
                    }

                    if let err = errorMessage {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.red)
                            Text(err)
                                .font(.system(size: 12))
                                .foregroundColor(.red)
                        }
                        .padding(12)
                        .background(RoundedRectangle(cornerRadius: 10).fill(Color.red.opacity(0.08)))
                    }

                    // 提交按钮
                    Button(action: startScraping) {
                        HStack {
                            if isScraping {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Image(systemName: "arrow.down.doc.fill")
                            }
                            Text(isScraping ? "抓取课表中..." : "开始抓取并同步课表")
                                .font(.system(size: 15, weight: .bold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .fill(isScraping ? Color.secondary : BNDSColors.crimson)
                        )
                    }
                    .disabled(isScraping || username.trimmingCharacters(in: .whitespaces).isEmpty)

                    // 隐私红线说明
                    HStack(alignment: .top, spacing: 6) {
                        Image(systemName: "lock.shield.fill")
                            .font(.system(size: 12))
                            .foregroundColor(BNDSColors.inProgress)
                        Text("数据安全声明：仅在端侧进行只读抓取，绝不向云平台写入任何数据，密码绝不落盘与上传。")
                            .font(.system(size: 11))
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal, 4)
                }
                .padding(20)
            }
            .navigationTitle("云平台抓取")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("关闭") {
                        dismiss()
                    }
                    .disabled(isScraping)
                }
            }
        }
    }

    private func startScraping() {
        isScraping = true
        isSuccess = false
        errorMessage = nil
        progressMessage = "准备发起 SSO 连接..."

        Task {
            do {
                let result = try await CloudIngestService.shared.scrapeAndSync(
                    username: username,
                    password: password,
                    serviceUrl: serviceUrl
                ) { msg in
                    Task { @MainActor in
                        self.progressMessage = msg
                    }
                }

                await MainActor.run {
                    appState.courses = result.courses
                    appState.scheduleSlots = result.slots
                    appState.currentUser.studyCode = username
                    appState.currentUser.schoolPeriodName = result.termName
                    let formatter = DateFormatter()
                    formatter.dateFormat = "HH:mm"
                    appState.lastSyncedAt = formatter.string(from: Date())
                    self.isSuccess = true
                    self.isScraping = false

                    // 延迟 1 秒后自动关闭弹窗
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                        dismiss()
                    }
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = "抓取失败：\(error.localizedDescription)"
                    self.isScraping = false
                }
            }
        }
    }
}

import SwiftUI

/// 全屏沉浸专注模式
public struct FocusModeModal: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) var dismiss

    @State private var remainingSeconds: Int = 45 * 60
    @State private var isRunning: Bool = true
    @State private var goalTitle: String = "微积分作业与项目代码编写"
    @State private var selectedSound: String = "图书馆静读"
    @State private var reflectionText: String = ""
    @State private var isShowingFinishAlert: Bool = false

    let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    let soundOptions = ["图书馆静读", "雨打窗台", "森林微风", "咖啡馆白噪", "静音模式"]

    public init() {}

    public var body: some View {
        ZStack {
            // 背景渐变
            LinearGradient(
                colors: [Color(red: 0.08, green: 0.10, blue: 0.16), Color(red: 0.04, green: 0.05, blue: 0.08)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 28) {
                // 顶部操作栏
                HStack {
                    Button(action: {
                        dismiss()
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 24))
                            .foregroundColor(.white.opacity(0.6))
                    }

                    Spacer()

                    Text("深度专注时段")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.white.opacity(0.9))

                    Spacer()

                    Button(action: {
                        isShowingFinishAlert = true
                    }) {
                        Text("完成打卡")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(BNDSColors.achieved)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Capsule().fill(BNDSColors.achieved.opacity(0.18)))
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)

                Spacer()

                // 倒计时核心环形展示
                ZStack {
                    Circle()
                        .stroke(Color.white.opacity(0.1), lineWidth: 12)
                        .frame(width: 240, height: 240)

                    let progress = Double(remainingSeconds) / Double(45 * 60)
                    Circle()
                        .trim(from: 0, to: CGFloat(progress))
                        .stroke(
                            BNDSColors.crimson,
                            style: StrokeStyle(lineWidth: 12, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))
                        .frame(width: 240, height: 240)
                        .animation(.linear(duration: 1), value: remainingSeconds)

                    VStack(spacing: 6) {
                        Text(timeString(from: remainingSeconds))
                            .font(.system(size: 48, weight: .light, design: .monospaced))
                            .foregroundColor(.white)

                        Text(isRunning ? "专注心流中" : "已暂停")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.white.opacity(0.6))
                    }
                }

                // 当前专注目标
                VStack(spacing: 8) {
                    Text("当前目标")
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.5))
                    Text(goalTitle)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                }

                // 白噪音音效切换
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(soundOptions, id: \.self) { sound in
                            Button(action: { selectedSound = sound }) {
                                HStack(spacing: 4) {
                                    Image(systemName: "waveform")
                                    Text(sound)
                                }
                                .font(.system(size: 12, weight: .medium))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(
                                    Capsule().fill(selectedSound == sound ? BNDSColors.crimson.opacity(0.5) : Color.white.opacity(0.08))
                                )
                                .foregroundColor(.white)
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                }

                Spacer()

                // 底部控制按钮
                HStack(spacing: 24) {
                    Button(action: {
                        isRunning.toggle()
                    }) {
                        Image(systemName: isRunning ? "pause.fill" : "play.fill")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 64, height: 64)
                            .background(Circle().fill(BNDSColors.crimson))
                    }
                }
                .padding(.bottom, 32)
            }
        }
        .onReceive(timer) { _ in
            if isRunning && remainingSeconds > 0 {
                remainingSeconds -= 1
            }
        }
        .alert("完成本次专注？", isPresented: $isShowingFinishAlert) {
            Button("确认完成并记录", role: .none) {
                let actualMin = (45 * 60 - remainingSeconds) / 60
                appState.completeFocusSession(
                    goal: goalTitle,
                    durationMin: max(actualMin, 1),
                    reflection: "在深度专注中顺利推进"
                )
                dismiss()
            }
            Button("继续专注", role: .cancel) {}
        } message: {
            Text("专注时长将自动沉淀至你的个人成长账本。")
        }
    }

    private func timeString(from totalSeconds: Int) -> String {
        let minutes = totalSeconds / 60
        let seconds = totalSeconds % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

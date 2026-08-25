import XCTest
@testable import BNDSCompanion

final class BNDSCompanionTests: XCTestCase {
    func testDataModelSerialization() throws {
        let node = LifePathNode(
            id: "test-node",
            type: .longTermGoal,
            title: "测试目标",
            status: .pending, // 待定
            source: .user
        )

        let data = try JSONEncoder().encode(node)
        let decoded = try JSONDecoder().decode(LifePathNode.self, from: data)

        XCTAssertEqual(decoded.title, "测试目标")
        XCTAssertEqual(decoded.status, .pending)
        XCTAssertEqual(decoded.source, .user)
    }

    @MainActor
    func testAppStateLifePathUpdate() {
        let appState = AppState()
        let initialCount = appState.lifePath.nodes.count

        let newNode = LifePathNode(
            type: .shortTermGoal,
            title: "单元测试新增短期目标",
            status: .inProgress
        )

        appState.saveNode(newNode)
        XCTAssertEqual(appState.lifePath.nodes.count, initialCount + 1)
        XCTAssertEqual(appState.lifePath.nodes.last?.source, .user)
    }

    @MainActor
    func testMentorSuggestionBridgeToEditor() {
        let appState = AppState()
        let suggestion = MentorSuggestion(
            title: "测试建议",
            text: "建议内容",
            reason: "透明依据",
            targetNodeType: .shortTermGoal,
            proposedNodeTitle: "落地目标",
            status: .pendingReview
        )

        appState.acceptMentorSuggestion(suggestion)

        // 验证采纳后是否正确跳转至 Tab 0 并拉起编辑态
        XCTAssertEqual(appState.selectedTab, 0)
        XCTAssertTrue(appState.isNodeEditorPresented)
        XCTAssertEqual(appState.editingNode?.title, "落地目标")
    }
}

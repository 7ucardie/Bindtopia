import SwiftUI

@main
struct BindtopiaApp: App {
    @StateObject private var store = CardStore()
    var body: some Scene {
        WindowGroup { CatalogView().environmentObject(store).tint(Color(red: 0.15, green: 0.35, blue: 0.27)) }
    }
}

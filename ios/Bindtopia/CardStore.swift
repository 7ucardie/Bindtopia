import Foundation

struct Card: Codable, Identifiable {
    let id: String
    let localId: String
    let name: String
    let image: String?
    let setId: String
    var thumbnail: URL? { image.flatMap { URL(string: $0 + "/low.webp") } }
    var artwork: URL? { image.flatMap { URL(string: $0 + "/high.webp") } }
}
struct CardSet: Codable, Identifiable {
    struct Count: Codable { let total: Int; let official: Int }
    let id: String
    let name: String
    let cardCount: Count
}
struct CardDetail: Decodable {
    let name: String
    let hp: Int?
    let category: String?
    let illustrator: String?
    let rarity: String?
    let types: [String]?
    let description: String?
    let stage: String?
    let attacks: [Attack]?
    let abilities: [Ability]?
    struct Attack: Decodable {
        let name: String
        let effect: String?
        let damage: Damage?
        enum Damage: Decodable {
            case number(Int), text(String)
            init(from decoder: Decoder) throws {
                let container = try decoder.singleValueContainer()
                if let n = try? container.decode(Int.self) { self = .number(n) }
                else { self = .text(try container.decode(String.self)) }
            }
            var display: String { switch self { case .number(let n): return String(n); case .text(let t): return t } }
        }
    }
    struct Ability: Decodable { let name: String; let effect: String? }
}
@MainActor final class CardStore: ObservableObject {
    @Published var cards: [Card] = []
    @Published var sets: [String: CardSet] = [:]
    @Published var saved: Set<String> = Set(UserDefaults.standard.stringArray(forKey: "savedCards") ?? [])
    @Published var loadError: String?
    var snapshotDate: String {
        guard let url = Bundle.main.url(forResource: "meta", withExtension: "json"), let data = try? Data(contentsOf: url), let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any], let updated = object["updated"] as? String else { return "onbekend" }
        return String(updated.prefix(10))
    }
    init() {
        do {
            guard let c = Bundle.main.url(forResource: "cards-en", withExtension: "json"),
                  let s = Bundle.main.url(forResource: "sets-en", withExtension: "json") else {
                throw CocoaError(.fileNoSuchFile)
            }
            cards = try JSONDecoder().decode([Card].self, from: Data(contentsOf: c))
            let list = try JSONDecoder().decode([CardSet].self, from: Data(contentsOf: s))
            sets = Dictionary(uniqueKeysWithValues: list.map { ($0.id, $0) })
        } catch { loadError = "De gebundelde catalogus kon niet worden geladen: \(error.localizedDescription)" }
    }
    func toggle(_ card: Card) {
        if saved.contains(card.id) { saved.remove(card.id) } else { saved.insert(card.id) }
        UserDefaults.standard.set(Array(saved), forKey: "savedCards")
    }
    static func normalized(_ text: String) -> String {
        text.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "en_US_POSIX"))
            .filter { $0.isLetter || $0.isNumber }
    }
    static func numberKey(_ text: String) -> String {
        if let number = Int(text) { return String(number) }; return text.lowercased()
    }
    func matches(_ text: String, limit: Int = 30) -> [Card] {
        let normalized = Self.normalized(text)
        guard !normalized.isEmpty else { return [] }
        let regex = try? NSRegularExpression(pattern: "\\b([A-Za-z]{0,4}[0-9]{1,4}[A-Za-z]?)\\s*/\\s*([A-Za-z]{0,4}[0-9]{1,4})\\b")
        let ns = text as NSString
        let numbers = regex?.matches(in: text, range: NSRange(location: 0, length: ns.length)).map {
            (Self.numberKey(ns.substring(with: $0.range(at: 1))), ns.substring(with: $0.range(at: 2)))
        } ?? []
        return cards.compactMap { card -> (Card, Int)? in
            var score = 0
            let name = Self.normalized(card.name)
            if name.count > 2 && normalized.contains(name) { score += 65 }
            if let pair = numbers.first(where: { $0.0 == Self.numberKey(card.localId) }) {
                score += 50
                if Int(pair.1) == sets[card.setId]?.cardCount.official { score += 30 }
            }
            return score > 0 ? (card, score) : nil
        }.sorted { $0.1 == $1.1 ? $0.0.id < $1.0.id : $0.1 > $1.1 }.prefix(limit).map { $0.0 }
    }
    func search(_ text: String, savedOnly: Bool) -> [Card] {
        let available = savedOnly ? cards.filter { saved.contains($0.id) } : cards
        let query = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return available }
        if query.contains("/") { let ids = Set(matches(query, limit: 1000).map(\.id)); return available.filter { ids.contains($0.id) } }
        let normalized = Self.normalized(query)
        return available.filter { Self.normalized($0.name).contains(normalized) || Self.normalized($0.id) == normalized || Self.numberKey($0.localId) == Self.numberKey(query) }
    }
}

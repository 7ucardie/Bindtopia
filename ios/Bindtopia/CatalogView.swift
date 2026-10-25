import SwiftUI

struct CatalogView: View {
    @EnvironmentObject private var store: CardStore
    @State private var query = ""
    @State private var savedOnly = false
    @State private var showScanner = false
    @State private var limit = 60
    private var results: [Card] { store.search(query, savedOnly: savedOnly) }
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Alle aandacht voor je kaarten.").font(.title2.bold())
                    Button { showScanner = true } label: {
                        Label("Scan een kaart", systemImage: "camera.viewfinder").frame(maxWidth: .infinity).padding(8)
                    }.buttonStyle(.borderedProminent)
                    Toggle("Alleen bewaarde kaarten", isOn: $savedOnly)
                    if let error = store.loadError { Text(error).foregroundStyle(.red) }
                    Text("\(results.count.formatted()) kaarten · Engelse catalogus").font(.caption).foregroundStyle(.secondary)
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 18) {
                        ForEach(Array(results.prefix(limit))) { card in
                            NavigationLink { DetailView(card: card) } label: {
                                VStack(alignment: .leading, spacing: 8) {
                                    CardImage(url: card.thumbnail).frame(height: 205)
                                    Text(card.name).font(.subheadline.bold()).foregroundStyle(.primary)
                                    Text("\(store.sets[card.setId]?.name ?? card.setId) · #\(card.localId)").font(.caption2).foregroundStyle(.secondary)
                                    if store.saved.contains(card.id) { Label("Bewaard", systemImage: "heart.fill").font(.caption2) }
                                }.frame(maxWidth: .infinity, alignment: .leading)
                            }.buttonStyle(.plain)
                        }
                    }
                    if results.count > limit { Button("Meer kaarten tonen") { limit += 60 }.buttonStyle(.bordered).frame(maxWidth: .infinity) }
                    Link("Privacy en gebruiksvoorwaarden", destination: URL(string: "https://bindtopia.com/privacy.html")!)
                    Text("Onafhankelijk fanproject. Kaartgegevens: TCGdex (MIT). Kaartafbeeldingen blijven eigendom van hun rechthebbenden. Index: \(store.snapshotDate). Bewaarde kaarten staan lokaal op deze iPhone.").font(.caption2).foregroundStyle(.secondary)
                }.padding()
            }.navigationTitle("Bindtopia")
             .searchable(text: $query, prompt: "Naam of kaartnummer")
             .onChange(of: query) { _ in limit = 60 }
             .onChange(of: savedOnly) { _ in limit = 60 }
             .sheet(isPresented: $showScanner) { ScannerView() }
        }
    }
}
struct CardImage: View {
    let url: URL?
    var body: some View {
        AsyncImage(url: url) { phase in
            if let image = phase.image { image.resizable().scaledToFit() }
            else if phase.error != nil || url == nil { VStack { Image(systemName: "rectangle.portrait"); Text("Geen afbeelding").font(.caption) }.frame(maxWidth: .infinity, maxHeight: .infinity).background(.quaternary) }
            else { ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity) }
        }
    }
}
struct DetailView: View {
    @EnvironmentObject private var store: CardStore
    let card: Card
    @State private var detail: CardDetail?
    @State private var error: String?
    @State private var loading = true
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                CardImage(url: card.artwork).frame(height: 360).frame(maxWidth: .infinity)
                Button { store.toggle(card) } label: { Label(store.saved.contains(card.id) ? "Verwijder uit bewaard" : "Bewaar kaart", systemImage: store.saved.contains(card.id) ? "heart.fill" : "heart") }.buttonStyle(.bordered)
                LabeledContent("Set", value: store.sets[card.setId]?.name ?? card.setId)
                LabeledContent("Kaartnummer", value: card.localId + "/" + String(store.sets[card.setId]?.cardCount.official ?? 0))
                if loading { ProgressView("Kaartinformatie laden…") }
                if let error { Text(error).foregroundStyle(.secondary); Button("Opnieuw proberen") { Task { await load() } } }
                if let d = detail {
                    if let hp = d.hp { LabeledContent("HP", value: String(hp)) }
                    if let types = d.types { LabeledContent("Type", value: types.joined(separator: ", ")) }
                    if let rarity = d.rarity { LabeledContent("Zeldzaamheid", value: rarity) }
                    if let illustrator = d.illustrator { LabeledContent("Illustrator", value: illustrator) }
                    if let description = d.description { Text(description).font(.subheadline) }
                    ForEach(Array((d.abilities ?? []).enumerated()), id: \.offset) { _, ability in VStack(alignment: .leading) { Text(ability.name).bold(); Text(ability.effect ?? "").font(.subheadline) } }
                    ForEach(Array((d.attacks ?? []).enumerated()), id: \.offset) { _, attack in VStack(alignment: .leading) { Text(attack.name + " " + (attack.damage?.display ?? "")).bold(); Text(attack.effect ?? "").font(.subheadline) } }
                }
                Divider()
                Text("Prijzen bij de bron").font(.headline)
                priceLink("Cardmarket", base: "https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=")
                priceLink("TCGplayer", base: "https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&q=")
                Text("Controleer taal, conditie en drukvariant bij de aanbieder. Geen actuele prijsfeed in deze app.").font(.caption).foregroundStyle(.secondary)
            }.padding()
        }.navigationTitle(card.name).navigationBarTitleDisplayMode(.inline).task { await load() }
    }
    @ViewBuilder private func priceLink(_ title: String, base: String) -> some View {
        let query = card.name + " " + card.localId + " " + (store.sets[card.setId]?.name ?? "")
        if let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed), let url = URL(string: base + encoded) { Link(title + " ↗", destination: url) }
    }
    private func load() async {
        loading = true; error = nil
        do {
            let url = URL(string: "https://api.tcgdex.net/v2/en/cards/" + card.id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed)!)!
            let (data, response) = try await URLSession.shared.data(from: url)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
            detail = try JSONDecoder().decode(CardDetail.self, from: data)
        } catch { self.error = "Uitgebreide kaartinformatie is nu niet bereikbaar." }
        loading = false
    }
}

import SwiftUI
import PhotosUI
import Vision
import UIKit

struct ScannerView: View {
    @EnvironmentObject private var store: CardStore
    @Environment(\.dismiss) private var dismiss
    @State private var photoItem: PhotosPickerItem?
    @State private var showCamera = false
    @State private var preview: UIImage?
    @State private var text = ""
    @State private var status = "Maak een scherpe foto van één kaart, inclusief de naam en het nummer."
    @State private var reading = false
    @State private var matches: [Card] = []
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let preview { Image(uiImage: preview).resizable().scaledToFit().frame(maxHeight: 260).frame(maxWidth: .infinity) }
                    HStack {
                        if UIImagePickerController.isSourceTypeAvailable(.camera) { Button("Maak foto", systemImage: "camera") { showCamera = true }.buttonStyle(.borderedProminent) }
                        PhotosPicker(selection: $photoItem, matching: .images) { Label("Kies foto", systemImage: "photo") }.buttonStyle(.bordered)
                    }.disabled(reading)
                    if reading { ProgressView("Tekst herkennen…") }
                    Text(status).font(.subheadline).foregroundStyle(.secondary)
                    Text("Naam / kaartnummer").font(.headline)
                    TextEditor(text: $text).frame(minHeight: 110).padding(8).background(.quaternary).clipShape(RoundedRectangle(cornerRadius: 10))
                    Button("Zoek overeenkomsten") { findMatches() }.buttonStyle(.borderedProminent).disabled(reading)
                    Text("Mogelijke overeenkomsten").font(.headline)
                    ForEach(matches) { card in
                        NavigationLink { DetailView(card: card) } label: {
                            HStack { CardImage(url: card.thumbnail).frame(width: 60, height: 80); VStack(alignment: .leading) { Text(card.name).bold(); Text("\(store.sets[card.setId]?.name ?? card.setId) · #\(card.localId)").font(.caption) } }.foregroundStyle(.primary)
                        }
                    }
                    Text("De foto en tekstherkenning blijven op je iPhone. Controleer zelf de afbeelding, set en het nummer. Herkenning is geen controle op echtheid, drukvariant of conditie. Deze eerste appversie doorzoekt Engelse kaarten.").font(.caption).foregroundStyle(.secondary)
                }.padding()
            }.navigationTitle("Scan een kaart").navigationBarTitleDisplayMode(.inline)
             .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Gereed") { dismiss() } } }
             .sheet(isPresented: $showCamera) { CameraPicker { image in if let image { recognize(image) } } }
             .onChange(of: photoItem) { item in
                 Task {
                     do {
                         guard let data = try await item?.loadTransferable(type: Data.self), let image = UIImage(data: data) else { status = "De foto kon niet worden geopend."; return }
                         recognize(image)
                     } catch { status = "De foto kon niet worden geopend. Kies een andere foto." }
                 }
             }
        }
    }
    private func findMatches() {
        matches = store.matches(text)
        status = matches.isEmpty ? "Geen overeenkomst. Verbeter de tekst of probeer een scherpere foto." : "\(matches.count) mogelijke overeenkomsten. Controleer de kaart voordat je hem bewaart."
    }
    private func recognize(_ image: UIImage) {
        preview = image; reading = true; matches = []
        // Render upright before passing to Vision; avoids camera EXIF rotation issues.
        let maxSide: CGFloat = 2200
        let scale = min(1, maxSide / max(image.size.width, image.size.height))
        let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let format = UIGraphicsImageRendererFormat(); format.scale = 1
        let upright = UIGraphicsImageRenderer(size: size, format: format).image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }
        guard let cgImage = upright.cgImage else { status = "Deze foto kan niet worden gelezen."; reading = false; return }
        DispatchQueue.global(qos: .userInitiated).async {
            let request = VNRecognizeTextRequest()
            request.recognitionLevel = .accurate
            request.recognitionLanguages = ["en-US"]
            request.usesLanguageCorrection = false
            do {
                try VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
                let result = request.results?.compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n") ?? ""
                DispatchQueue.main.async { text = result; reading = false; findMatches() }
            } catch {
                DispatchQueue.main.async { reading = false; status = "Automatisch lezen lukte niet. Vul de naam of het kaartnummer handmatig in." }
            }
        }
    }
}
struct CameraPicker: UIViewControllerRepresentable {
    let completion: (UIImage?) -> Void
    @Environment(\.dismiss) private var dismiss
    func makeCoordinator() -> Coordinator { Coordinator(self) }
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController(); picker.sourceType = .camera; picker.delegate = context.coordinator; picker.cameraCaptureMode = .photo; return picker
    }
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPicker
        init(_ parent: CameraPicker) { self.parent = parent }
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) { parent.completion(info[.originalImage] as? UIImage); parent.dismiss() }
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { parent.completion(nil); parent.dismiss() }
    }
}

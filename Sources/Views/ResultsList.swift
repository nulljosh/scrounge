import MapKit
import SwiftUI

/// The results column. Both shells wrap this; only the chrome around it differs.
struct ResultsList: View {
    @ObservedObject var model: SearchModel
    @Binding var selection: Listing?
    var savedOnly: [Listing]?
    /// The macOS shell drives its detail column from the selection. In iPhone's plain
    /// NavigationStack a List selection binding swallows the tap, so rows never navigate.
    var usesSelection = true
    @EnvironmentObject private var favorites: Favorites
    @State private var showMap = false

    private var listings: [Listing] { savedOnly ?? model.listings }

    var body: some View {
        Group {
            if showMap && savedOnly == nil {
                mapView
            } else if usesSelection {
                List(selection: $selection) { rows }
            } else {
                List { rows }
            }
        }
        .overlay { statusOverlay }
        .safeAreaInset(edge: .top) { if savedOnly == nil { categoryChips } }
        .toolbar {
            if savedOnly == nil {
                ToolbarItem {
                    Toggle(isOn: $showMap) { Label("Map", systemImage: "map") }.toggleStyle(.button)
                }
            }
        }
    }

    private var pins: [(listing: Listing, at: CLLocationCoordinate2D)] {
        listings.compactMap { l in
            guard let lat = l.lat, let lon = l.lon else { return nil }
            return (l, CLLocationCoordinate2D(latitude: lat, longitude: lon))
        }
    }

    /// Selecting a pin opens the listing the same way a row does (detail column on Mac, push on iPhone).
    private var mapView: some View {
        Map {
            ForEach(pins, id: \.listing.id) { pin in
                Annotation(pin.listing.priceString ?? "", coordinate: pin.at) {
                    Button { selection = pin.listing } label: {
                        Circle().fill(.tint).frame(width: 18, height: 18)
                            .overlay(Circle().stroke(.white, lineWidth: 3))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(pin.listing.title)
                }
            }
        }
    }

    private var categoryChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Category.all) { cat in
                    if model.filters.category == cat.id {
                        Button(cat.name) {}.buttonStyle(.borderedProminent)
                    } else {
                        Button(cat.name) {
                            model.filters.category = cat.id
                            Task { await model.run() }
                        }
                        .buttonStyle(.bordered)
                    }
                }
            }
            .buttonBorderShape(.capsule)
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
        .background(.bar)
    }

    @ViewBuilder private var rows: some View {
        if savedOnly == nil, !favorites.recent.isEmpty {
            Section("Recently viewed") { recentStrip }
        }
        ForEach(listings) { row($0) }
    }

    /// Buttons, not NavigationLinks: a link nested in a List row takes over the whole row.
    private var recentStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(favorites.recent) { listing in
                    Button { selection = listing } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            AsyncImage(url: listing.thumbURL) { $0.resizable().aspectRatio(contentMode: .fill) }
                                placeholder: { Rectangle().fill(.quaternary) }
                                .frame(width: 112, height: 84)
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            Text(listing.priceString ?? "—").font(.subheadline.weight(.semibold))
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func row(_ listing: Listing) -> some View {
        NavigationLink(value: listing) { ListingRow(listing: listing) }
    }

    @ViewBuilder private var statusOverlay: some View {
        if model.isLoading {
            ProgressView()
        } else if listings.isEmpty {
            if savedOnly != nil {
                ContentUnavailableView("Nothing saved yet", systemImage: "star",
                                       description: Text("Tap the star on a listing to keep it here."))
            } else {
                ContentUnavailableView(model.message ?? "Search to begin.",
                                       systemImage: "magnifyingglass")
            }
        }
    }
}

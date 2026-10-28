import Foundation

/// Saved and recently viewed listings, stored whole so neither needs the network.
@MainActor
final class Favorites: ObservableObject {
    private static let key = "curbside.favorites"
    private static let recentKey = "scrounger.recent"
    @Published private(set) var items: [Listing] = []
    @Published private(set) var recent: [Listing] = []

    init() {
        items = Self.load(Self.key)
        recent = Self.load(Self.recentKey)
    }

    private static func load(_ key: String) -> [Listing] {
        guard let data = UserDefaults.standard.data(forKey: key) else { return [] }
        return (try? JSONDecoder().decode([Listing].self, from: data)) ?? []
    }

    private static func store(_ list: [Listing], _ key: String) {
        if let data = try? JSONEncoder().encode(list) { UserDefaults.standard.set(data, forKey: key) }
    }

    func viewed(_ listing: Listing) {
        recent.removeAll { $0.id == listing.id }
        recent = Array(([listing] + recent).prefix(12))
        Self.store(recent, Self.recentKey)
    }

    func contains(_ listing: Listing) -> Bool { items.contains { $0.id == listing.id } }

    func toggle(_ listing: Listing) {
        if let i = items.firstIndex(where: { $0.id == listing.id }) {
            items.remove(at: i)
        } else {
            items.insert(listing, at: 0)
        }
        Self.store(items, Self.key)
    }
}

/// Drives one search. Shared by both platform shells.
@MainActor
final class SearchModel: ObservableObject {
    @Published var filters = SearchFilters()
    @Published private(set) var listings: [Listing] = []
    @Published private(set) var total = 0
    @Published private(set) var isLoading = false
    @Published private(set) var message: String?

    private let api: CraigslistAPI

    init(api: CraigslistAPI = CraigslistAPI()) { self.api = api }

    func run() async {
        isLoading = true
        message = nil
        defer { isLoading = false }
        do {
            let results = filters.sort == "deal" ? try await api.searchDeals(filters) : try await api.search(filters)
            listings = results.listings
            total = results.total
            message = results.listings.isEmpty ? "No results." : nil
        } catch {
            listings = []
            total = 0
            message = error.localizedDescription
        }
    }
}

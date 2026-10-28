import Foundation

/// A search kept for later, with the newest post it showed so a quiet check can count new ones.
struct SavedSearch: Codable, Identifiable {
    var filters: SearchFilters
    var newest: Date
    var fresh = 0
    var id: SearchFilters { filters }
}

/// Saved listings, saved searches and recently viewed listings, stored whole so none need the network.
@MainActor
final class Favorites: ObservableObject {
    private static let key = "curbside.favorites"
    private static let recentKey = "scrounger.recent"
    private static let searchesKey = "scrounger.searches"
    @Published private(set) var items: [Listing] = []
    @Published private(set) var recent: [Listing] = []
    @Published private(set) var searches: [SavedSearch] = []

    init() {
        items = Self.load(Self.key)
        recent = Self.load(Self.recentKey)
        searches = Self.load(Self.searchesKey)
    }

    private static func load<T: Decodable>(_ key: String) -> [T] {
        guard let data = UserDefaults.standard.data(forKey: key) else { return [] }
        return (try? JSONDecoder().decode([T].self, from: data)) ?? []
    }

    private static func store<T: Encodable>(_ list: [T], _ key: String) {
        if let data = try? JSONEncoder().encode(list) { UserDefaults.standard.set(data, forKey: key) }
    }

    // MARK: Saved searches (same rules as the web: five at most, counts checked quietly)

    func isSaved(_ f: SearchFilters) -> Bool { searches.contains { $0.filters == f } }

    /// Saving the search on screen, or forgetting it if it is already saved.
    func toggleSearch(_ f: SearchFilters, newest: Date) {
        if let i = searches.firstIndex(where: { $0.filters == f }) {
            searches.remove(at: i)
        } else {
            searches = Array(([SavedSearch(filters: f, newest: newest)] + searches).prefix(5))
        }
        Self.store(searches, Self.searchesKey)
    }

    /// The search just ran, so everything in it has been seen.
    func seen(_ f: SearchFilters, newest: Date) {
        guard let i = searches.firstIndex(where: { $0.filters == f }) else { return }
        searches[i].newest = max(searches[i].newest, newest)
        searches[i].fresh = 0
        Self.store(searches, Self.searchesKey)
    }

    func countNew(api: CraigslistAPI) async {
        for s in searches {
            var f = s.filters
            f.sort = "date"
            guard let results = try? await api.search(f) else { continue } // offline: keep the last count
            let fresh = results.listings.filter { $0.postedDate > s.newest }.count
            if let i = searches.firstIndex(where: { $0.filters == s.filters }) { searches[i].fresh = fresh }
        }
        Self.store(searches, Self.searchesKey)
    }

    // MARK: Saved listings

    /// Re-read each saved post's live price. A drop keeps the higher saved price as `was`;
    /// a posting that no longer answers is marked gone. ponytail: first 30 only, one at a time.
    func recheck(api: CraigslistAPI) async {
        for listing in items.prefix(30) {
            var l = listing
            do {
                let d = try await api.detail(uuid: l.uuid)
                if let p = d.price, p != l.price {
                    if let old = l.price, p < old { l.was = max(l.was ?? 0, old) }
                    l.price = p
                    l.priceString = d.priceString
                }
                l.gone = nil
            } catch CraigslistAPI.Failure.upstream {
                l.gone = true
            } catch {
                continue // offline: try again next time
            }
            if let i = items.firstIndex(where: { $0.id == l.id }) { items[i] = l }
        }
        Self.store(items, Self.key)
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

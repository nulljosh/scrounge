import Foundation

struct Listing: Identifiable, Hashable, Codable {
    let id: Int
    let uuid: String
    let title: String
    let slug: String?
    var price: Int?
    var priceString: String?
    let postedDate: Date
    let location: String?
    let lat: Double?
    let lon: Double?
    let images: [String]
    var dealReason: String? = nil
    /// Saved items only: the higher price it was saved at, once the live price drops.
    var was: Int? = nil
    /// Saved items only: the seller took the post down.
    var gone: Bool? = nil

    var thumbURL: URL? { images.first.flatMap { URL(string: $0 + "_300x300.jpg") } }
    var imageURLs: [URL] { images.compactMap { URL(string: $0 + "_600x450.jpg") } }
    var url: URL? {
        guard let slug else { return nil }
        return URL(string: "https://www.craigslist.org/view/d/\(slug)/\(uuid)")
    }
}

struct PostingDetail {
    let title: String
    let body: String
    let priceString: String?
    let location: String?
    let attributes: [(label: String, value: String)]
    let images: [URL]
    let url: URL?
    var price: Int? = nil
}

struct Category: Identifiable, Hashable {
    let id: String
    let name: String

    // Craigslist keeps these in its JS bundle, not in any document, but the
    // abbreviations have been stable for two decades. Each one verified live.
    static let all: [Category] = [
        .init(id: "sss", name: "For sale"),
        .init(id: "cta", name: "Cars & trucks"),
        .init(id: "hhh", name: "Housing"),
        .init(id: "apa", name: "Apartments"),
        .init(id: "jjj", name: "Jobs"),
        .init(id: "ggg", name: "Gigs"),
        .init(id: "ccc", name: "Community"),
        .init(id: "rrr", name: "Resumes"),
    ]
}

struct SearchFilters: Hashable, Codable {
    var query = ""
    var category = "sss"
    var city = "vancouver"
    var minPrice = ""
    var maxPrice = ""
    var postal = ""
    var distance = ""
    var hasPhoto = false
    var sort = "deal"

    /// What a saved search is called: the query, or the category, and the city.
    var label: String {
        let what = query.isEmpty ? (Category.all.first { $0.id == category }?.name ?? "Listings") : query
        return "\(what) in \(city)"
    }

    static let sorts = [("deal", "Best deals"), ("rel", "Best match"), ("date", "Newest"),
                        ("priceasc", "Price: low to high"), ("pricedsc", "Price: high to low")]
}

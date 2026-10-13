// Offline Apple Vision verification of generated QR destinations.
import Foundation
import Vision
import ImageIO

guard CommandLine.arguments.count == 2 else { fatalError("launch_directory_required") }
let directory = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let linksData = try Data(contentsOf: directory.appendingPathComponent("links.json"))
let links = try JSONSerialization.jsonObject(with: linksData) as! [String: [String: String]]
var results: [[String: String]] = []
for audience in ["seller", "buyer"] {
    let file = "\(audience)-qr.png"
    let request = VNDetectBarcodesRequest()
    request.symbologies = [.qr]
    let handler = VNImageRequestHandler(url: directory.appendingPathComponent(file))
    try handler.perform([request])
    let decoded = request.results?.compactMap { $0.payloadStringValue } ?? []
    guard decoded.count == 1, decoded[0] == links[audience]?["qr"] else { fatalError("qr_destination_mismatch") }
    results.append(["file": file, "decoded": decoded[0], "result": "PASS"])
}
let output = try JSONSerialization.data(withJSONObject: results, options: [.prettyPrinted, .sortedKeys])
print(String(data: output, encoding: .utf8)!)

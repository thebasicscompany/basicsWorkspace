import Cocoa
import ApplicationServices

guard CommandLine.arguments.count >= 3,
      let x = Float(CommandLine.arguments[1]),
      let y = Float(CommandLine.arguments[2]) else {
    print("null")
    exit(0)
}

let systemWide = AXUIElementCreateSystemWide()
var element: AXUIElement?
let err = AXUIElementCopyElementAtPosition(systemWide, Float(x), Float(y), &element)

guard err == .success, let el = element else {
    print("null")
    exit(0)
}

func attr(_ el: AXUIElement, _ key: String) -> String? {
    var value: AnyObject?
    let res = AXUIElementCopyAttributeValue(el, key as CFString, &value)
    guard res == .success else { return nil }
    return value as? String
}

let role = attr(el, kAXRoleAttribute) ?? "Unknown"
let name = attr(el, kAXTitleAttribute) ?? attr(el, kAXDescriptionAttribute) ?? ""
let value = attr(el, kAXValueAttribute) ?? ""

var bx = 0, by = 0, bw = 0, bh = 0

var posValue: AnyObject?
var sizeValue: AnyObject?
if AXUIElementCopyAttributeValue(el, kAXPositionAttribute as CFString, &posValue) == .success,
   AXUIElementCopyAttributeValue(el, kAXSizeAttribute as CFString, &sizeValue) == .success {
    var point = CGPoint.zero
    var size = CGSize.zero
    AXValueGetValue(posValue as! AXValue, .cgPoint, &point)
    AXValueGetValue(sizeValue as! AXValue, .cgSize, &size)
    bx = Int(point.x)
    by = Int(point.y)
    bw = Int(size.width)
    bh = Int(size.height)
}

// Manual JSON to avoid Foundation serialization overhead
let json = """
{"role":"\(role)","name":"\(name.replacingOccurrences(of: "\"", with: "\\\""))","value":"\(value.replacingOccurrences(of: "\"", with: "\\\""))","bounds":{"x":\(bx),"y":\(by),"width":\(bw),"height":\(bh)}}
"""
print(json)

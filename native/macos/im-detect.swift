import Cocoa
import Carbon

func getCurrentInputSourceID() -> String {
    guard let source = TISCopyCurrentKeyboardInputSource()?.takeRetainedValue(),
          let ptr = TISGetInputSourceProperty(source, kTISPropertyInputSourceID) else {
        return "unknown"
    }
    return Unmanaged<CFString>.fromOpaque(ptr).takeUnretainedValue() as String
}

func printCurrentInputSource() {
    let sourceID = getCurrentInputSourceID()
    print(sourceID)
    fflush(stdout)
}

// Print initial state
printCurrentInputSource()

// Watch for input source changes
DistributedNotificationCenter.default().addObserver(
    forName: NSNotification.Name("AppleSelectedInputSourcesChangedNotification"),
    object: nil,
    queue: .main
) { _ in
    // Print immediately on notification for zero-lag detection
    DispatchQueue.main.async {
        printCurrentInputSource()
    }
}

RunLoop.main.run()

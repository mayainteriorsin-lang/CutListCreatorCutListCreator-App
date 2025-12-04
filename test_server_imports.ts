
console.log("Testing server imports...");

try {
    console.log("Importing ./server/vite...");
    await import("./server/vite");
    console.log("✅ ./server/vite imported successfully");
} catch (e) {
    console.error("❌ Failed to import ./server/vite:", e);
}

try {
    console.log("Importing ./server/routes...");
    await import("./server/routes");
    console.log("✅ ./server/routes imported successfully");
} catch (e) {
    console.error("❌ Failed to import ./server/routes:", e);
}

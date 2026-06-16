async function main() {
    try {
        const response = await fetch("http://127.0.0.1:3001/admin/prices", {
            headers: {
                "X-Dev-Admin-Bypass": "true"
            }
        });
        const text = await response.text();
        console.log("STATUS:", response.status);
        console.log("BODY:", text);
    } catch (e) {
        console.error("Fetch error:", e);
    }
}
main();

async function main() {
    try {
        const response = await fetch("https://api.docton.com.br/api/admin/prices", {
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

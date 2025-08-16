async function clearPage() {
    try {
        // Appel du backend pour vider la page
        let res = await fetch("http://localhost:8000/clear-page");
        let data = await res.json();
        console.log(data);

        // Rafraîchir l'iframe après avoir vidé la page
        const iframe = document.getElementById("myIframe");
        iframe.src = iframe.src;  // recharge l’iframe
    } catch (err) {
        console.error("Erreur:", err);
    }
}
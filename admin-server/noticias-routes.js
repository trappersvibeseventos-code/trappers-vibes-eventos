const fs = require("fs");
const path = require("path");

const NOTICIAS_FILE = path.join(__dirname, "data", "noticias.json");

function lerNoticias() {
    const dados = JSON.parse(fs.readFileSync(NOTICIAS_FILE, "utf8"));
    return dados.noticias || [];
}

function guardarNoticias(noticias) {
    fs.writeFileSync(NOTICIAS_FILE, JSON.stringify({ noticias }, null, 2));
}

module.exports = function(app) {
    app.get("/noticias", (req, res) => {
        try { res.json(lerNoticias()); }
        catch (erro) { res.status(500).json({ erro: "Erro ao ler noticias." }); }
    });

    app.post("/noticias", (req, res) => {
        try {
            const noticias = lerNoticias();
            const nova = { id: Date.now().toString(), titulo: req.body.titulo || "", descricao: req.body.descricao || "", imagem: req.body.imagem || "", data: req.body.data || new Date().toISOString() };
            noticias.push(nova);
            guardarNoticias(noticias);
            res.json(nova);
        } catch (erro) { res.status(500).json({ erro: "Erro ao criar noticia." }); }
    });

    app.put("/noticias/:id", (req, res) => {
        try {
            const noticias = lerNoticias();
            const indice = noticias.findIndex(n => String(n.id) === String(req.params.id));
            if (indice === -1) return res.status(404).json({ erro: "Noticia nao encontrada." });
            noticias[indice] = { ...noticias[indice], ...req.body, id: noticias[indice].id };
            guardarNoticias(noticias);
            res.json(noticias[indice]);
        } catch (erro) { res.status(500).json({ erro: "Erro ao editar noticia." }); }
    });

    app.delete("/noticias/:id", (req, res) => {
        try {
            const noticias = lerNoticias();
            const novas = noticias.filter(n => String(n.id) !== String(req.params.id));
            guardarNoticias(novas);
            res.json({ sucesso: true });
        } catch (erro) { res.status(500).json({ erro: "Erro ao apagar noticia." }); }
    });
};

const fs = require("fs");
const path = require("path");

const EVENTOS_FILE = path.join(__dirname, "data", "eventos.json");

function lerEventos() {
    const dados = JSON.parse(fs.readFileSync(EVENTOS_FILE, "utf8"));
    return dados.eventos || [];
}

function guardarEventos(eventos) {
    fs.writeFileSync(
        EVENTOS_FILE,
        JSON.stringify({ eventos }, null, 2)
    );
}

module.exports = function(app) {

    // Listar eventos
    app.get("/eventos", (req, res) => {
        try {
            res.json(lerEventos());
        } catch (erro) {
            res.status(500).json({
                erro: "Erro ao ler eventos."
            });
        }
    });

    // Criar evento
    app.post("/eventos", (req, res) => {
        try {
            const eventos = lerEventos();

            const novo = {
                id: Date.now().toString(),
                titulo: req.body.titulo || "",
                descricao: req.body.descricao || "",
                local: req.body.local || "",
                data: req.body.data || "",
                hora: req.body.hora || "",
                imagem: req.body.imagem || ""
            };

            eventos.push(novo);
            guardarEventos(eventos);

            res.json(novo);

        } catch (erro) {
            res.status(500).json({
                erro: "Erro ao criar evento."
            });
        }
    });

    // Editar evento
    app.put("/eventos/:id", (req, res) => {
        try {
            const eventos = lerEventos();

            const indice = eventos.findIndex(
                e => String(e.id) === String(req.params.id)
            );

            if (indice === -1) {
                return res.status(404).json({
                    erro: "Evento nao encontrado."
                });
            }

            eventos[indice] = {
                ...eventos[indice],
                ...req.body,
                id: eventos[indice].id
            };

            guardarEventos(eventos);

            res.json(eventos[indice]);

        } catch (erro) {
            res.status(500).json({
                erro: "Erro ao editar evento."
            });
        }
    });

    // Apagar evento
    app.delete("/eventos/:id", (req, res) => {
        try {
            const eventos = lerEventos();

            const novos = eventos.filter(
                e => String(e.id) !== String(req.params.id)
            );

            guardarEventos(novos);

            res.json({
                sucesso: true
            });

        } catch (erro) {
            res.status(500).json({
                erro: "Erro ao apagar evento."
            });
        }
    });

};

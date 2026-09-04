const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const router = express.Router();
router.use(cors());

const DATA_DIR = path.join(__dirname, "data", "distribuicao");
const PEDIDOS_FILE = path.join(DATA_DIR, "pedidos.json");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function lerPedidos() {
    try {
        if (!fs.existsSync(PEDIDOS_FILE)) {
            fs.writeFileSync(
                PEDIDOS_FILE,
                JSON.stringify({ pedidos: [] }, null, 2)
            );
        }

        return JSON.parse(fs.readFileSync(PEDIDOS_FILE, "utf8"));
    } catch (erro) {
        console.error("Erro ao ler pedidos:", erro);
        return { pedidos: [] };
    }
}

function guardarPedidos(dados) {
    fs.writeFileSync(
        PEDIDOS_FILE,
        JSON.stringify(dados, null, 2)
    );
}

function gerarCodigo() {
    const agora = new Date();

    const data =
        agora.getFullYear().toString().slice(-2) +
        String(agora.getMonth() + 1).padStart(2, "0") +
        String(agora.getDate()).padStart(2, "0");

    const aleatorio = Math.random()
        .toString(36)
        .substring(2, 7)
        .toUpperCase();

    return `TVD-${data}-${aleatorio}`;
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },

    filename: function (req, file, cb) {
        const extensao = path.extname(file.originalname).toLowerCase();

        const nomeSeguro =
            Date.now() +
            "-" +
            Math.random().toString(36).substring(2, 8) +
            extensao;

        cb(null, nomeSeguro);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024
    }
});

/*
 * MÉTODOS DE PAGAMENTO
 * Estes dados vêm exclusivamente do .env
 */
router.get("/pagamento", (req, res) => {
    res.json({
        sucesso: true,
        pagamentos: {
            iban: process.env.IBAN || "",
            conta: process.env.NUMERO_CONTA || "",
            express: process.env.EXPRESS || "",
            unitelMoney: process.env.UNITEL_MONEY || ""
        }
    });
});

/*
 * CRIAR PEDIDO DE DISTRIBUIÇÃO
 */
router.post(
    "/pedidos",
    upload.fields([
        { name: "audio", maxCount: 1 },
        { name: "capa", maxCount: 1 },
        { name: "comprovativo", maxCount: 1 }
    ]),
    (req, res) => {
        try {
            const dados = lerPedidos();

            const artista = (req.body.artista || "").trim();
            const musica = (req.body.musica || "").trim();
            const genero = (req.body.genero || "").trim();
            const dataLancamento = (req.body.dataLancamento || "").trim();
            const plano = (req.body.plano || "").trim();

            if (!artista || !musica || !genero || !plano) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Preencha todos os campos obrigatórios."
                });
            }

            const planos = {
                basico: 5000,
                profissional: 10000,
                premium: 15000
            };

            if (!Object.prototype.hasOwnProperty.call(planos, plano)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Plano de distribuição inválido."
                });
            }

            const codigo = gerarCodigo();

            const pedido = {
                codigo,
                artista,
                musica,
                genero,
                dataLancamento,
                plano,
                valor: planos[plano],
                estado: "Aguardando confirmação do pagamento",
                progresso: 10,
                audio: req.files?.audio?.[0]?.filename || "",
                capa: req.files?.capa?.[0]?.filename || "",
                comprovativo: req.files?.comprovativo?.[0]?.filename || "",
                dataPedido: new Date().toISOString(),
                ultimaAtualizacao: new Date().toISOString()
            };

            dados.pedidos.push(pedido);
            guardarPedidos(dados);

            res.status(201).json({
                sucesso: true,
                mensagem: "Pedido de distribuição recebido com sucesso.",
                pedido: {
                    codigo: pedido.codigo,
                    estado: pedido.estado,
                    progresso: pedido.progresso,
                    valor: pedido.valor
                }
            });

        } catch (erro) {
            console.error("Erro ao criar pedido:", erro);

            res.status(500).json({
                sucesso: false,
                mensagem: "Erro interno ao criar o pedido."
            });
        }
    }
);

/*
 * CONSULTAR PEDIDO PELO CÓDIGO
 */

router.get("/pedidos", (req, res) => {
    try {
        const dados = lerPedidos();

        res.json({
            sucesso: true,
            pedidos: dados.pedidos || []
        });

    } catch (erro) {
        console.error("Erro ao listar pedidos:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao listar pedidos."
        });
    }
});

// ===============================
// ATUALIZAR ESTADO E PROGRESSO — ADMIN
// ===============================

router.put("/admin/pedidos/:codigo", (req, res) => {
    try {
        const senhaRecebida = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
        const senhaAdmin = process.env.ADMIN_PASSWORD || "";

        if (!senhaAdmin || senhaRecebida !== senhaAdmin) {
            return res.status(401).json({
                sucesso: false,
                mensagem: "Não autorizado."
            });
        }

        const estadosPermitidos = [
            "Aguardando confirmação do pagamento",
            "Pagamento confirmado",
            "Em análise",
            "Aprovado",
            "Em distribuição",
            "Distribuído",
            "Pagamento não confirmado",
            "Rejeitado"
        ];

        const codigo = req.params.codigo.toUpperCase();
        const novoEstado = req.body.estado;
        const progresso = Number(req.body.progresso);

        if (!estadosPermitidos.includes(novoEstado)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Estado inválido."
            });
        }

        if (!Number.isInteger(progresso) || progresso < 0 || progresso > 100) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Progresso deve ser um número inteiro entre 0 e 100."
            });
        }

        const dados = lerPedidos();

        const pedido = dados.pedidos.find(
            item => item.codigo.toUpperCase() === codigo
        );

        if (!pedido) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Pedido não encontrado."
            });
        }

        pedido.estado = novoEstado;
        pedido.progresso = progresso;
        pedido.ultimaAtualizacao = new Date().toISOString();

        guardarPedidos(dados);

        res.json({
            sucesso: true,
            mensagem: "Pedido atualizado com sucesso.",
            pedido: {
                codigo: pedido.codigo,
                estado: pedido.estado,
                progresso: pedido.progresso,
                ultimaAtualizacao: pedido.ultimaAtualizacao
            }
        });

    } catch (erro) {
        console.error("Erro ao atualizar pedido:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno ao atualizar o pedido."
        });
    }
});

// ===============================
// ARQUIVOS PRIVADOS — ADMIN
// ===============================

router.get("/admin/arquivo/:tipo/:filename", (req, res) => {
    try {
        const senhaRecebida = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
        const senhaAdmin = process.env.ADMIN_PASSWORD || "";

        if (!senhaAdmin || senhaRecebida !== senhaAdmin) {
            return res.status(401).json({
                sucesso: false,
                mensagem: "Não autorizado."
            });
        }

        const tiposPermitidos = {
            audio: "audio",
            capa: "capa",
            comprovativo: "comprovativo"
        };

        const tipo = tiposPermitidos[req.params.tipo];

        if (!tipo) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Tipo de arquivo inválido."
            });
        }

        const filename = path.basename(req.params.filename);
        const arquivo = path.resolve(UPLOADS_DIR, filename);
        const pastaUploads = path.resolve(UPLOADS_DIR);

        if (!arquivo.startsWith(pastaUploads + path.sep)) {
            return res.status(403).json({
                sucesso: false,
                mensagem: "Acesso negado."
            });
        }

        if (!fs.existsSync(arquivo)) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Arquivo não encontrado."
            });
        }

        res.sendFile(arquivo);

    } catch (erro) {
        console.error("Erro ao abrir arquivo:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao abrir arquivo."
        });
    }
});

router.get("/pedidos/:codigo", (req, res) => {
    try {
        const dados = lerPedidos();

        const codigo = req.params.codigo.toUpperCase();

        const pedido = dados.pedidos.find(
            item => item.codigo.toUpperCase() === codigo
        );

        if (!pedido) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Pedido não encontrado."
            });
        }

        res.json({
            sucesso: true,
            pedido: {
                codigo: pedido.codigo,
                artista: pedido.artista,
                musica: pedido.musica,
                genero: pedido.genero,
                plano: pedido.plano,
                valor: pedido.valor,
                estado: pedido.estado,
                progresso: pedido.progresso,
                dataLancamento: pedido.dataLancamento,
                dataPedido: pedido.dataPedido,
                ultimaAtualizacao: pedido.ultimaAtualizacao
            }
        });

    } catch (erro) {
        console.error("Erro ao consultar pedido:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao consultar pedido."
        });
    }
});

module.exports = function (app) {
    app.use("/distribuicao", router);
};
